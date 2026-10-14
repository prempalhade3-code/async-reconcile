from typing import Optional, Dict, Any, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.entities import TicketModel, OperationModel, AccountModel, utc_now
from app.schemas.entities import TicketResolveRequest, TicketResolutionCheck
from app.services.audit_service import record_audit_event


def evaluate_ticket_resolution_conditions(
    db: Session,
    ticket_id: str,
    provided_operation_id: Optional[str] = None,
) -> Tuple[bool, str, Dict[str, Any], Optional[OperationModel], Optional[AccountModel], Optional[TicketModel]]:
    ticket = db.query(TicketModel).filter(TicketModel.id == ticket_id).first()
    if not ticket:
        return False, f"Ticket '{ticket_id}' not found.", {}, None, None, None

    account = db.query(AccountModel).filter(AccountModel.id == ticket.target_account_id).first()
    if not account:
        return False, f"Target account '{ticket.target_account_id}' does not exist.", {}, None, None, ticket

    # Locate associated or provided operation
    op_id = provided_operation_id or ticket.associated_operation_id
    operation = None
    if op_id:
        operation = db.query(OperationModel).filter(OperationModel.id == op_id).first()

    # Detailed checklist
    checks: Dict[str, Any] = {
        "operation_exists": operation is not None,
        "operation_id": operation.id if operation else None,
        "operation_status": operation.status if operation else "missing",
        "operation_matches_account": False,
        "operation_completed": False,
        "account_state_verified": False,
        "current_account_status": account.status,
        "required_account_status": "suspended" if ticket.required_action == "suspend_account" else "active",
    }

    if not operation:
        reason = f"No operation found for ticket {ticket_id}. An explicit deprovisioning operation must be initiated and confirmed before resolving."
        return False, reason, checks, None, account, ticket

    # Condition 1 & 2: Operation targets the correct account
    if operation.target_account_id != ticket.target_account_id:
        checks["operation_matches_account"] = False
        reason = (
            f"Operation mismatch: Operation {operation.id} targets account '{operation.target_account_id}', "
            f"but ticket {ticket_id} requires action on account '{ticket.target_account_id}'."
        )
        return False, reason, checks, operation, account, ticket
    checks["operation_matches_account"] = True

    # Condition 3: Operation has completed successfully
    if operation.status == "pending":
        checks["operation_completed"] = False
        reason = (
            f"Premature closure attempt: Operation {operation.id} is still in 'pending' status. "
            f"Accepting an operation request does not mean it has finished. Verification required."
        )
        return False, reason, checks, operation, account, ticket

    if operation.status == "running":
        checks["operation_completed"] = False
        reason = (
            f"Premature closure attempt: Operation {operation.id} is currently 'running'. "
            f"Cannot resolve ticket until the operation transitions to 'completed'."
        )
        return False, reason, checks, operation, account, ticket

    if operation.status == "failed":
        checks["operation_completed"] = False
        reason = (
            f"Operation failed: Operation {operation.id} terminated with status 'failed'. "
            f"Ticket cannot be resolved with an unresolved failed operation."
        )
        return False, reason, checks, operation, account, ticket

    if operation.status != "completed":
        checks["operation_completed"] = False
        reason = f"Operation {operation.id} is in non-completed status '{operation.status}'."
        return False, reason, checks, operation, account, ticket

    checks["operation_completed"] = True

    # Condition 4: Target account's actual status matches the required state
    expected_status = "suspended" if ticket.required_action == "suspend_account" else "active"
    if account.status != expected_status:
        checks["account_state_verified"] = False
        reason = (
            f"Reconciliation state mismatch: Account {account.id} status is '{account.status}', "
            f"expected '{expected_status}'. Final system state verification failed."
        )
        return False, reason, checks, operation, account, ticket

    checks["account_state_verified"] = True
    return True, "All completion and reconciliation requirements verified successfully.", checks, operation, account, ticket


def check_ticket_resolvability(db: Session, ticket_id: str) -> TicketResolutionCheck:
    allowed, reason, checks, _, _, _ = evaluate_ticket_resolution_conditions(db, ticket_id)
    return TicketResolutionCheck(
        ticket_id=ticket_id,
        allowed=allowed,
        reason=reason,
        checks=checks,
    )


def resolve_ticket(
    db: Session,
    ticket_id: str,
    resolve_req: TicketResolveRequest,
) -> TicketModel:
    allowed, reason, checks, operation, account, ticket = evaluate_ticket_resolution_conditions(
        db, ticket_id, resolve_req.operation_id
    )

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "TICKET_NOT_FOUND",
                "message": f"Ticket '{ticket_id}' not found.",
                "resource_id": ticket_id,
            },
        )

    if ticket.status == "resolved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "TICKET_ALREADY_RESOLVED",
                "message": f"Ticket '{ticket_id}' is already resolved.",
                "resource_id": ticket_id,
                "current_state": ticket.status,
            },
        )

    if not allowed:
        # Determine exact error code based on which condition failed
        if not checks.get("operation_exists"):
            err_code = "OPERATION_MISSING"
        elif not checks.get("operation_matches_account"):
            err_code = "OPERATION_ACCOUNT_MISMATCH"
        elif checks.get("operation_status") in ("pending", "running"):
            err_code = "PREMATURE_TICKET_CLOSURE"
        elif checks.get("operation_status") == "failed":
            err_code = "OPERATION_FAILED"
        elif not checks.get("account_state_verified"):
            err_code = "ACCOUNT_STATE_MISMATCH"
        else:
            err_code = "RESOLVE_PRECONDITION_FAILED"

        # Record immutable audit event for rejection
        record_audit_event(
            db,
            event_type="premature_resolution_blocked" if err_code == "PREMATURE_TICKET_CLOSURE" else "resolution_rejected",
            outcome="rejected",
            explanation=f"Resolution attempt blocked on ticket {ticket_id}: {reason}",
            related_operation_id=checks.get("operation_id"),
            related_ticket_id=ticket_id,
            metadata={
                "error_code": err_code,
                "checks": checks,
            },
        )

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error_code": err_code,
                "message": reason,
                "resource_id": ticket_id,
                "current_state": ticket.status,
                "reconciliation_hint": "Wait for operation to reach 'completed' status and verify account state before closing ticket.",
                "checks": checks,
            },
        )

    # All preconditions verified: update ticket
    ticket.status = "resolved"
    ticket.completed_at = utc_now()
    ticket.resolution_notes = resolve_req.resolution_notes or "Verified operation completed and account state reconciled."
    if operation and not ticket.associated_operation_id:
        ticket.associated_operation_id = operation.id

    db.commit()
    db.refresh(ticket)

    record_audit_event(
        db,
        event_type="ticket_resolved",
        outcome="success",
        explanation=f"Ticket {ticket.id} successfully resolved. Verified account {account.id} is '{account.status}'.",
        related_operation_id=operation.id if operation else None,
        related_ticket_id=ticket.id,
        metadata={"checks": checks},
    )
    return ticket
