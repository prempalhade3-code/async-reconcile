import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Cpu,
  BarChart3,
  ListTree,
  Play,
  RotateCcw,
  Menu,
  X,
  ShieldCheck,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { api } from '../services/api';
import { cn } from '../utils/cn';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) setBackendOnline(true);
      else setBackendOnline(false);
    } catch {
      setBackendOnline(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/', label: 'overview', icon: LayoutDashboard },
    { to: '/tickets', label: 'support tickets', icon: Ticket },
    { to: '/operations', label: 'operations', icon: Cpu },
    { to: '/benchmark', label: 'benchmark runs', icon: BarChart3 },
    { to: '/events', label: 'audit stream', icon: ListTree },
  ];

  const handleResetDemo = async () => {
    if (!window.confirm('reset demo data and restore initial accounts and tickets?')) return;
    try {
      setResetting(true);
      await api.resetDemoData();
      toast.success('demo environment reset', {
        description: 'all accounts and tickets restored to clean initial state.',
      });
      setTimeout(() => window.location.reload(), 300);
    } catch (err: any) {
      toast.error('failed to reset demo data', {
        description: (err.message || 'an error occurred.').toLowerCase(),
      });
    } finally {
      setResetting(false);
    }
  };

  const handleQuickBenchmark = async () => {
    const toastId = toast.loading('running comparison suite...', {
      description: 'evaluating scenarios across instant and asyncreconcile modes.',
    });
    try {
      const runs = await api.triggerBenchmark('comparison');
      const asyncRun = runs.find((r) => r.mode === 'asyncreconcile');
      const instantRun = runs.find((r) => r.mode === 'instant');
      toast.success('benchmark comparison finished', {
        id: toastId,
        description: `asyncreconcile: ${asyncRun?.pass_rate}% | instant: ${instantRun?.pass_rate}%.`,
      });
      navigate('/benchmark');
    } catch (err: any) {
      toast.error('benchmark run failed', {
        id: toastId,
        description: (err.message || 'error executing scenarios.').toLowerCase(),
      });
    }
  };

  // Get current breadcrumb label
  const getCurrentSection = () => {
    const path = location.pathname;
    if (path === '/') return 'system overview';
    if (path.startsWith('/tickets/')) return 'support tickets / inspection';
    if (path === '/tickets') return 'support tickets';
    if (path.startsWith('/operations/')) return 'operations / lifecycle';
    if (path === '/operations') return 'asynchronous operations';
    if (path === '/benchmark') return 'benchmark evaluation studio';
    if (path === '/events') return 'audit & event stream';
    return 'asyncreconcile';
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#fbfbfe] text-slate-900 font-sans antialiased lowercase selection:bg-indigo-100 selection:text-indigo-950">
      <Toaster position="bottom-right" theme="light" richColors closeButton />

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex w-64 flex-col justify-between border-r border-slate-200/80 bg-white/80 backdrop-blur-xl shrink-0 z-20">
        <div>
          {/* Brand & Connection Status */}
          <div className="p-5 border-b border-slate-100/90 space-y-2.5">
            <NavLink to="/" className="flex items-center gap-2.5 group">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-sky-500 p-0.5 shadow-xs shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <div className="h-full w-full rounded-[10px] bg-white/95 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <div>
                <span className="font-mono text-sm font-semibold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                  asyncreconcile
                </span>
                <p className="text-[10px] font-mono text-slate-400">
                  verification protocol
                </p>
              </div>
            </NavLink>

            {/* Connection Status Pill */}
            <div className="pt-1 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/80 px-2.5 py-1 text-[11px] font-mono text-slate-600 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  {backendOnline === true && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={cn(
                      'relative inline-flex h-2 w-2 rounded-full',
                      backendOnline === true
                        ? 'bg-emerald-500'
                        : backendOnline === false
                        ? 'bg-rose-500'
                        : 'bg-amber-400'
                    )}
                  />
                </span>
                <span>
                  {backendOnline === true
                    ? 'mesh online'
                    : backendOnline === false
                    ? 'service offline'
                    : 'connecting...'}
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">8000</span>
            </div>
          </div>

          {/* Primary Navigation */}
          <nav className="p-3.5 space-y-1">
            {navItems.map((item) => {
              const ItemIcon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150',
                      isActive
                        ? 'bg-indigo-50/70 text-indigo-950 font-semibold shadow-2xs border border-indigo-100/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <ItemIcon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-indigo-600'
                            : 'text-slate-400 group-hover:text-slate-600'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Secondary Actions */}
        <div className="p-4 border-t border-slate-100/90 space-y-3 bg-slate-50/50">
          <button
            onClick={handleResetDemo}
            disabled={resetting}
            title="reset demo data and restore initial accounts and tickets"
            className="pressable w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-all shadow-2xs"
          >
            <RotateCcw className={cn('h-3.5 w-3.5 text-slate-500', resetting && 'animate-spin')} />
            <span>{resetting ? 'resetting data...' : 'reset demo data'}</span>
          </button>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              sqlite persistence
            </span>
            <span>v1.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#fbfbfe]">
        {/* Top App Header Strip */}
        <header className="h-14 border-b border-slate-200/80 px-6 lg:px-8 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            {/* Breadcrumb Section Context */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-slate-400 hidden sm:inline">
                asyncreconcile /
              </span>
              <span className="font-medium text-slate-900 tracking-tight">
                {getCurrentSection()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleQuickBenchmark}
              className="pressable inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-slate-800 transition-all"
            >
              <Play className="h-3 w-3 fill-white" />
              <span>run comparison</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 py-3 space-y-1 z-30 shadow-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-2 rounded-lg text-sm',
                    isActive
                      ? 'bg-indigo-50 text-indigo-950 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleResetDemo();
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                reset demo data
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-7 2xl:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
