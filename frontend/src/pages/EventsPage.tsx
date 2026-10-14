import React, { useEffect, useState, useMemo } from 'react';
import { AuditEvent } from '../types';
import { api } from '../services/api';
import { Timeline } from '../components/Timeline';
import { EmptyState } from '../components/EmptyState';
import { Search, RotateCw, ScrollText, Filter, Activity, ShieldCheck, ShieldAlert } from 'lucide-react';

export const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [searchId, setSearchId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getEvents({
        outcome: outcomeFilter !== 'all' ? outcomeFilter : undefined,
        event_type: eventTypeFilter !== 'all' ? eventTypeFilter : undefined,
        sort_order: sortOrder,
        limit: 200,
      });
      setEvents(data);
    } catch (err) {
      console.error('failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [outcomeFilter, eventTypeFilter, sortOrder]);

  const filteredEvents = useMemo(() => {
    if (!searchId.trim()) return events;
    const q = searchId.toLowerCase().trim();
    return events.filter(
      (e) =>
        e.id.toLowerCase().includes(q) ||
        (e.related_operation_id && e.related_operation_id.toLowerCase().includes(q)) ||
        (e.related_ticket_id && e.related_ticket_id.toLowerCase().includes(q)) ||
        (e.explanation && e.explanation.toLowerCase().includes(q)) ||
        (e.event_type && e.event_type.toLowerCase().includes(q))
    );
  }, [events, searchId]);

  const stats = useMemo(() => {
    const rejected = events.filter((e) => e.outcome === 'rejected').length;
    const successes = events.filter((e) => e.outcome === 'success').length;
    const transitions = events.filter((e) => e.event_type.includes('transition')).length;
    return { rejected, successes, transitions, total: events.length };
  }, [events]);

  return (
    <div className="space-y-6 lowercase pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600" />
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 font-sans">
              audit stream & event log
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            append-only immutable audit history of operational state transitions, status checks, and pre-flight gates.
          </p>
        </div>

        {/* Quick summary chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="px-3 py-1 rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-2xs font-mono font-medium">
            total: {stats.total}
          </span>
          <span className="px-3 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-900 shadow-2xs font-mono font-semibold">
            409 blocked: {stats.rejected}
          </span>
          <span className="px-3 py-1 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-900 shadow-2xs font-mono font-semibold">
            success: {stats.successes}
          </span>
          <span className="px-3 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-900 shadow-2xs font-mono font-medium">
            transitions: {stats.transitions}
          </span>
        </div>
      </div>

      {/* Filter and Command Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="search by event id, op, ticket, or explanation..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 pl-10 pr-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-hidden transition-all shadow-2xs"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Outcome Filter */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs text-slate-600 shadow-2xs">
            <span className="text-slate-400 font-mono text-[11px]">outcome:</span>
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">all outcomes</option>
              <option value="success">success</option>
              <option value="rejected">rejected (safety guard)</option>
              <option value="failed">failed</option>
              <option value="warning">warning</option>
              <option value="info">info</option>
            </select>
          </div>

          {/* Event Type Filter */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs text-slate-600 shadow-2xs">
            <span className="text-slate-400 font-mono text-[11px]">type:</span>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer font-mono text-[11px]"
            >
              <option value="all">all event types</option>
              <option value="premature_resolution_blocked">premature_resolution_blocked</option>
              <option value="operation_created">operation_created</option>
              <option value="operation_transitioned">operation_transitioned</option>
              <option value="status_checked">status_checked</option>
              <option value="ticket_resolved">ticket_resolved</option>
              <option value="benchmark_run_completed">benchmark_run_completed</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs text-slate-600 shadow-2xs">
            <span className="text-slate-400 font-mono text-[11px]">sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="desc">newest first</option>
              <option value="asc">oldest first</option>
            </select>
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchEvents}
            title="refresh audit stream"
            className="pressable p-2 rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 shadow-2xs transition-all"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Audit Feed */}
      <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100/80 pb-3.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-600" />
            <h3 className="text-xs font-semibold text-slate-900">
              audit stream records
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
            showing {filteredEvents.length} of {events.length} records
          </span>
        </div>

        {loading ? (
          <div className="py-24 text-center lowercase">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-mono text-slate-500 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
              <span>streaming audit event ledger...</span>
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            title="no audit records found"
            description="no events matched the specified filter criteria."
            icon={ScrollText}
          />
        ) : (
          <div className="max-h-[640px] overflow-y-auto pr-2">
            <Timeline events={filteredEvents} />
          </div>
        )}
      </div>
    </div>
  );
};
