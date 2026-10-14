from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, ConfigDict


# ============================================================================
# Generic & Error Schemas
# ============================================================================

class ErrorResponse(BaseModel):
    error_code: str = Field(..., description="Machine-readable error identifier")
    message: str = Field(..., description="Human-readable explanation of the error")
    resource_id: Optional[str] = Field(None, description="Identifier of the resource involved")
    current_state: Optional[str] = Field(None, description="Current status or state of the resource")
    reconciliation_hint: Optional[str] = Field(None, description="Corrective action required")


# ============================================================================
# Account Schemas
# ============================================================================

class AccountBase(BaseModel):
    employee_id: str
    name: str
    email: str
    department: str
    role: str
    status: str = "active"


class AccountCreate(AccountBase):
    id: Optional[str] = None


class AccountRead(AccountBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Ticket Schemas
# ============================================================================

class TicketBase(BaseModel):
    title: str
    description: str
    target_account_id: str
    priority: str = "medium"
    status: str = "open"
    required_action: str = "suspend_account"
    associated_operation_id: Optional[str] = None


class TicketCreate(TicketBase):
    id: Optional[str] = None


class TicketResolveRequest(BaseModel):
    operation_id: Optional[str] = Field(None, description="ID of the operation confirming completion")
    resolution_notes: Optional[str] = Field(None, description="Notes documenting resolution")


class TicketResolutionCheck(BaseModel):
    ticket_id: str
    allowed: bool
    reason: str
    checks: Dict[str, Any]


class TicketRead(TicketBase):
    id: str
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    account: Optional[AccountRead] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Operation Schemas
# ============================================================================

class OperationCreate(BaseModel):
    operation_type: str = Field("suspend_account", description="Action to perform")
    target_account_id: str = Field(..., description="Target employee account ID")
    associated_ticket_id: Optional[str] = Field(None, description="Associated ticket ID")
    mode: str = Field("asyncreconcile", description="'instant' or 'asyncreconcile'")
    target_outcome: str = Field("completed", description="'completed' or 'failed'")


class OperationAdvanceRequest(BaseModel):
    step_delta: int = Field(1, description="Number of virtual steps to advance")
    force_outcome: Optional[str] = Field(None, description="Force transition to 'completed' or 'failed'")


class OperationRead(BaseModel):
    id: str
    operation_type: str
    target_account_id: str
    associated_ticket_id: Optional[str]
    status: str
    mode: str
    target_outcome: str
    status_checks_count: int
    step_index: int
    error_details: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class OperationStatusResponse(BaseModel):
    operation_id: str
    status: str
    operation_type: str
    target_account_id: str
    associated_ticket_id: Optional[str]
    mode: str
    step_index: int
    status_checks_count: int
    completed: bool
    account_status: str
    error_details: Optional[str]


# ============================================================================
# Audit Event Schemas
# ============================================================================

class AuditEventRead(BaseModel):
    id: str
    sequence_number: Optional[int] = None
    event_type: str
    related_operation_id: Optional[str] = None
    related_ticket_id: Optional[str] = None
    outcome: str
    explanation: str
    metadata_json: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Benchmark Runner & Scenario Schemas
# ============================================================================

class AgentActionLog(BaseModel):
    step: int
    action_name: str
    target_id: Optional[str] = None
    status: str  # 'success' | 'failed' | 'rejected'
    details: str
    timestamp: datetime


class ScenarioResult(BaseModel):
    scenario_id: str
    name: str
    description: str
    mode: str
    passed: bool
    expected_outcome: str
    actual_outcome: str
    explanation: str
    actions: List[AgentActionLog] = []


class BenchmarkRunRequest(BaseModel):
    mode: str = Field("comparison", description="'instant', 'asyncreconcile', or 'comparison'")


class BenchmarkRunRead(BaseModel):
    id: str
    mode: str
    total_scenarios: int
    passed_scenarios: int
    failed_scenarios: int
    premature_closure_attempts: int
    premature_closures_blocked: int
    failed_operations_handled: int
    incorrect_resolutions_rejected: int
    total_status_checks: int
    operations_completed: int
    pass_rate: float
    details_json: str
    created_at: datetime
    completed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class DashboardSummary(BaseModel):
    total_runs: int
    successful_runs: int
    failed_runs: int
    premature_closure_attempts: int
    premature_closures_blocked: int
    pending_or_running_operations: int
    failed_operations: int
    total_operations: int
    total_tickets: int
    mode_comparison: Dict[str, Any]
    recent_events: List[AuditEventRead]
    latest_run: Optional[BenchmarkRunRead]
