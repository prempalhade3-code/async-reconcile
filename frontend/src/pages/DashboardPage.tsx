import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../services/api';
import { DashboardSummary } from '../types';
import { StatCard } from '../components/StatCard';
import { Timeline } from '../components/Timeline';
import { EmptyState } from '../components/EmptyState';
import { VerificationField } from '../components/VerificationField';
import {
  Play,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Activity,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningBenchmark, setRunningBenchmark] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const summary = await api.getDashboard();
      setData(summary);
    } catch (err: any) {
      console.error('failed to load dashboard:', err);
      toast.error('failed to load dashboard data', {
        description: (err.message || 'could not connect to backend.').toLowerCase(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRunBenchmark = async (mode: 'comparison' | 'asyncreconcile' | 'instant') => {
    const toastId = toast.loading(`running ${mode} benchmark suite...`, {
      description: 'evaluating scripted agent behaviors against state machine invariants.',
    });
    try {
      setRunningBenchmark(true);
      const runs = await api.triggerBenchmark(mode);
      await fetchDashboard();
      toast.success('benchmark suite completed', {
        id: toastId,
        description: `completed ${runs.length} evaluation run(s) across both modes.`,
      });
      navigate('/benchmark');
    } catch (err: any) {
      toast.error('benchmark run failed', {
        id: toastId,
        description: (err.message || 'error executing scenarios.').toLowerCase(),
      });
    } finally {
      setRunningBenchmark(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="py-24 text-center lowercase">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-mono text-slate-500 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
          <span>synthesizing telemetry & state machine summary...</span>
        </div>
      </div>
    );
  }

  const comparisonData = data
    ? [
        {
          metric: 'pass rate (%)',
          asyncreconcile: data.mode_comparison.asyncreconcile.avg_pass_rate,
          instant: data.mode_comparison.instant.avg_pass_rate,
        },
        {
          metric: 'unsafe closures blocked',
          asyncreconcile: data.mode_comparison.asyncreconcile.premature_closures_blocked,
          instant: data.mode_comparison.instant.premature_closures_blocked,
        },
        {
          metric: 'status polls executed',
          asyncreconcile: data.mode_comparison.asyncreconcile.total_status_checks,
          instant: data.mode_comparison.instant.total_status_checks,
        },
      ]
    : [];

  const overallPassRate =
    data && data.total_runs > 0
      ? Math.round((data.successful_runs / data.total_runs) * 100)
      : 0;

  return (
    <div className="space-y-7 lowercase pb-8">
      {/* Signature Top Visual Anchor: Living Verification Field */}
      <VerificationField
        data={data}
        onRunBenchmark={handleRunBenchmark}
        onNavigateTickets={() => navigate('/tickets')}
        onNavigateBenchmark={() => navigate('/benchmark')}
        runningBenchmark={runningBenchmark}
      />

      {/* Header & Direct Benchmark Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600" />
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 font-sans">
              system performance & state telemetry
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            evaluating asynchronous reconciliation vs premature instant closure in ai enterprise operations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/benchmark')}
            className="pressable inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
          >
            <span>inspect scenarios</span>
            <ArrowUpRight className="h-3 w-3 text-slate-400" />
          </button>
          <button
            onClick={() => handleRunBenchmark('comparison')}
            disabled={runningBenchmark}
            className="pressable inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition-all"
          >
            <Play className="h-3 w-3 fill-white" />
            <span>{runningBenchmark ? 'evaluating suite...' : 'run comparison'}</span>
          </button>
        </div>
      </div>

      {/* Primary Key Metric Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="benchmark pass rate"
            value={`${overallPassRate}%`}
            subtext={`${data.successful_runs} of ${data.total_runs} evaluation runs passed`}
            variant="info"
            badge="verified"
            onClick={() => navigate('/benchmark')}
          />

          <StatCard
            label="unsafe closures blocked"
            value={data.premature_closures_blocked}
            subtext={`out of ${data.premature_closure_attempts} unsafe attempts (http 409)`}
            variant="success"
            badge="protected"
          />

          <StatCard
            label="active operations in flight"
            value={data.pending_or_running_operations}
            subtext={`${data.total_operations} total lifetime operations logged`}
            variant="warning"
            onClick={() => navigate('/operations')}
          />

          <StatCard
            label="failed operations"
            value={data.failed_operations}
            subtext="downstream directory rejections handled safely"
            variant={data.failed_operations > 0 ? 'danger' : 'default'}
          />
        </div>
      )}

      {/* Main Grid: Protocol Comparison (Left) & Live Audit Activity (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Side-by-side mode comparison & Bar Chart (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Dual Protocol Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* asyncreconcile mode card */}
            <div className="surface-card relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-b from-indigo-50/40 to-white p-5 shadow-xs transition-all">
              <div className="flex items-center justify-between border-b border-indigo-100/70 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-semibold text-xs text-slate-900">
                    asyncreconcile mode
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300/80 shadow-2xs">
                  {data?.mode_comparison.asyncreconcile.avg_pass_rate}% pass
                </span>
              </div>

              <div className="mt-3.5 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100/60">
                  <span className="text-slate-500">runs evaluated:</span>
                  <span className="font-mono text-slate-900 font-semibold">
                    {data?.mode_comparison.asyncreconcile.count}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100/60">
                  <span className="text-slate-500">unsafe closures blocked:</span>
                  <span className="font-mono text-emerald-700 font-semibold">
                    {data?.mode_comparison.asyncreconcile.premature_closures_blocked} (100% safe)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">status reconciliation polls:</span>
                  <span className="font-mono text-indigo-700 font-semibold">
                    {data?.mode_comparison.asyncreconcile.total_status_checks}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-indigo-100/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>verification discipline</span>
                <span className="text-indigo-600 font-medium">active guard</span>
              </div>
            </div>

            {/* instant mode card */}
            <div className="surface-card relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/60 to-white p-5 shadow-xs transition-all">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-semibold text-xs text-slate-900">
                    instant mode (bypass)
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-rose-800 bg-rose-100/80 px-2.5 py-0.5 rounded-full border border-rose-300/80 shadow-2xs">
                  {data?.mode_comparison.instant.avg_pass_rate}% pass
                </span>
              </div>

              <div className="mt-3.5 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100/60">
                  <span className="text-slate-500">runs evaluated:</span>
                  <span className="font-mono text-slate-900 font-semibold">
                    {data?.mode_comparison.instant.count}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100/60">
                  <span className="text-slate-500">premature closures permitted:</span>
                  <span className="font-mono text-rose-700 font-semibold">
                    {data?.mode_comparison.instant.premature_closures_blocked === 0
                      ? 'unverified (unsafe)'
                      : `${data?.mode_comparison.instant.premature_closures_blocked} blocked`}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">status reconciliation polls:</span>
                  <span className="font-mono text-slate-700 font-semibold">
                    {data?.mode_comparison.instant.total_status_checks}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>verification discipline</span>
                <span className="text-rose-600 font-medium">unprotected</span>
              </div>
            </div>
          </div>

          {/* Recharts Empirical Bar Chart */}
          <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100/80 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
                  <BarChart3 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">
                    empirical mode comparison
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    direct evaluation across identical benchmark scenarios.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                sqlite records
              </span>
            </div>

            {data && data.total_runs > 0 ? (
              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="metric"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-lg backdrop-blur-md text-xs lowercase">
                              <p className="font-mono font-semibold text-slate-900 mb-1.5 border-b border-slate-100 pb-1">
                                {label}
                              </p>
                              {payload.map((entry, index) => (
                                <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
                                  <span className="flex items-center gap-1.5 text-slate-600">
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    {entry.name}:
                                  </span>
                                  <span className="font-mono font-semibold text-slate-900">
                                    {entry.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                      iconType="circle"
                    />
                    <Bar
                      dataKey="asyncreconcile"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                      name="asyncreconcile mode"
                    />
                    <Bar
                      dataKey="instant"
                      fill="#94a3b8"
                      radius={[4, 4, 0, 0]}
                      name="instant mode"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="no benchmark runs recorded"
                description="run the comparison suite to generate comparative empirical charts."
                action={{
                  label: 'run comparison suite',
                  onClick: () => handleRunBenchmark('comparison'),
                }}
              />
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity (5 Cols with internal scrollable feed) */}
        <div className="lg:col-span-5 surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100/80 pb-3 mb-3.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">
                    audit & safety event stream
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    append-only system event log & pre-flight checks.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/events')}
                className="pressable inline-flex items-center gap-1 rounded-lg border border-slate-200/70 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                <span>view all</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            {/* Scrollable feed */}
            <div className="max-h-[460px] overflow-y-auto pr-1">
              {data && data.recent_events.length > 0 ? (
                <Timeline events={data.recent_events.slice(0, 8)} />
              ) : (
                <EmptyState
                  title="no audit events yet"
                  description="events are generated as operations are dispatched, polled, and reconciled."
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
