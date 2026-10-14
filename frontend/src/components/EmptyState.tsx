import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { cn } from '../utils/cn';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50/40 p-10 text-center lowercase',
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200/80 text-slate-400 shadow-2xs mb-3.5">
        <Icon className="h-5 w-5 text-slate-500" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 lowercase tracking-tight">
        {title.toLowerCase()}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed lowercase font-sans">
        {description.toLowerCase()}
      </p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="pressable mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-slate-800 lowercase transition-all"
        >
          {action.label.toLowerCase()}
        </button>
      )}
    </div>
  );
};
