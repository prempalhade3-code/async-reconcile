import {
  Account,
  Ticket,
  TicketResolutionCheck,
  Operation,
  OperationStatusResponse,
  AuditEvent,
  BenchmarkRun,
  DashboardSummary,
  ApiError,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const error: ApiError = {
        error_code: data?.error_code || `HTTP_${response.status}`,
        message: data?.message || response.statusText || 'Unknown API Error occurred.',
        resource_id: data?.resource_id,
        current_state: data?.current_state,
        reconciliation_hint: data?.reconciliation_hint,
        checks: data?.checks,
      };
      throw error;
    }

    return data as T;
  }

  // Accounts
  async getAccounts(status?: string): Promise<Account[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<Account[]>(`/accounts${query}`);
  }

  async getAccount(id: string): Promise<Account> {
    return this.request<Account>(`/accounts/${encodeURIComponent(id)}`);
  }

  // Tickets
  async getTickets(status?: string, priority?: string): Promise<Ticket[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request<Ticket[]>(`/tickets${queryString}`);
  }

  async getTicket(id: string): Promise<Ticket> {
    return this.request<Ticket>(`/tickets/${encodeURIComponent(id)}`);
  }

  async checkResolvability(ticketId: string): Promise<TicketResolutionCheck> {
    return this.request<TicketResolutionCheck>(`/tickets/${encodeURIComponent(ticketId)}/resolvability`);
  }

  async resolveTicket(ticketId: string, operationId?: string, notes?: string): Promise<Ticket> {
    return this.request<Ticket>(`/tickets/${encodeURIComponent(ticketId)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({
        operation_id: operationId,
        resolution_notes: notes,
      }),
    });
  }

  async createTicket(ticketData: {
    title: string;
    description: string;
    target_account_id: string;
    priority?: string;
    required_action?: string;
  }): Promise<Ticket> {
    return this.request<Ticket>('/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    });
  }

  // Operations
  async getOperations(filters?: { status?: string; account_id?: string; ticket_id?: string }): Promise<Operation[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.account_id) params.append('account_id', filters.account_id);
    if (filters?.ticket_id) params.append('ticket_id', filters.ticket_id);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request<Operation[]>(`/operations${queryString}`);
  }

  async getOperation(id: string): Promise<Operation> {
    return this.request<Operation>(`/operations/${encodeURIComponent(id)}`);
  }

  async checkOperationStatus(id: string): Promise<OperationStatusResponse> {
    return this.request<OperationStatusResponse>(`/operations/${encodeURIComponent(id)}/status`);
  }

  async createOperation(data: {
    operation_type: string;
    target_account_id: string;
    associated_ticket_id?: string;
    mode: 'instant' | 'asyncreconcile';
    target_outcome?: 'completed' | 'failed';
  }): Promise<Operation> {
    return this.request<Operation>('/operations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async advanceOperation(id: string, stepDelta: number = 1, forceOutcome?: string): Promise<Operation> {
    return this.request<Operation>(`/operations/${encodeURIComponent(id)}/advance`, {
      method: 'POST',
      body: JSON.stringify({
        step_delta: stepDelta,
        force_outcome: forceOutcome,
      }),
    });
  }

  // Audit Events
  async getEvents(filters?: {
    event_type?: string;
    outcome?: string;
    operation_id?: string;
    ticket_id?: string;
    limit?: number;
    sort_order?: 'asc' | 'desc';
  }): Promise<AuditEvent[]> {
    const params = new URLSearchParams();
    if (filters?.event_type) params.append('event_type', filters.event_type);
    if (filters?.outcome) params.append('outcome', filters.outcome);
    if (filters?.operation_id) params.append('operation_id', filters.operation_id);
    if (filters?.ticket_id) params.append('ticket_id', filters.ticket_id);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sort_order) params.append('sort_order', filters.sort_order);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request<AuditEvent[]>(`/events${queryString}`);
  }

  // Benchmark & Dashboard
  async getDashboard(): Promise<DashboardSummary> {
    return this.request<DashboardSummary>('/benchmark/dashboard');
  }

  async triggerBenchmark(mode: 'asyncreconcile' | 'instant' | 'comparison'): Promise<BenchmarkRun[]> {
    return this.request<BenchmarkRun[]>('/benchmark/runs', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  }

  async getBenchmarkRuns(limit: number = 50): Promise<BenchmarkRun[]> {
    return this.request<BenchmarkRun[]>(`/benchmark/runs?limit=${limit}`);
  }

  async getBenchmarkRun(id: string): Promise<BenchmarkRun> {
    return this.request<BenchmarkRun>(`/benchmark/runs/${encodeURIComponent(id)}`);
  }

  async resetDemoData(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/benchmark/reset-demo', {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
