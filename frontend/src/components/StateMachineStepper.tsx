import React from 'react';
import { OperationStatus } from '../types';
import { Clock, Loader2, CheckCircle2, XCircle, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'motion/react';

interface StateMachineStepperProps {
  status: OperationStatus;
  mode: 'instant' | 'asyncreconcile';
  errorDetails?: string | null;
  className?: string;
  compact?: boolean;
}

export const StateMachineStepper: React.FC<StateMachineStepperProps> = ({
  status,
  mode,
  errorDetails,
  className,
  compact = false,
}) => {
  const isPending = status === 'pending';
  const isRunning = status === 'running';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  // Step indices: 0 = pending, 1 = running, 2 = terminal
  const currentStep = isPending ? 0 : isRunning ? 1 : 2;

  const steps = [
    {
      num: '01',
      id: 'pending',
      title: 'request accepted',
      subtitle: 'queued in broker',
      stateDesc: 'downstream directory untouched · early resolution blocked',
      active: isPending,
      done: isRunning || isCompleted || isFailed,
      icon: Clock,
      color: 'amber',
    },
    {
      num: '02',
      id: 'running',
      title: 'state reconciliation',
      subtitle: 'in-flight execution',
      stateDesc: 'polling worker alive · 409 guard active',
      active: isRunning,
      done: isCompleted || isFailed,
      icon: Loader2,
      color: 'sky',
    },
    {
      num: '03',
      id: 'terminal',
      title: isFailed ? 'execution rejected' : 'account verified',
      subtitle: isFailed ? 'downstream failure' : 'state reconciled',
      stateDesc: isCompleted
        ? 'pre-flight verified · ticket safe to close'
        : isFailed
        ? 'directory error logged · ticket close rejected'
        : 'awaiting terminal convergence',
      active: isCompleted || isFailed,
      done: isCompleted || isFailed,
      icon: isFailed ? XCircle : CheckCircle2,
      color: isFailed ? 'rose' : 'emerald',
    },
  ];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-xs backdrop-blur-md lowercase transition-all',
        className
      )}
    >
      {/* Decorative subtle ambient gradient glow */}
      <div
        className={cn(
          'pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full blur-3xl transition-opacity duration-700',
          isPending && 'bg-amber-100/60 opacity-80',
          isRunning && 'bg-sky-100/70 opacity-90',
          isCompleted && 'bg-emerald-100/60 opacity-80',
          isFailed && 'bg-rose-100/60 opacity-80'
        )}
      />

      {/* Header Bar */}
      <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/70 bg-slate-50/80 text-slate-700 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div>
            <h4 className="font-mono text-xs font-semibold tracking-tight text-slate-900 lowercase">
              verification state pipeline
            </h4>
            <p className="text-[11px] text-slate-500 lowercase">
              {mode === 'instant'
                ? 'instant mode: synchronous single-step bypass (unverified)'
                : 'asyncreconcile mode: multi-step state verification protocol'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium border shadow-2xs lowercase',
              mode === 'asyncreconcile'
                ? 'border-indigo-200/80 bg-indigo-50/70 text-indigo-700'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                mode === 'asyncreconcile' ? 'bg-indigo-500' : 'bg-slate-400'
              )}
            />
            protocol: {mode}
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            step {currentStep + 1} of 3
          </span>
        </div>
      </div>

      {/* Pipeline Steps Grid with traveling connector line */}
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Connection rail on desktop */}
        <div className="hidden md:block absolute top-7 left-12 right-12 h-0.5 z-0">
          <svg className="w-full h-2 overflow-visible" preserveAspectRatio="none">
            <line
              x1="0%"
              y1="50%"
              x2="100%"
              y2="50%"
              stroke="#e2e8f0"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            {/* Animated active beam */}
            {(isPending || isRunning) && (
              <line
                x1="0%"
                y1="50%"
                x2={isPending ? '50%' : '100%'}
                y2="50%"
                stroke="url(#stepperSignalGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="animate-signal-flow"
              />
            )}
            <defs>
              <linearGradient id="stepperSignalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#0ea5e9" stopOpacity="1" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isNodeActive = step.active;
          const isNodeDone = step.done && !step.active;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
              className={cn(
                'relative z-10 flex flex-col justify-between rounded-xl border p-3.5 transition-all duration-200',
                isNodeActive
                  ? step.color === 'amber'
                    ? 'border-amber-300/90 bg-amber-50/50 shadow-xs ring-2 ring-amber-200/40'
                    : step.color === 'sky'
                    ? 'border-sky-300/90 bg-sky-50/50 shadow-xs ring-2 ring-sky-200/40'
                    : step.color === 'rose'
                    ? 'border-rose-300/90 bg-rose-50/50 shadow-xs ring-2 ring-rose-200/40'
                    : 'border-emerald-300/90 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-200/40'
                  : isNodeDone
                  ? 'border-slate-200/80 bg-slate-50/60'
                  : 'border-slate-200/50 bg-slate-50/20 opacity-60'
              )}
            >
              <div>
                {/* Node Top Row: Badge & Status Pill */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg border font-mono text-xs font-semibold shadow-2xs transition-all',
                      isNodeActive
                        ? step.color === 'amber'
                          ? 'border-amber-300 bg-amber-100 text-amber-900 animate-breathe'
                          : step.color === 'sky'
                          ? 'border-sky-300 bg-sky-100 text-sky-900 animate-breathe'
                          : step.color === 'rose'
                          ? 'border-rose-300 bg-rose-100 text-rose-900'
                          : 'border-emerald-300 bg-emerald-100 text-emerald-900'
                        : isNodeDone
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-400'
                    )}
                  >
                    {isNodeDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : isNodeActive && step.id === 'running' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-sky-700" />
                    ) : (
                      <StepIcon className="h-4 w-4" />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-slate-400">
                      {step.num}
                    </span>
                    {isNodeActive && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider border shadow-2xs',
                          step.color === 'amber'
                            ? 'border-amber-300/70 bg-amber-100/90 text-amber-900'
                            : step.color === 'sky'
                            ? 'border-sky-300/70 bg-sky-100/90 text-sky-900'
                            : step.color === 'rose'
                            ? 'border-rose-300/70 bg-rose-100/90 text-rose-900'
                            : 'border-emerald-300/70 bg-emerald-100/90 text-emerald-900'
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                        active
                      </span>
                    )}
                    {isNodeDone && (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50/80 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-700">
                        cleared
                      </span>
                    )}
                  </div>
                </div>

                {/* Step Titles */}
                <h5 className="font-medium text-xs text-slate-900 tracking-tight lowercase">
                  {step.title}
                </h5>
                <p className="text-[11px] font-medium text-slate-500 lowercase mt-0.5">
                  {step.subtitle}
                </p>
              </div>

              {/* Step Explanatory Footnote */}
              {!compact && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/50">
                  <p className="text-[10px] text-slate-500 leading-relaxed font-mono lowercase">
                    {step.stateDesc}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Safety Gate Alert when Failed */}
      {isFailed && errorDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200/90 bg-rose-50/70 p-3.5 text-xs text-rose-900 shadow-2xs lowercase"
        >
          <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="min-w-0">
            <span className="font-semibold font-mono text-rose-950">
              verification gate rejected ticket resolution:{' '}
            </span>
            <span className="font-mono text-rose-800">{errorDetails.toLowerCase()}</span>
          </div>
        </motion.div>
      )}

      {/* Informative footer explaining the safety mechanism */}
      {!compact && (
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50/80 px-3 py-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
            <span className="font-medium text-slate-700">safety invariant:</span> ticket resolution triggers pre-flight check on downstream directory.
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            premature resolve &rarr; HTTP 409 conflict
          </span>
        </div>
      )}
    </div>
  );
};
