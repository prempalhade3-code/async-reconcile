import React, { useEffect, useState } from 'react';
import { BenchmarkRun, ScenarioResult, AgentActionLog } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import {
  Play,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export const BenchmarkRunsPage: React.FC = () => {
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<BenchmarkRun | null>(null);
  const [selectedScenarios, setSelectedScenarios] = useState<ScenarioResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [runMode, setRunMode] = useState<'comparison' | 'asyncreconcile' | 'instant'>('comparison');
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const data = await api.getBenchmarkRuns();
      setRuns(data);
      if (data.length > 0) {
        setSelectedRun(data[0]);
        try {
          setSelectedScenarios(JSON.parse(data[0].details_json));
        } catch {
          setSelectedScenarios([]);
        }
      }
    } catch (err: any) {
      console.error('failed to load benchmark runs:', err);
      toast.error('failed to load runs', {
        description: (err.message || 'error loading benchmark data.').toLowerCase(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleRunBenchmark = async () => {
    const toastId = toast.loading(`running ${runMode} benchmark suite...`, {
      description: 'evaluating scripted agent behaviors against state machine invariants.',
    });
    try {
      setExecuting(true);
      const newRuns = await api.triggerBenchmark(runMode);
      await fetchRuns();
      if (newRuns.length > 0) {
        setSelectedRun(newRuns[0]);
        setSelectedScenarios(JSON.parse(newRuns[0].details_json));
      }
      toast.success('benchmark suite completed', {
        id: toastId,
        description: `run ${newRuns[0]?.id.toLowerCase()} recorded: ${newRuns[0]?.pass_rate}% pass rate.`,
      });
    } catch (err: any) {
      toast.error('benchmark run failed', {
        id: toastId,
        description: (err.message || 'error executing scenarios.').toLowerCase(),
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleSelectRun = (run: BenchmarkRun) => {
    setSelectedRun(run);
    try {
      setSelectedScenarios(JSON.parse(run.details_json));
      setExpandedScenarioId(null);
    } catch {
      setSelectedScenarios([]);
    }
  };

  const toggleExpandScenario = (id: string) => {
    setExpandedScenarioId(expandedScenarioId === id ? null : id);
  };

  return (
    <div className="space-y-6 lowercase pb-10">
      {/* Page Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600" />
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 font-sans">
              benchmark evaluation studio
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            empirical evaluation of agent verification discipline across instant and asyncreconcile modes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={runMode}
            onChange={(e) => setRunMode(e.target.value as any)}
            className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs text-slate-700 focus:border-indigo-400 focus:outline-hidden font-mono shadow-2xs cursor-pointer"
          >
            <option value="comparison">comparison (dual suite)</option>
            <option value="asyncreconcile">asyncreconcile only</option>
            <option value="instant">instant only</option>
          </select>

          <button
            onClick={handleRunBenchmark}
            disabled={executing}
            className="pressable inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition-all"
          >
            <Play className="h-3 w-3 fill-white" />
            <span>{executing ? 'running suite...' : 'run evaluation suite'}</span>
          </button>
        </div>
      </div>

      {/* Selected Run Metrics Strip */}
      {selectedRun && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Pass Rate */}
          <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-medium">pass rate</div>
            <div
              className={`mt-1 text-2xl font-bold font-mono tabular-nums ${
                selectedRun.pass_rate >= 80 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {selectedRun.pass_rate}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              {selectedRun.passed_scenarios} of {selectedRun.total_scenarios} passed
            </div>
          </div>

          {/* Mode */}
          <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-medium">protocol mode</div>
            <div className="mt-1 text-sm font-semibold font-mono text-slate-900">
              {selectedRun.mode.toLowerCase()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {selectedRun.mode === 'asyncreconcile' ? 'verified staged' : 'unverified instant'}
            </div>
          </div>

          {/* Closures Blocked */}
          <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-medium">unsafe closures caught</div>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              {selectedRun.premature_closures_blocked}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">http 409 guard active</div>
          </div>

          {/* Failures Handled */}
          <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-medium">failures detected</div>
            <div className="mt-1 text-2xl font-bold font-mono text-slate-800 tabular-nums">
              {selectedRun.failed_operations_handled}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">directory rejections caught</div>
          </div>

          {/* Mismatches Blocked */}
          <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-medium">mismatches rejected</div>
            <div className="mt-1 text-2xl font-bold font-mono text-slate-800 tabular-nums">
              {selectedRun.incorrect_resolutions_rejected}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">target account checks</div>
          </div>

          {/* Status Queries */}
          <div className="surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-medium">status polls executed</div>
            <div className="mt-1 text-2xl font-bold font-mono text-indigo-700 tabular-nums">
              {selectedRun.total_status_checks}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">defensive queries</div>
          </div>
        </div>
      )}

      {/* Two-Column Master Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Historical Runs (4 cols) */}
        <div className="lg:col-span-4 surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-4 space-y-3 shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100/80 pb-2.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-semibold text-slate-900">
                historical runs ({runs.length})
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              sqlite
            </span>
          </div>

          {runs.length === 0 ? (
            <p className="text-xs font-mono text-slate-400 py-12 text-center">
              no evaluation runs recorded yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {runs.map((r) => {
                const isSelected = selectedRun?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRun(r)}
                    className={`pressable rounded-xl border p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-300 bg-indigo-50/60 font-semibold ring-2 ring-indigo-200/40 shadow-2xs'
                        : 'border-slate-200/70 bg-white hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {r.id.toLowerCase()}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          r.mode === 'asyncreconcile'
                            ? 'bg-indigo-100/80 border-indigo-200 text-indigo-800'
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        {r.mode.toLowerCase()}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <span
                        className={`font-mono font-bold ${
                          r.pass_rate >= 80 ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {r.pass_rate}% pass rate
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(r.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Scenarios & Action Trace (8 cols) */}
        <div className="lg:col-span-8 surface-card rounded-2xl border border-slate-200/80 bg-white/95 p-6 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100/80 pb-3.5 gap-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 font-mono">
                scenario trace: {selectedRun ? selectedRun.id.toLowerCase() : 'none'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                inspect chronological agent actions, status queries, and invariant checks.
              </p>
            </div>
            {selectedRun && (
              <span className="font-mono text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                {selectedScenarios.length} scenarios evaluated
              </span>
            )}
          </div>

          {selectedScenarios.length === 0 ? (
            <EmptyState
              title="no scenarios loaded"
              description="select a run from the left panel to inspect scenario details."
              icon={FlaskConical}
            />
          ) : (
            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
              {selectedScenarios.map((sc) => {
                const isExpanded = expandedScenarioId === sc.scenario_id;
                return (
                  <div
                    key={sc.scenario_id}
                    className="rounded-xl border border-slate-200/80 bg-white overflow-hidden transition-all shadow-2xs hover:border-slate-300"
                  >
                    {/* Scenario Summary Row */}
                    <div
                      onClick={() => toggleExpandScenario(sc.scenario_id)}
                      className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 shrink-0">
                          {sc.passed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-600" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {sc.scenario_id.toLowerCase()}
                            </span>
                            <span className="text-xs font-semibold text-slate-900 truncate">
                              {sc.name.toLowerCase()}
                            </span>
                            <span
                              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                                sc.passed
                                  ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
                                  : 'bg-rose-100/90 text-rose-800 border-rose-300'
                              }`}
                            >
                              {sc.passed ? 'passed' : 'failed'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 line-clamp-1 font-sans">
                            {sc.description.toLowerCase()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {sc.actions.length} actions
                        </span>
                        <button className="text-slate-400 hover:text-slate-600">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Action Details */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/40 p-4 space-y-3.5">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs space-y-2 text-slate-600 shadow-2xs">
                          <div className="flex justify-between py-1 border-b border-slate-100/60">
                            <span className="text-slate-400">expected outcome:</span>
                            <span className="font-mono text-slate-800 font-medium">
                              {sc.expected_outcome.toLowerCase()}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100/60">
                            <span className="text-slate-400">actual outcome:</span>
                            <span className="font-mono font-semibold text-slate-900">
                              {sc.actual_outcome.toLowerCase()}
                            </span>
                          </div>
                          <div className="pt-1.5 text-xs text-slate-700 leading-relaxed font-sans">
                            <span className="font-semibold text-slate-900">
                              evaluation explanation:{' '}
                            </span>
                            {sc.explanation.toLowerCase()}
                          </div>
                        </div>

                        {/* Chronological Actions Table */}
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                          <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-600 font-mono">
                            chronological agent actions & safety checks
                          </div>
                          <div className="divide-y divide-slate-100 text-xs">
                            {sc.actions.map((act) => (
                              <div key={act.step} className="p-3.5 flex items-start gap-3">
                                <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  #{act.step}
                                </span>
                                <div className="flex-1 space-y-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-slate-900 font-mono">
                                      {act.action_name.toLowerCase()}
                                    </span>
                                    {act.target_id && (
                                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[10px] text-indigo-700 border border-indigo-100 font-medium">
                                        {act.target_id.toLowerCase()}
                                      </span>
                                    )}
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold border ${
                                        act.status === 'success'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : act.status === 'rejected'
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : 'bg-rose-50 text-rose-700 border-rose-200'
                                      }`}
                                    >
                                      {act.status.toLowerCase()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                                    {act.details.toLowerCase()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
