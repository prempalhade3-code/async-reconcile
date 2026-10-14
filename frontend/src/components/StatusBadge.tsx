import React from 'react';
import { cn } from '../utils/cn';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className,
  showDot = true,
}) => {
  const norm = (status || 'unknown').toLowerCase().trim();

  let badgeStyle = 'bg-slate-50/80 text-slate-700 border-slate-200/80 shadow-2xs';
  let dotStyle = 'bg-slate-400';
  let pulse = false;

  if (['active', 'resolved', 'completed', 'success', 'passed'].includes(norm)) {
    badgeStyle = 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80 shadow-xs shadow-emerald-500/5';
    dotStyle = 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]';
  } else if (['running', 'in_progress'].includes(norm)) {
    badgeStyle = 'bg-sky-50/80 text-sky-800 border-sky-200/80 shadow-xs shadow-sky-500/5';
    dotStyle = 'bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.5)]';
    pulse = true;
  } else if (['pending', 'warning'].includes(norm)) {
    badgeStyle = 'bg-amber-50/80 text-amber-900 border-amber-200/80 shadow-xs shadow-amber-500/5';
    dotStyle = 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]';
  } else if (['suspended'].includes(norm)) {
    badgeStyle = 'bg-indigo-50/80 text-indigo-800 border-indigo-200/80 shadow-xs shadow-indigo-500/5';
    dotStyle = 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.5)]';
  } else if (['failed', 'rejected', 'critical'].includes(norm)) {
    badgeStyle = 'bg-rose-50/80 text-rose-800 border-rose-200/80 shadow-xs shadow-rose-500/5';
    dotStyle = 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]';
  } else if (['open', 'info'].includes(norm)) {
    badgeStyle = 'bg-blue-50/80 text-blue-800 border-blue-200/80 shadow-xs shadow-blue-500/5';
    dotStyle = 'bg-blue-500';
  } else if (norm === 'high') {
    badgeStyle = 'bg-orange-50/80 text-orange-800 border-orange-200/80';
    dotStyle = 'bg-orange-500';
  } else if (norm === 'medium') {
    badgeStyle = 'bg-slate-50/80 text-slate-700 border-slate-200/80';
    dotStyle = 'bg-slate-400';
  } else if (norm === 'low' || norm === 'closed') {
    badgeStyle = 'bg-slate-50/80 text-slate-500 border-slate-200/80';
    dotStyle = 'bg-slate-300';
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : size === 'lg'
      ? 'px-3 py-1 text-xs'
      : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-normal tracking-tight whitespace-nowrap select-none lowercase backdrop-blur-xs transition-colors',
        sizeClasses,
        badgeStyle,
        className
      )}
    >
      {showDot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center">
          {pulse && (
            <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', dotStyle)} />
          )}
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', dotStyle)} />
        </span>
      )}
      <span>{norm.replace(/_/g, ' ')}</span>
    </span>
  );
};
