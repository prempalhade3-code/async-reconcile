from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AccountModel(Base):
    __tablename__ = "accounts"

    id = Column(String(64), primary_key=True, index=True)
    employee_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    email = Column(String(128), unique=True, nullable=False)
    department = Column(String(128), nullable=False)
    role = Column(String(128), nullable=False)
    status = Column(String(32), nullable=False, default="active")  # 'active' | 'suspended'
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    tickets = relationship("TicketModel", back_populates="account")
    operations = relationship("OperationModel", back_populates="account")


class TicketModel(Base):
    __tablename__ = "tickets"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=False)
    target_account_id = Column(String(64), ForeignKey("accounts.id"), nullable=False, index=True)
    priority = Column(String(32), nullable=False, default="medium")  # 'low' | 'medium' | 'high' | 'critical'
    status = Column(String(32), nullable=False, default="open")  # 'open' | 'in_progress' | 'resolved' | 'failed'
    required_action = Column(String(64), nullable=False, default="suspend_account")
    associated_operation_id = Column(String(64), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    account = relationship("AccountModel", back_populates="tickets")
    operations = relationship("OperationModel", back_populates="ticket")


class OperationModel(Base):
    __tablename__ = "operations"

    id = Column(String(64), primary_key=True, index=True)
    operation_type = Column(String(64), nullable=False)  # 'suspend_account' | 'reactivate_account'
    target_account_id = Column(String(64), ForeignKey("accounts.id"), nullable=False, index=True)
    associated_ticket_id = Column(String(64), ForeignKey("tickets.id"), nullable=True, index=True)
    status = Column(String(32), nullable=False, default="pending")  # 'pending' | 'running' | 'completed' | 'failed'
    mode = Column(String(32), nullable=False, default="asyncreconcile")  # 'instant' | 'asyncreconcile'
    target_outcome = Column(String(32), nullable=False, default="completed")  # 'completed' | 'failed'
    status_checks_count = Column(Integer, default=0, nullable=False)
    step_index = Column(Integer, default=0, nullable=False)
    error_details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    account = relationship("AccountModel", back_populates="operations")
    ticket = relationship("TicketModel", back_populates="operations")


class AuditEventModel(Base):
    __tablename__ = "audit_events"

    id = Column(String(64), primary_key=True, index=True)
    sequence_number = Column(Integer, primary_key=False, autoincrement=True, unique=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    related_operation_id = Column(String(64), nullable=True, index=True)
    related_ticket_id = Column(String(64), nullable=True, index=True)
    outcome = Column(String(32), nullable=False)  # 'success' | 'warning' | 'rejected' | 'failed' | 'info'
    explanation = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)


class BenchmarkRunModel(Base):
    __tablename__ = "benchmark_runs"

    id = Column(String(64), primary_key=True, index=True)
    mode = Column(String(32), nullable=False)  # 'instant' | 'asyncreconcile' | 'comparison'
    total_scenarios = Column(Integer, nullable=False)
    passed_scenarios = Column(Integer, nullable=False)
    failed_scenarios = Column(Integer, nullable=False)
    premature_closure_attempts = Column(Integer, default=0, nullable=False)
    premature_closures_blocked = Column(Integer, default=0, nullable=False)
    failed_operations_handled = Column(Integer, default=0, nullable=False)
    incorrect_resolutions_rejected = Column(Integer, default=0, nullable=False)
    total_status_checks = Column(Integer, default=0, nullable=False)
    operations_completed = Column(Integer, default=0, nullable=False)
    pass_rate = Column(Float, default=0.0, nullable=False)
    details_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    completed_at = Column(DateTime, nullable=True)
