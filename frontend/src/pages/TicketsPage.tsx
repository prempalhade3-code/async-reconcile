import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { Search, ArrowRight, TicketCheck, Filter, ShieldAlert, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export const TicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await api.getTickets(
        statusFilter !== 'all' ? statusFilter : undefined,
        priorityFilter !== 'all' ? priorityFilter : undefined
      );
      setTickets(data);
    } catch (err: any) {
      console.error('failed to fetch tickets:', err);
      toast.error('failed to load tickets', {
        description: (err.message || 'could not query tickets.').toLowerCase(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase().trim();
    return tickets.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.target_account_id.toLowerCase().includes(q) ||
        (t.account?.name && t.account.name.toLowerCase().includes(q))
    );
  }, [tickets, searchQuery]);

  return (
    <div className="space-y-6 lowercase pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600" />
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 font-sans">
              support tickets & operations queue
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            enterprise service desk requests subject to multi-stage reconciliation and pre-flight verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-500 bg-white border border-slate-200/80 px-3 py-1.5 rounded-full shadow-2xs">
            {filteredTickets.length} of {tickets.length} tickets
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="search by ticket id, issue, account id, or employee name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 pl-10 pr-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-hidden transition-all shadow-2xs"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs text-slate-600 shadow-2xs">
            <span className="text-slate-400 font-mono text-[11px]">status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">all statuses</option>
              <option value="open">open</option>
              <option value="in_progress">in progress</option>
              <option value="resolved">resolved</option>
              <option value="closed">closed</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs text-slate-600 shadow-2xs">
            <span className="text-slate-400 font-mono text-[11px]">priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">all priorities</option>
              <option value="critical">critical</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 text-center lowercase">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-mono text-slate-500 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
              <span>loading service desk tickets...</span>
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <EmptyState
            title="no tickets found"
            description="no support tickets match your filter criteria."
            icon={TicketCheck}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-semibold text-slate-500">
                  <th className="py-3.5 px-5 font-mono text-[11px]">ticket id</th>
                  <th className="py-3.5 px-5 font-mono text-[11px]">issue & title</th>
                  <th className="py-3.5 px-5 font-mono text-[11px]">target employee</th>
                  <th className="py-3.5 px-5 font-mono text-[11px]">operation required</th>
                  <th className="py-3.5 px-5 font-mono text-[11px]">priority</th>
                  <th className="py-3.5 px-5 font-mono text-[11px]">status</th>
                  <th className="py-3.5 px-5 font-mono text-[11px]">linked op</th>
                  <th className="py-3.5 px-5 text-right font-mono text-[11px]">action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    className="group hover:bg-indigo-50/30 cursor-pointer transition-colors"
                  >
                    {/* Ticket ID */}
                    <td className="py-4 px-5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {t.id.toLowerCase()}
                    </td>

                    {/* Title & Description */}
                    <td className="py-4 px-5 min-w-[280px] max-w-lg">
                      <div className="font-semibold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                        {t.title.toLowerCase()}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 leading-normal">
                        {t.description.toLowerCase()}
                      </div>
                    </td>

                    {/* Target account */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="font-medium text-slate-900">
                        {(t.account?.name || t.target_account_id).toLowerCase()}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {t.target_account_id.toLowerCase()}{' '}
                        {t.account?.status ? `(${t.account.status.toLowerCase()})` : ''}
                      </div>
                    </td>

                    {/* Required action */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-slate-700 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200">
                        {t.required_action.toLowerCase()}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <StatusBadge status={t.priority} size="sm" />
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <StatusBadge status={t.status} size="sm" />
                    </td>

                    {/* Linked operation */}
                    <td className="py-4 px-5 font-mono text-[11px] whitespace-nowrap">
                      {t.associated_operation_id ? (
                        <span className="text-indigo-700 font-semibold bg-indigo-50/70 px-2 py-0.5 rounded border border-indigo-100">
                          {t.associated_operation_id.toLowerCase()}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">none linked</span>
                      )}
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
    </div>
  );
};
