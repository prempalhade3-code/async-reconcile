import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Operation, Account } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { Search, Plus, ArrowRight, Cpu, Layers } from 'lucide-react';
import { toast } from 'sonner';

export const OperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create operation modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetAccount, setTargetAccount] = useState('');
  const [opType, setOpType] = useState('suspend_account');
  const [opMode, setOpMode] = useState<'asyncreconcile' | 'instant'>('asyncreconcile');
  const [targetOutcome, setTargetOutcome] = useState<'completed' | 'failed'>('completed');
  const [creating, setCreating] = useState(false);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      const data = await api.getOperations({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setOperations(data);
      const accList = await api.getAccounts();
      setAccounts(accList);
      if (accList.length > 0 && !targetAccount) {
        setTargetAccount(accList[0].id);
      }
    } catch (err: any) {
      console.error('failed to load operations:', err);
      toast.error('failed to load operations', {
        description: (err.message || 'could not query operations.').toLowerCase(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperations();
  }, [statusFilter]);

  const handleCreateOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAccount) return;
    try {
      setCreating(true);
      const created = await api.createOperation({
        operation_type: opType,
        target_account_id: targetAccount,
        mode: opMode,
        target_outcome: targetOutcome,
      });
      toast.success(`operation ${created.id.toLowerCase()} created`, {
        description: `target: ${created.target_account_id.toLowerCase()} · mode: ${created.mode.toLowerCase()}`,
      });
      setIsModalOpen(false);
      navigate(`/operations/${created.id}`);
    } catch (err: any) {
      toast.error('failed to create operation', {
        description: (err.message || 'error creating operation.').toLowerCase(),
      });
    } finally {
      setCreating(false);
    }
  };

  const filteredOps = useMemo(() => {
    if (!searchQuery.trim()) return operations;
    const q = searchQuery.toLowerCase().trim();
    return operations.filter(
      (op) =>
        op.id.toLowerCase().includes(q) ||
        op.target_account_id.toLowerCase().includes(q) ||
        (op.associated_ticket_id && op.associated_ticket_id.toLowerCase().includes(q))
    );
  }, [operations, searchQuery]);

  return (
    <div className="space-y-6 lowercase pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600" />
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 font-sans">
              asynchronous operations
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            virtual multi-step state transitions, background reconciliation, and directory sync lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-slate-500 bg-white border border-slate-200/80 px-3 py-1.5 rounded-full shadow-2xs">
            {filteredOps.length} of {operations.length} operations
          </span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="pressable inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-slate-800 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>new operation</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="search by operation id, account id, or ticket id..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 pl-10 pr-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-hidden transition-all shadow-2xs"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs text-slate-600 shadow-2xs">
          <span className="text-slate-400 font-mono text-[11px]">status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
          >
            <option value="all">all statuses</option>
            <option value="pending">pending</option>
            <option value="running">running</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
          </select>
        </div>
      </div>

      {/* Operations Table */}
      <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 text-center lowercase">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-mono text-slate-500 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
              <span>loading asynchronous operations queue...</span>
            </div>
          </div>
        ) : filteredOps.length === 0 ? (
          <EmptyState
            title="no operations found"
            description="no operations match your filter criteria."
            icon={Cpu}
            action={{
              label: 'create operation',
              onClick: () => setIsModalOpen(true),
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-semibold text-slate-500">
                  <th className="py-3.5 px-5 font-mono text-[11px]">operation id</th>
                  <th className="py-3.5 px-5 font-mono text-[11px]">type</th>
                  <th className="py-3.5 px-5 font-mono text-[11px]">target account</th>
                  <th className="py-3.5 px-5 font-mono text-[11px]">linked ticket</th>
                  <th className="py-3.5 px-5 font-mono text-[11px]">protocol</th>
                  <th className="py-3.5 px-5 font-mono text-[11px]">status</th>
                  <th className="py-3.5 px-5 font-mono text-[11px]">step</th>
                  <th className="py-3.5 px-5 font-mono text-[11px]">polls</th>
                  <th className="py-3.5 px-5 text-right font-mono text-[11px]">action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredOps.map((op) => (
                  <tr
                    key={op.id}
                    onClick={() => navigate(`/operations/${op.id}`)}
                    className="group hover:bg-indigo-50/30 cursor-pointer transition-colors"
                  >
                    {/* Operation ID */}
                    <td className="py-4 px-5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {op.id.toLowerCase()}
                    </td>

                    {/* Operation Type */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-slate-700 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200">
                        {op.operation_type.toLowerCase()}
                      </span>
                    </td>

                    {/* Target account */}
                    <td className="py-4 px-5 font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {op.target_account_id.toLowerCase()}
                    </td>

                    {/* Associated ticket */}
                    <td className="py-4 px-5 font-mono text-[11px] whitespace-nowrap">
                      {op.associated_ticket_id ? (
                        <span className="text-indigo-700 font-medium">
                          {op.associated_ticket_id.toLowerCase()}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">none linked</span>
                      )}
                    </td>

                    {/* Mode */}
                    <td className="py-4 px-5 font-mono text-[11px] whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${
                          op.mode === 'asyncreconcile'
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        {op.mode.toLowerCase()}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <StatusBadge status={op.status} size="sm" />
                    </td>

                    {/* Step index */}
                    <td className="py-4 px-5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      #{op.step_index}
                    </td>

                    {/* Status checks */}
                    <td className="py-4 px-5 font-mono text-[11px] text-slate-900 font-semibold whitespace-nowrap">
                      {op.status_checks_count}
                    </td>

                    {/* Inspect link */}
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">
                        inspect
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Operation Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="create new operation"
        description="simulate an asynchronous or instant operation against mock enterprise accounts."
      >
        <form onSubmit={handleCreateOperation} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1.5">
              target employee account
            </label>
            <select
              value={targetAccount}
              onChange={(e) => setTargetAccount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-hidden font-mono"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.id.toLowerCase()} - {acc.name.toLowerCase()} ({acc.department.toLowerCase()}, status:{' '}
                  {acc.status.toLowerCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1.5">
              operation type
            </label>
            <select
              value={opType}
              onChange={(e) => setOpType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-hidden"
            >
              <option value="suspend_account">suspend_account (legal hold / deprovisioning)</option>
              <option value="reactivate_account">reactivate_account</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                execution protocol
              </label>
              <select
                value={opMode}
                onChange={(e) => setOpMode(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-hidden font-mono"
              >
                <option value="asyncreconcile">asyncreconcile (staged)</option>
                <option value="instant">instant (single-step bypass)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                target outcome
              </label>
              <select
                value={targetOutcome}
                onChange={(e) => setTargetOutcome(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-hidden"
              >
                <option value="completed">completed (verified)</option>
                <option value="failed">failed (simulated rejection)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="pressable rounded-xl border border-slate-200 px-3.5 py-2 font-medium text-slate-600 hover:bg-slate-50"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="pressable rounded-xl bg-slate-900 px-4 py-2 font-medium text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
            >
              {creating ? 'creating...' : 'create operation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
