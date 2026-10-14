from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import AuditEventModel
from app.schemas.entities import AuditEventRead

router = APIRouter(prefix="/events", tags=["Audit Events"])


@router.get("", response_model=List[AuditEventRead])
def list_events(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    outcome: Optional[str] = Query(None, description="Filter by outcome (success, warning, rejected, failed, info)"),
    operation_id: Optional[str] = Query(None, description="Filter by related operation ID"),
    ticket_id: Optional[str] = Query(None, description="Filter by related ticket ID"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    sort_order: str = Query("desc", description="'asc' or 'desc'"),
    db: Session = Depends(get_db),
):
    query = db.query(AuditEventModel)

    if event_type:
        query = query.filter(AuditEventModel.event_type == event_type)
    if outcome:
        query = query.filter(AuditEventModel.outcome == outcome)
    if operation_id:
        query = query.filter(AuditEventModel.related_operation_id == operation_id)
    if ticket_id:
        query = query.filter(AuditEventModel.related_ticket_id == ticket_id)

    if sort_order == "asc":
        query = query.order_by(AuditEventModel.created_at.asc(), AuditEventModel.sequence_number.asc())
    else:
        query = query.order_by(AuditEventModel.created_at.desc(), AuditEventModel.sequence_number.desc())

    return query.offset(offset).limit(limit).all()
