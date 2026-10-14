import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Operation, Account, Ticket, AuditEvent } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { StateMachineStepper } from '../components/StateMachineStepper';
import { Timeline } from '../components/Timeline';
import {
  ArrowLeft,
  Play,
  RotateCw,
  Cpu,
  User,
  Ticket as TicketIcon,
  Activity,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export const OperationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [operation, setOperation] = useState<Operation | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [polling, setPolling] = useState(false);

  const fetchOperationData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const op = await api.getOperation(id);
      setOperation(op);

      if (op.target_account_id) {
        const acc = await api.getAccount(op.target_account_id);
        setAccount(acc);
      }

      if (op.associated_ticket_id) {
        try {
          const tck = await api.getTicket(op.associated_ticket_id);
          setTicket(tck);
        } catch {
          setTicket(null);
        }
      }

      const evts = await api.getEvents({ operation_id: id, limit: 50 });
      setEvents(evts);
    } catch (err: any) {
      console.error('failed to load operation:', err);
      toast.error('failed to load operation', {
        description: (err.message || 'could not query operation.').toLowerCase(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperationData();
  }, [id]);

  const handleAdvance = async () => {
    if (!id) return;
    try {
      setAdvancing(true);
      const adv = await api.advanceOperation(id);
      toast.info(`operation advanced to '${adv.status.toLowerCase()}'`, {
        description: `virtual step #${adv.step_index}.`,
      });
      await fetchOperationData();
    } catch (err: any) {
      toast.error('advance rejected', {
        description: (err.message || 'cannot advance further.').toLowerCase(),
      });
    } finally {
      setAdvancing(false);
    }
  };

  const handlePollStatus = async () => {
    if (!id) return;
    try {
      setPolling(true);
      const statusRes = await api.checkOperationStatus(id);
      toast.success('status query recorded', {
        description: `status: '${statusRes.status.toLowerCase()}' · polls: ${statusRes.status_checks_count}.`,
      });
      await fetchOperationData();
    } catch (err: any) {
      toast.error('status check failed', {
        description: (err.message || 'error checking status.').toLowerCase(),
      });
    } finally {
      setPolling(false);
    }
  };

  if (loading && !operation) {
    return (
      <div className="py-24 text-center lowercase">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-mono text-slate-500 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
          <span>loading operation state machine telemetry...</span>
        </div>
      </div>
    );
  }

  if (!operation) {
    return (
      <div className="py-16 text-center text-slate-500 lowercase">
        operation not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 lowercase pb-10">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <button
          onClick={() => navigate('/operations')}
          className="pressable inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>return to operations</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePollStatus}
            disabled={polling}
            className="pressable inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-2xs transition-all"
          >
            <RotateCw className={`h-3.5 w-3.5 text-slate-500 ${polling ? 'animate-spin' : ''}`} />
            <span>{polling ? 'polling...' : 'poll status'}</span>
          </button>

          {operation.status !== 'completed' && operation.status !== 'failed' && (
            <button
              onClick={handleAdvance}
              disabled={advancing}
              className="pressable inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition-all"
            >
              <Play className="h-3 w-3 fill-white" />
              <span>{advancing ? 'advancing...' : 'advance step'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Info Card */}
      <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-bold text-slate-900">
              {operation.id.toLowerCase()}
            </span>
            <span className="font-mono text-xs text-slate-700 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200">
              {operation.operation_type.toLowerCase()}
            </span>
            <StatusBadge status={operation.status} size="sm" />
          </div>
          <span className="text-xs font-mono text-slate-400">
            created: {new Date(operation.created_at).toLocaleString()}
          </span>
        </div>

        {/* State Machine Stepper */}
        <StateMachineStepper
          status={operation.status}
          mode={operation.mode}
          errorDetails={operation.error_details}
        />
      </div>

      {/* Target Account and Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Target Account Card */}
        <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
                <User className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-xs font-semibold text-slate-900">target account state</h3>
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
                <span className="text-slate-400">full name:</span>
                <span className="text-slate-900 font-medium">{account.name.toLowerCase()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100/60">
                <span className="text-slate-400">email:</span>
                <span className="font-mono text-slate-600">{account.email.toLowerCase()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100/60">
                <span className="text-slate-400">department:</span>
                <span className="text-slate-700">
                  {account.department.toLowerCase()} · {account.role.toLowerCase()}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">current status:</span>
                <span className="font-mono text-slate-900 font-semibold">{account.status.toLowerCase()}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center font-mono">
              account record not found in directory.
            </p>
          )}
        </div>

        {/* Operational Telemetry Card */}
        <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 border border-sky-100 text-sky-600">
                <Cpu className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-xs font-semibold text-slate-900">operational telemetry</h3>
            </div>
            <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              step #{operation.step_index}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100/60">
              <span className="text-slate-400">reconciliation status queries:</span>
              <span className="font-mono text-indigo-700 font-semibold">
                {operation.status_checks_count}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100/60">
              <span className="text-slate-400">execution protocol:</span>
              <span className="font-mono text-slate-800 font-medium">{operation.mode.toLowerCase()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100/60">
              <span className="text-slate-400">associated ticket:</span>
              {ticket ? (
                <button
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  className="font-mono font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                >
                  <span>{ticket.id.toLowerCase()}</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              ) : (
                <span className="text-slate-400 italic">none linked</span>
              )}
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">completion timestamp:</span>
              <span className="font-mono text-slate-600 text-xs">
                {operation.completed_at
                  ? new Date(operation.completed_at).toLocaleString()
                  : 'in-flight'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Operation Audit Trace */}
      <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-6 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100/80 pb-3">
          <h3 className="text-xs font-semibold text-slate-900">
            audit log for operation {operation.id.toLowerCase()}
          </h3>
          <span className="font-mono text-[11px] text-slate-400">
            {events.length} audit entries
          </span>
        </div>
        <div className="max-h-[380px] overflow-y-auto pr-1">
          <Timeline events={events} emptyMessage="no audit events recorded for this operation." />
        </div>
      </div>
    </div>
  );
};
