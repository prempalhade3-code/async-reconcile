import json
import uuid
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.entities import AuditEventModel, utc_now


def record_audit_event(
    db: Session,
    event_type: str,
    outcome: str,
    explanation: str,
    related_operation_id: Optional[str] = None,
    related_ticket_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> AuditEventModel:
    """
    Append-only audit event logging for all critical operations and ticket transitions.
    Guarantees immutable historical recording.
    """
    event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"

    # Get max sequence number to guarantee incrementing order
    max_seq = db.query(func.max(AuditEventModel.sequence_number)).scalar() or 0
    next_seq = max_seq + 1

    event = AuditEventModel(
        id=event_id,
        sequence_number=next_seq,
        event_type=event_type,
        related_operation_id=related_operation_id,
        related_ticket_id=related_ticket_id,
        outcome=outcome,
        explanation=explanation,
        metadata_json=json.dumps(metadata) if metadata else None,
        created_at=utc_now(),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
