import uuid
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.entities import OperationModel, AccountModel, TicketModel, utc_now
from app.schemas.entities import OperationCreate, OperationAdvanceRequest
from app.services.audit_service import record_audit_event


def create_operation(db: Session, op_in: OperationCreate) -> OperationModel:
    account = db.query(AccountModel).filter(AccountModel.id == op_in.target_account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "ACCOUNT_NOT_FOUND",
                "message": f"Target account '{op_in.target_account_id}' does not exist.",
                "resource_id": op_in.target_account_id,
            },
        )

    ticket = None
    if op_in.associated_ticket_id:
        ticket = db.query(TicketModel).filter(TicketModel.id == op_in.associated_ticket_id).first()
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "TICKET_NOT_FOUND",
                    "message": f"Associated ticket '{op_in.associated_ticket_id}' does not exist.",
                    "resource_id": op_in.associated_ticket_id,
                },
            )

    op_id = f"OP-{uuid.uuid4().hex[:8].upper()}"

    if op_in.mode == "instant":
        # Instant mode: synchronous execution
        if op_in.target_outcome == "failed":
            operation = OperationModel(
                id=op_id,
                operation_type=op_in.operation_type,
                target_account_id=op_in.target_account_id,
                associated_ticket_id=op_in.associated_ticket_id,
                status="failed",
                mode="instant",
                target_outcome="failed",
                step_index=1,
                status_checks_count=0,
                error_details="Instant execution failed by simulation specification.",
                completed_at=utc_now(),
            )
            db.add(operation)
            db.commit()
            db.refresh(operation)

            record_audit_event(
                db,
                event_type="operation_failed",
                outcome="failed",
                explanation=f"Instant operation {op_id} failed immediately upon invocation.",
                related_operation_id=op_id,
                related_ticket_id=op_in.associated_ticket_id,
            )
            return operation

        # Successful instant operation
        operation = OperationModel(
            id=op_id,
            operation_type=op_in.operation_type,
            target_account_id=op_in.target_account_id,
            associated_ticket_id=op_in.associated_ticket_id,
            status="completed",
            mode="instant",
            target_outcome="completed",
            step_index=1,
            status_checks_count=0,
            completed_at=utc_now(),
        )
        # Apply actual state update to account
        if op_in.operation_type == "suspend_account":
            account.status = "suspended"
        elif op_in.operation_type == "reactivate_account":
            account.status = "active"

        if ticket:
            ticket.associated_operation_id = op_id

        db.add(operation)
        db.commit()
        db.refresh(operation)

        record_audit_event(
            db,
            event_type="operation_completed",
            outcome="success",
            explanation=f"Instant operation {op_id} executed synchronously. Account {account.id} status updated to '{account.status}'.",
            related_operation_id=op_id,
            related_ticket_id=op_in.associated_ticket_id,
        )
        return operation

    # AsyncReconcile Mode: initial state is PENDING
    operation = OperationModel(
        id=op_id,
        operation_type=op_in.operation_type,
        target_account_id=op_in.target_account_id,
        associated_ticket_id=op_in.associated_ticket_id,
        status="pending",
        mode="asyncreconcile",
        target_outcome=op_in.target_outcome,
        step_index=0,
        status_checks_count=0,
    )

    if ticket:
        ticket.associated_operation_id = op_id

    db.add(operation)
    db.commit()
    db.refresh(operation)

    record_audit_event(
        db,
        event_type="operation_created",
        outcome="info",
        explanation=f"AsyncReconcile operation {op_id} accepted with status 'pending'. Underlying account {account.id} remains '{account.status}'.",
        related_operation_id=op_id,
        related_ticket_id=op_in.associated_ticket_id,
        metadata={"target_outcome": op_in.target_outcome},
    )
    return operation


def advance_operation(
    db: Session,
    operation_id: str,
    advance_req: Optional[OperationAdvanceRequest] = None,
) -> OperationModel:
    operation = db.query(OperationModel).filter(OperationModel.id == operation_id).first()
    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "OPERATION_NOT_FOUND",
                "message": f"Operation '{operation_id}' not found.",
                "resource_id": operation_id,
            },
        )

    if operation.status in ("completed", "failed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "TERMINAL_OPERATION_STATE",
                "message": f"Operation '{operation_id}' is already in terminal state '{operation.status}'. Cannot advance further.",
                "resource_id": operation_id,
                "current_state": operation.status,
            },
        )

    account = db.query(AccountModel).filter(AccountModel.id == operation.target_account_id).first()
    desired_outcome = (
        advance_req.force_outcome
        if (advance_req and advance_req.force_outcome)
        else operation.target_outcome
    )

    if operation.status == "pending":
        # Transition: pending -> running
        operation.status = "running"
        operation.step_index += 1
        operation.updated_at = utc_now()
        db.commit()
        db.refresh(operation)

        record_audit_event(
            db,
            event_type="operation_transitioned",
            outcome="info",
            explanation=f"Operation {operation.id} transitioned from 'pending' to 'running' (virtual step {operation.step_index}).",
            related_operation_id=operation.id,
            related_ticket_id=operation.associated_ticket_id,
        )
        return operation

    elif operation.status == "running":
        operation.step_index += 1
        operation.completed_at = utc_now()
        operation.updated_at = utc_now()

        if desired_outcome == "failed":
            # Transition: running -> failed
            operation.status = "failed"
            operation.error_details = (
                "Simulated directory service reconciliation failure: upstream identity provider rejected request."
            )
            db.commit()
            db.refresh(operation)

            record_audit_event(
                db,
                event_type="operation_failed",
                outcome="failed",
                explanation=f"Operation {operation.id} failed during execution. Error: {operation.error_details}",
                related_operation_id=operation.id,
                related_ticket_id=operation.associated_ticket_id,
            )
            return operation
        else:
            # Transition: running -> completed
            operation.status = "completed"
            if account:
                if operation.operation_type == "suspend_account":
                    account.status = "suspended"
                elif operation.operation_type == "reactivate_account":
                    account.status = "active"

            db.commit()
            db.refresh(operation)

            record_audit_event(
                db,
                event_type="operation_completed",
                outcome="success",
                explanation=f"Operation {operation.id} confirmed completed. Account {operation.target_account_id} status updated to '{account.status if account else 'unknown'}'.",
                related_operation_id=operation.id,
                related_ticket_id=operation.associated_ticket_id,
            )
            return operation

    return operation


def check_operation_status(db: Session, operation_id: str) -> dict:
    operation = db.query(OperationModel).filter(OperationModel.id == operation_id).first()
    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "OPERATION_NOT_FOUND",
                "message": f"Operation '{operation_id}' not found.",
                "resource_id": operation_id,
            },
        )

    # In Virtual-Step polling reconciliation:
    # A status check counts as a defensive polling query and tracks status_checks_count
    operation.status_checks_count += 1
    db.commit()
    db.refresh(operation)

    account = db.query(AccountModel).filter(AccountModel.id == operation.target_account_id).first()
    account_status = account.status if account else "unknown"

    record_audit_event(
        db,
        event_type="status_checked",
        outcome="info",
        explanation=f"Status checked for operation {operation.id}: status='{operation.status}', underlying account status='{account_status}' (check #{operation.status_checks_count}).",
        related_operation_id=operation.id,
        related_ticket_id=operation.associated_ticket_id,
    )

    return {
        "operation_id": operation.id,
        "status": operation.status,
        "operation_type": operation.operation_type,
        "target_account_id": operation.target_account_id,
        "associated_ticket_id": operation.associated_ticket_id,
        "mode": operation.mode,
        "step_index": operation.step_index,
        "status_checks_count": operation.status_checks_count,
        "completed": operation.status == "completed",
        "account_status": account_status,
        "error_details": operation.error_details,
    }
