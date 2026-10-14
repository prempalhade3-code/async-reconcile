from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import OperationModel
from app.schemas.entities import (
    OperationCreate,
    OperationRead,
    OperationAdvanceRequest,
    OperationStatusResponse,
)
from app.services.operation_service import (
    create_operation,
    advance_operation,
    check_operation_status,
)

router = APIRouter(prefix="/operations", tags=["Operations"])


@router.get("", response_model=List[OperationRead])
def list_operations(
    status_filter: Optional[str] = Query(None, alias="status"),
    target_account_id: Optional[str] = Query(None, alias="account_id"),
    ticket_id: Optional[str] = Query(None, alias="ticket_id"),
    db: Session = Depends(get_db),
):
    query = db.query(OperationModel)
    if status_filter:
        query = query.filter(OperationModel.status == status_filter)
    if target_account_id:
        query = query.filter(OperationModel.target_account_id == target_account_id)
    if ticket_id:
        query = query.filter(OperationModel.associated_ticket_id == ticket_id)
    return query.order_by(OperationModel.created_at.desc()).all()


@router.get("/{operation_id}", response_model=OperationRead)
def get_operation(operation_id: str, db: Session = Depends(get_db)):
    operation = db.query(OperationModel).filter(OperationModel.id == operation_id).first()
    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "OPERATION_NOT_FOUND",
                "message": f"Operation '{operation_id}' was not found.",
                "resource_id": operation_id,
            },
        )
    return operation


@router.get("/{operation_id}/status", response_model=OperationStatusResponse)
def get_operation_status(operation_id: str, db: Session = Depends(get_db)):
    """
    Checks operation status and records defensive status polling audit event.
    Returns status alongside live underlying account state.
    """
    return check_operation_status(db, operation_id)


@router.post("", response_model=OperationRead, status_code=status.HTTP_201_CREATED)
def create_operation_endpoint(
    op_in: OperationCreate,
    db: Session = Depends(get_db),
):
    return create_operation(db, op_in)


@router.post("/{operation_id}/advance", response_model=OperationRead)
def advance_operation_endpoint(
    operation_id: str,
    advance_req: Optional[OperationAdvanceRequest] = None,
    db: Session = Depends(get_db),
):
    """
    Deterministically advances operation state through the state machine:
    pending -> running -> completed (or failed).
    """
    return advance_operation(db, operation_id, advance_req)
