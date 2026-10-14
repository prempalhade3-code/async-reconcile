export type AccountStatus = 'active' | 'suspended';

export interface Account {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'failed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  target_account_id: string;
  priority: TicketPriority;
  status: TicketStatus;
  required_action: string;
  associated_operation_id?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  account?: Account | null;
}

export interface TicketResolutionCheck {
  ticket_id: string;
  allowed: boolean;
  reason: string;
  checks: {
    operation_exists: boolean;
    operation_id?: string | null;
    operation_status?: string;
    operation_matches_account: boolean;
    operation_completed: boolean;
    account_state_verified: boolean;
    current_account_status: string;
    required_account_status: string;
  };
}

export type OperationStatus = 'pending' | 'running' | 'completed' | 'failed';
export type OperationMode = 'instant' | 'asyncreconcile';

export interface Operation {
  id: string;
  operation_type: string;
  target_account_id: string;
  associated_ticket_id?: string | null;
  status: OperationStatus;
  mode: OperationMode;
  target_outcome: string;
  status_checks_count: number;
  step_index: number;
  error_details?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface OperationStatusResponse {
  operation_id: string;
  status: OperationStatus;
  operation_type: string;
  target_account_id: string;
  associated_ticket_id?: string | null;
  mode: OperationMode;
  step_index: number;
  status_checks_count: number;
  completed: boolean;
  account_status: string;
  error_details?: string | null;
}

export type EventOutcome = 'success' | 'warning' | 'rejected' | 'failed' | 'info';

export interface AuditEvent {
  id: string;
  sequence_number?: number;
  event_type: string;
  related_operation_id?: string | null;
  related_ticket_id?: string | null;
  outcome: EventOutcome;
  explanation: string;
  metadata_json?: string | null;
  created_at: string;
}

export interface AgentActionLog {
  step: number;
  action_name: string;
  target_id?: string | null;
  status: 'success' | 'failed' | 'rejected';
  details: string;
  timestamp: string;
}

export interface ScenarioResult {
  scenario_id: string;
  name: string;
  description: string;
  mode: string;
  passed: boolean;
  expected_outcome: string;
  actual_outcome: string;
  explanation: string;
  actions: AgentActionLog[];
}

export interface BenchmarkRun {
  id: string;
  mode: 'instant' | 'asyncreconcile' | 'comparison';
  total_scenarios: number;
  passed_scenarios: number;
  failed_scenarios: number;
  premature_closure_attempts: number;
  premature_closures_blocked: number;
  failed_operations_handled: number;
  incorrect_resolutions_rejected: number;
  total_status_checks: number;
  operations_completed: number;
  pass_rate: number;
  details_json: string;
  created_at: string;
  completed_at?: string | null;
}

export interface ModeComparisonStats {
  count: number;
  avg_pass_rate: number;
  premature_closures_blocked: number;
  premature_closure_attempts: number;
  total_status_checks: number;
}

export interface DashboardSummary {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  premature_closure_attempts: number;
  premature_closures_blocked: number;
  pending_or_running_operations: number;
  failed_operations: number;
  total_operations: number;
  total_tickets: number;
  mode_comparison: {
    asyncreconcile: ModeComparisonStats;
    instant: ModeComparisonStats;
  };
  recent_events: AuditEvent[];
  latest_run?: BenchmarkRun | null;
}

export interface ApiError {
  error_code: string;
  message: string;
  resource_id?: string;
  current_state?: string;
  reconciliation_hint?: string;
  checks?: Record<string, any>;
}
