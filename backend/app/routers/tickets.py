import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import TicketModel, AccountModel, utc_now
from app.schemas.entities import (
    TicketRead,
    TicketCreate,
    TicketResolveRequest,
    TicketResolutionCheck,
)
from app.services.ticket_service import (
    resolve_ticket,
    check_ticket_resolvability,
)

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.get("", response_model=List[TicketRead])
def list_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    db: Session = Depends(get_db),
):
    query = db.query(TicketModel)
    if status_filter:
        query = query.filter(TicketModel.status == status_filter)
    if priority_filter:
        query = query.filter(TicketModel.priority == priority_filter)
    return query.order_by(TicketModel.created_at.desc()).all()


@router.get("/{ticket_id}", response_model=TicketRead)
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(TicketModel).filter(TicketModel.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "TICKET_NOT_FOUND",
                "message": f"Ticket '{ticket_id}' was not found.",
                "resource_id": ticket_id,
            },
        )
    return ticket


@router.get("/{ticket_id}/resolvability", response_model=TicketResolutionCheck)
def check_resolvability(ticket_id: str, db: Session = Depends(get_db)):
    """
    Detailed pre-flight inspection of ticket completion verification requirements.
    Provides reasons if resolution is blocked.
    """
    return check_ticket_resolvability(db, ticket_id)


@router.post("/{ticket_id}/resolve", response_model=TicketRead)
def resolve_ticket_endpoint(
    ticket_id: str,
    resolve_req: TicketResolveRequest,
    db: Session = Depends(get_db),
):
    """
    Resolves a ticket if and only if:
    1. Associated operation exists
    2. Operation matches ticket's target account
    3. Operation status is 'completed'
    4. Target employee account's actual status matches the required state ('suspended')
    Otherwise strictly returns HTTP 409 Conflict.
    """
    return resolve_ticket(db, ticket_id, resolve_req)


@router.post("", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
def create_ticket(ticket_in: TicketCreate, db: Session = Depends(get_db)):
    account = db.query(AccountModel).filter(AccountModel.id == ticket_in.target_account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "ACCOUNT_NOT_FOUND",
                "message": f"Target account '{ticket_in.target_account_id}' does not exist.",
                "resource_id": ticket_in.target_account_id,
            },
        )

    tck_id = ticket_in.id or f"TCK-{uuid.uuid4().hex[:6].upper()}"
    ticket = TicketModel(
        id=tck_id,
        title=ticket_in.title,
        description=ticket_in.description,
        target_account_id=ticket_in.target_account_id,
        priority=ticket_in.priority,
        status=ticket_in.status,
        required_action=ticket_in.required_action,
        associated_operation_id=ticket_in.associated_operation_id,
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket
