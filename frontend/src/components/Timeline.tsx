import React, { useState } from 'react';
import { AuditEvent } from '../types';
import { StatusBadge } from './StatusBadge';
import { ChevronDown, ChevronRight, Activity, CheckCircle2, AlertOctagon, ShieldCheck, Terminal } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'motion/react';

interface TimelineProps {
  events: AuditEvent[];
  emptyMessage?: string;
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({
  events,
  emptyMessage = 'no audit events recorded yet.',
  className,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (events.length === 0) {
    return (
      <div className="py-12 text-center lowercase">
        <p className="text-xs font-mono text-slate-400">{emptyMessage.toLowerCase()}</p>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getEventIcon = (outcome: string) => {
    if (outcome === 'success') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
    if (outcome === 'rejected') return <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />;
    if (outcome === 'failed') return <AlertOctagon className="h-3.5 w-3.5 text-rose-600" />;
    return <Activity className="h-3.5 w-3.5 text-indigo-500" />;
  };

  const getPipBg = (outcome: string) => {
    if (outcome === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (outcome === 'rejected') return 'border-amber-200 bg-amber-50 text-amber-700';
    if (outcome === 'failed') return 'border-rose-200 bg-rose-50 text-rose-700';
    return 'border-indigo-200 bg-indigo-50 text-indigo-700';
  };

  return (
    <div
      className={cn(
        'relative pl-6 space-y-3 before:absolute before:bottom-3 before:left-[11px] before:top-3 before:w-px before:bg-gradient-to-b before:from-indigo-300 before:via-slate-200 before:to-transparent lowercase',
        className
      )}
    >
      {events.map((evt) => {
        const isExpanded = expandedId === evt.id;
        const formattedDate = new Date(evt.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        return (
          <div key={evt.id} className="relative group">
            {/* Timeline node pip */}
            <div
              className={cn(
                'absolute -left-6 top-3 flex h-6 w-6 items-center justify-center rounded-full border shadow-2xs transition-transform group-hover:scale-110',
                getPipBg(evt.outcome)
              )}
            >
              {getEventIcon(evt.outcome)}
            </div>

            <div className="surface-card p-3.5 rounded-xl border border-slate-200/80 bg-white/95 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all duration-150">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {evt.sequence_number && (
                    <span className="font-mono text-[10px] text-slate-400 font-semibold">
                      #{evt.sequence_number.toString().padStart(3, '0')}
                    </span>
                  )}
                  <span className="font-mono text-xs font-semibold text-slate-900 tracking-tight">
                    {evt.event_type.toLowerCase()}
                  </span>
                  <StatusBadge status={evt.outcome} size="sm" />
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <span>{formattedDate}</span>
                  {evt.metadata_json && (
                    <button
                      onClick={() => toggleExpand(evt.id)}
                      className="pressable inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-slate-600 hover:text-slate-900 border border-slate-200/70 text-[10px] font-medium"
                    >
                      <Terminal className="h-3 w-3 text-slate-400" />
                      <span>{isExpanded ? 'hide' : 'payload'}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-2.5 w-2.5" />
                      ) : (
                        <ChevronRight className="h-2.5 w-2.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed font-sans lowercase">
                {evt.explanation.toLowerCase()}
              </p>

              {(evt.related_operation_id || evt.related_ticket_id) && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                  {evt.related_operation_id && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50/70 px-2 py-0.5 text-indigo-700 border border-indigo-100 font-medium">
                      <span className="text-indigo-400">op:</span> {evt.related_operation_id.toLowerCase()}
                    </span>
                  )}
                  {evt.related_ticket_id && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100/70 px-2 py-0.5 text-slate-700 border border-slate-200/70 font-medium">
                      <span className="text-slate-400">ticket:</span> {evt.related_ticket_id.toLowerCase()}
                    </span>
                  )}
                </div>
              )}

              <AnimatePresence>
                {isExpanded && evt.metadata_json && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.16 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-emerald-400 border border-slate-800 overflow-x-auto shadow-inner">
                      <pre className="text-emerald-300">
                        {JSON.stringify(JSON.parse(evt.metadata_json), null, 2)}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
};
