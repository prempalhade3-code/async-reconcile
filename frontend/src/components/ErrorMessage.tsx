import React from 'react';
import { AlertTriangle, ShieldAlert, ArrowRight, X } from 'lucide-react';
import { ApiError } from '../types';
import { cn } from '../utils/cn';

interface ErrorMessageProps {
  error: ApiError | string | null;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onDismiss, className }) => {
  if (!error) return null;

  const isString = typeof error === 'string';
  const errCode = isString ? 'system_error' : error.error_code?.toLowerCase();
  const errMsg = isString ? error : error.message;
  const resourceId = !isString ? error.resource_id : null;
  const currentState = !isString ? error.current_state : null;
  const hint = !isString ? error.reconciliation_hint : null;

  const isSafetyConflict =
    errCode?.includes('premature') ||
    errCode?.includes('conflict') ||
    errCode?.includes('mismatch') ||
    errCode?.includes('failed');

  return (
    <div
      className={cn(
        'relative rounded-lg border p-3.5 text-xs transition-colors lowercase',
        isSafetyConflict
          ? 'border-amber-200 bg-amber-50/70 text-amber-900'
          : 'border-rose-200 bg-rose-50/70 text-rose-900',
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border mt-0.5',
            isSafetyConflict
              ? 'border-amber-200 bg-white text-amber-600'
              : 'border-rose-200 bg-white text-rose-600'
          )}
        >
          {isSafetyConflict ? <ShieldAlert className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
        </div>

        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'rounded px-1.5 py-0.5 font-mono text-[11px] font-medium border lowercase',
                isSafetyConflict
                  ? 'bg-amber-100/70 text-amber-800 border-amber-200'
                  : 'bg-rose-100/70 text-rose-800 border-rose-200'
              )}
            >
              {errCode}
            </span>
            {resourceId && (
              <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-600 border border-slate-200 lowercase">
                resource: <span className="font-semibold text-slate-800">{resourceId.toLowerCase()}</span>
              </span>
            )}
            {currentState && (
              <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-600 border border-slate-200 lowercase">
                state: <span className="font-semibold text-slate-800">{currentState.toLowerCase()}</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-700 leading-normal break-words lowercase">{errMsg.toLowerCase()}</p>

          {hint && (
            <div className="mt-2 flex items-start gap-1.5 rounded-md bg-white p-2 border border-amber-200 text-[11px] text-amber-800 lowercase">
              <ArrowRight className="h-3 w-3 shrink-0 mt-0.5 text-amber-600" />
              <span>
                <span className="font-medium">reconciliation requirement:</span> {hint.toLowerCase()}
              </span>
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
