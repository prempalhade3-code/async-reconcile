import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Ticket,
  Account,
  Operation,
  AuditEvent,
  TicketResolutionCheck,
  ApiError,
} from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { ErrorMessage } from '../components/ErrorMessage';
import { Modal } from '../components/Modal';
import { Timeline } from '../components/Timeline';
import { StateMachineStepper } from '../components/StateMachineStepper';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Play,
  ShieldCheck,
  ShieldAlert,
  User,
  Cpu,
  Mail,
  Building,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [resolvability, setResolvability] = useState<TicketResolutionCheck | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolution modal state
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<ApiError | null>(null);

  // Operation action states
  const [advancing, setAdvancing] = useState(false);
  const [creatingOp, setCreatingOp] = useState(false);

  const fetchTicketDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const t = await api.getTicket(id);
      setTicket(t);

      if (t.target_account_id) {
        const acc = await api.getAccount(t.target_account_id);
        setAccount(acc);
      }

      if (t.associated_operation_id) {
        try {
          const op = await api.getOperation(t.associated_operation_id);
          setOperation(op);
        } catch {
          setOperation(null);
        }
      } else {
        setOperation(null);
      }

      const check = await api.checkResolvability(id);
      setResolvability(check);

      const evts = await api.getEvents({ ticket_id: id, limit: 50 });
      setEvents(evts);
    } catch (err: any) {
      console.error('failed to load ticket details:', err);
      toast.error('failed to load ticket', {
        description: (err.message || 'could not query ticket.').toLowerCase(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
  }, [id]);

  const handleCreateOperation = async (mode: 'asyncreconcile' | 'instant') => {
    if (!ticket) return;
    try {
      setCreatingOp(true);
      const op = await api.createOperation({
        operation_type: ticket.required_action,
        target_account_id: ticket.target_account_id,
        associated_ticket_id: ticket.id,
        mode,
      });
      toast.success(`operation ${op.id.toLowerCase()} created`, {
        description: `mode: ${mode} · status: ${op.status.toLowerCase()}`,
      });
      await fetchTicketDetails();
    } catch (err: any) {
      toast.error('failed to create operation', {
        description: (err.message || 'error creating operation.').toLowerCase(),
      });
    } finally {
      setCreatingOp(false);
    }
  };

  const handleAdvanceOperation = async () => {
    if (!operation) return;
    try {
      setAdvancing(true);
      const advanced = await api.advanceOperation(operation.id);
      toast.info(`operation ${operation.id.toLowerCase()} advanced`, {
        description: `status: ${advanced.status.toLowerCase()} · step #${advanced.step_index}`,
      });
      await fetchTicketDetails();
    } catch (err: any) {
      toast.error('advance failed', {
        description: (err.message || 'operation cannot advance further.').toLowerCase(),
      });
    } finally {
      setAdvancing(false);
    }
  };

  const handleAttemptResolve = async () => {
    if (!ticket) return;
    try {
      setResolving(true);
      setResolveError(null);
      await api.resolveTicket(ticket.id, operation?.id, resolutionNotes);
      toast.success(`ticket ${ticket.id.toLowerCase()} resolved`, {
        description: 'all completion invariants verified in downstream directory.',
      });
      setIsResolveModalOpen(false);
      await fetchTicketDetails();
    } catch (err: any) {
      setResolveError(err as ApiError);
      toast.warning('resolution blocked (http 409 conflict)', {
        description: (err.message || 'completion verification failed.').toLowerCase(),
      });
    } finally {
      setResolving(false);
    }
  };

  if (loading && !ticket) {
    return (
      <div className="py-24 text-center lowercase">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-mono text-slate-500 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
          <span>retrieving ticket state and safety invariants...</span>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="py-16 text-center text-slate-500 lowercase">
        ticket not found.
      </div>
    );
  }

  const checks = resolvability?.checks;

  return (
    <div className="space-y-6 lowercase pb-10">
      {/* Top Breadcrumb & Primary Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <button
          onClick={() => navigate('/tickets')}
          className="pressable inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>return to tickets</span>
        </button>

        <div className="flex items-center gap-2.5">
          {ticket.status !== 'resolved' ? (
            <button
              onClick={() => {
                setResolveError(null);
                setIsResolveModalOpen(true);
              }}
              className="pressable inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-slate-800 transition-all"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>attempt resolution</span>
            </button>
          ) : (
            <span className="font-mono text-xs text-emerald-800 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-300 inline-flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold">resolved & verified</span>
            </span>
          )}
        </div>
      </div>

      {/* Ticket Overview Header Card */}
      <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-6 space-y-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-bold text-slate-900 tracking-tight">
              {ticket.id.toLowerCase()}
            </span>
            <StatusBadge status={ticket.priority} size="sm" />
            <StatusBadge status={ticket.status} size="sm" />
          </div>
          <span className="text-xs font-mono text-slate-400">
            created: {new Date(ticket.created_at).toLocaleString()}
          </span>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight font-sans">
            {ticket.title.toLowerCase()}
          </h2>
          <p className="mt-1.5 text-xs text-slate-600 leading-relaxed font-sans">
            {ticket.description.toLowerCase()}
          </p>
        </div>

        {ticket.resolution_notes && (
          <div className="mt-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-3.5 text-xs text-emerald-900">
            <span className="font-semibold font-mono">resolution record: </span>
            <span>{ticket.resolution_notes.toLowerCase()}</span>
          </div>
        )}
      </div>

      {/* 4-Seal Interactive Pre-Flight Completion Verification Gate */}
      <div className="surface-card relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-6 space-y-4 shadow-xs">
        {/* Glow backdrop based on status */}
        <div
          className={`pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full blur-3xl opacity-60 ${
            resolvability?.allowed ? 'bg-emerald-200' : 'bg-amber-200'
          }`}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100/80 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
                resolvability?.allowed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                  : 'border-amber-200 bg-amber-50 text-amber-600'
              }`}
            >
              {resolvability?.allowed ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-900">
                pre-flight completion verification gate
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                all 4 completion invariants must clear before resolution is accepted.
              </p>
            </div>
          </div>

          <span
            className={`font-mono text-xs px-3 py-1 rounded-full border font-semibold shadow-2xs ${
              resolvability?.allowed
                ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
                : 'bg-amber-100/90 text-amber-900 border-amber-300'
            }`}
          >
            gate status: {resolvability?.allowed ? 'allowed to close' : 'closure blocked'}
          </span>
        </div>

        {/* Reason summary banner */}
        <div
          className={`rounded-xl p-3.5 text-xs border font-mono ${
            resolvability?.allowed
              ? 'bg-emerald-50/80 text-emerald-950 border-emerald-200'
              : 'bg-amber-50/80 text-amber-950 border-amber-200'
          }`}
        >
          <span className="font-bold">verdict: </span>
          <span>{resolvability?.reason.toLowerCase()}</span>
        </div>

        {/* The 4 Invariant Gate Seals */}
        {checks && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
            {/* Seal 1: Operation Exists */}
            <div
              className={`rounded-xl border p-3.5 transition-all shadow-2xs ${
                checks.operation_exists
                  ? 'border-emerald-200/90 bg-emerald-50/50 ring-1 ring-emerald-200/40'
                  : 'border-slate-200/80 bg-slate-50/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-xs text-slate-800">
                  1. operation exists
                </span>
                {checks.operation_exists ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <p className="font-mono text-[11px] text-slate-600 truncate">
                {checks.operation_id ? checks.operation_id.toLowerCase() : 'none dispatched'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                must be tied to this ticket
              </p>
            </div>

            {/* Seal 2: Account Match */}
            <div
              className={`rounded-xl border p-3.5 transition-all shadow-2xs ${
                checks.operation_matches_account
                  ? 'border-emerald-200/90 bg-emerald-50/50 ring-1 ring-emerald-200/40'
                  : 'border-slate-200/80 bg-slate-50/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-xs text-slate-800">
                  2. target account
                </span>
                {checks.operation_matches_account ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <p className="font-mono text-[11px] text-slate-600 truncate">
                {ticket.target_account_id.toLowerCase()}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                identity matches broker target
              </p>
            </div>

            {/* Seal 3: Op Completed */}
            <div
              className={`rounded-xl border p-3.5 transition-all shadow-2xs ${
                checks.operation_completed
                  ? 'border-emerald-200/90 bg-emerald-50/50 ring-1 ring-emerald-200/40'
                  : 'border-amber-200/90 bg-amber-50/50 ring-1 ring-amber-200/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-xs text-slate-800">
                  3. op completed
                </span>
                {checks.operation_completed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
                )}
              </div>
              <p className="font-mono text-[11px] text-slate-600">
                status: {(checks.operation_status || 'not started').toLowerCase()}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                state machine reached terminal
              </p>
            </div>

            {/* Seal 4: Live State Verified */}
            <div
              className={`rounded-xl border p-3.5 transition-all shadow-2xs ${
                checks.account_state_verified
                  ? 'border-emerald-200/90 bg-emerald-50/50 ring-1 ring-emerald-200/40'
                  : 'border-amber-200/90 bg-amber-50/50 ring-1 ring-amber-200/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-xs text-slate-800">
                  4. directory verified
                </span>
                {checks.account_state_verified ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-600" />
                )}
              </div>
              <p className="font-mono text-[11px] text-slate-600">
                live: {checks.current_account_status.toLowerCase()}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                matches req: {checks.required_account_status.toLowerCase()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Target Account and Associated Operation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Target Employee Account */}
        <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
                <User className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-xs font-semibold text-slate-900">
                target employee record
              </h3>
            </div>
            {account && <StatusBadge status={account.status} size="sm" />}
          </div>

          {account ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100/60">
                <span className="text-slate-400">employee id:</span>
                <span className="font-mono text-slate-900 font-semibold">{account.employee_id.toLowerCase()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100/60">
                <span className="text-slate-400">name:</span>
                <span className="text-slate-900 font-medium">{account.name.toLowerCase()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100/60">
                <span className="text-slate-400">email:</span>
                <span className="font-mono text-slate-600">{account.email.toLowerCase()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100/60">
                <span className="text-slate-400">org role:</span>
                <span className="text-slate-700">
                  {account.department.toLowerCase()} · {account.role.toLowerCase()}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">live directory status:</span>
                <span className="font-mono text-slate-900 font-semibold">{account.status.toLowerCase()}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center font-mono">
              account record not found in directory.
            </p>
          )}
        </div>

        {/* Associated Operation */}
        <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-5 flex flex-col justify-between shadow-xs">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 border border-sky-100 text-sky-600">
                  <Cpu className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xs font-semibold text-slate-900">
                  associated operation
                </h3>
              </div>
              {operation && <StatusBadge status={operation.status} size="sm" />}
            </div>

            {operation ? (
              <div className="space-y-3">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100/60">
                    <span className="text-slate-400">operation id:</span>
                    <button
                      onClick={() => navigate(`/operations/${operation.id}`)}
                      className="font-mono font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                    >
                      <span>{operation.id.toLowerCase()}</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100/60">
                    <span className="text-slate-400">execution protocol:</span>
                    <span className="font-mono font-medium text-slate-800">{operation.mode.toLowerCase()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100/60">
                    <span className="text-slate-400">virtual step index:</span>
                    <span className="font-mono text-slate-900 font-semibold">#{operation.step_index}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">reconciliation status queries:</span>
                    <span className="font-mono text-slate-900 font-semibold">{operation.status_checks_count}</span>
                  </div>
                </div>

                {/* Inline Compact Stepper */}
                <div className="pt-2">
                  <StateMachineStepper
                    status={operation.status}
                    mode={operation.mode}
                    errorDetails={operation.error_details}
                    compact={true}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-2">
                <p className="text-xs text-slate-500">
                  no asynchronous operation has been initiated for this ticket yet.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => handleCreateOperation('asyncreconcile')}
                    disabled={creatingOp}
                    className="pressable rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-medium text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
                  >
                    start asyncreconcile op
                  </button>
                  <button
                    onClick={() => handleCreateOperation('instant')}
                    disabled={creatingOp}
                    className="pressable rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-2xs"
                  >
                    start instant op
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Operation Action Buttons */}
          {operation && operation.status !== 'completed' && operation.status !== 'failed' && (
            <div className="flex items-center gap-2.5 pt-3.5 mt-3.5 border-t border-slate-100/80">
              <button
                onClick={handleAdvanceOperation}
                disabled={advancing}
                className="pressable flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-medium text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
              >
                <Play className="h-3 w-3 fill-white" />
                <span>{advancing ? 'advancing...' : 'advance step'}</span>
              </button>
              <button
                onClick={async () => {
                  await api.checkOperationStatus(operation.id);
                  toast.info('status query logged', {
                    description: `poll count incremented. status is '${operation.status.toLowerCase()}'.`,
                  });
                  await fetchTicketDetails();
                }}
                className="pressable inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                <RotateCw className="h-3 w-3" />
                <span>poll status</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Specific Event Timeline */}
      <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-6 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100/80 pb-3">
          <h3 className="text-xs font-semibold text-slate-900">
            audit log for ticket {ticket.id.toLowerCase()}
          </h3>
          <span className="font-mono text-[11px] text-slate-400">
            {events.length} audit entries
          </span>
        </div>
        <div className="max-h-[380px] overflow-y-auto pr-1">
          <Timeline events={events} emptyMessage="no audit events for this ticket yet." />
        </div>
      </div>

      {/* Resolution Modal */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title="attempt ticket resolution"
        description="submit resolution request through the asyncreconcile completion verification gate."
      >
        <div className="space-y-4">
          {resolveError && (
            <ErrorMessage
              error={resolveError}
              onDismiss={() => setResolveError(null)}
            />
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              resolution verification notes
            </label>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. employee offboarding complete, directory suspension verified..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsResolveModalOpen(false)}
              className="pressable rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              cancel
            </button>
            <button
              onClick={handleAttemptResolve}
              disabled={resolving}
              className="pressable rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
            >
              {resolving ? 'verifying directory...' : 'submit resolution'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
