import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Play, ArrowRight, Activity, Clock, Lock, Sparkles } from 'lucide-react';
import { DashboardSummary } from '../types';
import { cn } from '../utils/cn';

interface VerificationFieldProps {
  data: DashboardSummary | null;
  onRunBenchmark: (mode: 'comparison') => void;
  onNavigateTickets: () => void;
  onNavigateBenchmark: () => void;
  runningBenchmark: boolean;
}

export const VerificationField: React.FC<VerificationFieldProps> = ({
  data,
  onRunBenchmark,
  onNavigateTickets,
  onNavigateBenchmark,
  runningBenchmark,
}) => {
  const activeOps = data?.pending_or_running_operations ?? 0;
  const blockedClosures = data?.premature_closures_blocked ?? 0;
  const passRate = data?.mode_comparison?.asyncreconcile?.avg_pass_rate ?? 100;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs lowercase">
      {/* Ambient Atmospheric Mesh & Topological Wave Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/40 pointer-events-none" />
      
      {/* SVG Wave Contours & Flowing Spline */}
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none opacity-40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="splineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="contourGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Topographic organic curves */}
        <path
          d="M -100 80 Q 200 -20 600 60 T 1400 30"
          fill="none"
          stroke="url(#contourGradient)"
          strokeWidth="1.5"
        />
        <path
          d="M -100 130 Q 300 40 750 110 T 1500 80"
          fill="none"
          stroke="url(#contourGradient)"
          strokeWidth="1.2"
        />
        <path
          d="M -100 180 Q 250 120 700 160 T 1500 140"
          fill="none"
          stroke="url(#contourGradient)"
          strokeWidth="1"
        />

        {/* Verification connecting beam */}
        <path
          d="M 120 140 C 260 140, 340 70, 520 70 S 760 140, 960 140"
          fill="none"
          stroke="url(#splineGradient)"
          strokeWidth="2"
          className="animate-signal-flow"
        />
      </svg>

      {/* Main Content Grid */}
      <div className="relative z-10 p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        {/* Left Column: Brand Thesis & Status */}
        <div className="max-w-xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3 py-1 text-xs font-mono text-indigo-900 shadow-2xs backdrop-blur-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
            </span>
            <span>living system · verification engine</span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-slate-950 leading-snug">
            accepting an operation is not completion.
            <span className="block text-slate-500 font-normal text-lg lg:text-xl mt-1">
              verify downstream state before dependent resolution.
            </span>
          </h1>

          <p className="text-xs lg:text-sm text-slate-600 leading-relaxed font-sans">
            real enterprise systems process deprovisioning asynchronously. asyncreconcile protects workflows by requiring status polling, state reconciliation, and http 409 invariant enforcement.
          </p>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onRunBenchmark('comparison')}
              disabled={runningBenchmark}
              className="pressable inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-900 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{runningBenchmark ? 'evaluating suite...' : 'run comparison suite'}</span>
            </button>

            <button
              onClick={onNavigateTickets}
              className="pressable inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white/90 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              <span>inspect tickets</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Right Column: 3 Living Verification Nodes */}
        <div className="shrink-0 w-full lg:w-auto">
          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-md space-y-3.5 min-w-[320px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-medium text-slate-900 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-indigo-600" />
                <span>invariant verification pipeline</span>
              </span>
              <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                active guard
              </span>
            </div>

            {/* 3 Physical-like Interconnected Stages */}
            <div className="space-y-2.5 text-xs font-mono">
              {/* Stage 1: Accepted & Queued */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-200/60">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-slate-700">1. request accepted</span>
                </div>
                <span className="text-slate-500 text-[11px]">
                  {activeOps > 0 ? `${activeOps} in-flight` : 'idle'}
                </span>
              </div>

              {/* Stage 2: Reconciling Directory */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-200/60">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-sky-500" />
                  <span className="text-slate-700">2. state reconciliation</span>
                </div>
                <span className="text-sky-700 text-[11px]">virtual steps #0→#2</span>
              </div>

              {/* Stage 3: Invariant Gate */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/70 border border-emerald-200/70 text-emerald-900">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="font-medium">3. 409 conflict gate</span>
                </div>
                <span className="text-emerald-700 text-[11px] font-semibold">
                  {blockedClosures} blocked
                </span>
              </div>
            </div>

            {/* Live Telemetry Footer */}
            <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-100">
              <span>pass rate: <strong className="text-slate-900">{passRate}%</strong></span>
              <button
                onClick={onNavigateBenchmark}
                className="text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1"
              >
                <span>runs trace</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
