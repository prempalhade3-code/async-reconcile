import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  badge?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  badge,
  variant = 'default',
  className,
  onClick,
}) => {
  let badgeClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let accentBar = 'from-slate-200 via-slate-100 to-transparent';
  let glowColor = 'group-hover:shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)]';

  if (variant === 'success') {
    badgeClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs';
    accentBar = 'from-emerald-400/40 via-emerald-200/20 to-transparent';
    glowColor = 'group-hover:shadow-[0_8px_24px_-4px_rgba(16,185,129,0.12)] group-hover:border-emerald-300/60';
  } else if (variant === 'warning') {
    badgeClasses = 'bg-amber-50 text-amber-900 border-amber-200 shadow-2xs';
    accentBar = 'from-amber-400/40 via-amber-200/20 to-transparent';
    glowColor = 'group-hover:shadow-[0_8px_24px_-4px_rgba(245,158,11,0.12)] group-hover:border-amber-300/60';
  } else if (variant === 'danger') {
    badgeClasses = 'bg-rose-50 text-rose-800 border-rose-200 shadow-2xs';
    accentBar = 'from-rose-400/40 via-rose-200/20 to-transparent';
    glowColor = 'group-hover:shadow-[0_8px_24px_-4px_rgba(244,63,94,0.12)] group-hover:border-rose-300/60';
  } else if (variant === 'info') {
    badgeClasses = 'bg-indigo-50 text-indigo-800 border-indigo-200 shadow-2xs';
    accentBar = 'from-indigo-400/40 via-indigo-200/20 to-transparent';
    glowColor = 'group-hover:shadow-[0_8px_24px_-4px_rgba(99,102,241,0.12)] group-hover:border-indigo-300/60';
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all duration-200',
        glowColor,
        onClick && 'cursor-pointer pressable hover:-translate-y-0.5',
        className
      )}
    >
      {/* Top subtle highlight gradient bar */}
      <div className={cn('absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r', accentBar)} />

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 lowercase tracking-tight">{label.toLowerCase()}</span>
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50/80 text-slate-500 border border-slate-200/60 shadow-2xs group-hover:border-slate-300 group-hover:text-slate-900 transition-colors">
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2.5">
        <span className="font-mono text-2xl lg:text-3xl font-semibold tracking-tight text-slate-950 tabular-nums">
          {value}
        </span>
        {badge && (
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-mono border lowercase tracking-tight', badgeClasses)}>
            {badge.toLowerCase()}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-1.5 text-xs text-slate-500 lowercase leading-relaxed line-clamp-1">{subtext.toLowerCase()}</p>
      )}
    </div>
  );
};
