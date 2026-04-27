import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

// ── Types ───────────────────────────────────────────────────────────────────

interface SummaryData {
  totalCards: number;
  completedRecently: number;
  updatedRecently: number;
  createdRecently: number;
  dueSoon: number;
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  recentActivity: {
    cardId: string;
    title: string;
    columnName: string;
    author: { id: string; name: string };
    updatedAt: string;
    createdAt: string;
  }[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  'To Do': '#6b7280',
  'In Progress': '#eab308',
  'Done': '#34d399',
  'Backlog': '#9ca3af',
  'Review': '#a855f7',
};

function getStatusColor(name: string): string {
  if (STATUS_COLORS[name]) return STATUS_COLORS[name];
  const lower = name.toLowerCase();
  if (lower.includes('done') || lower.includes('complete')) return '#34d399';
  if (lower.includes('progress') || lower.includes('doing')) return '#eab308';
  if (lower.includes('review')) return '#a855f7';
  if (lower.includes('todo') || lower.includes('backlog')) return '#6b7280';
  return '#6366f1';
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  none: '#4b5563',
};

const TYPE_COLORS: Record<string, string> = {
  task: '#3b82f6',
  story: '#22c55e',
  bug: '#ef4444',
  subtask: '#06b6d4',
};

function formatTimeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Component ───────────────────────────────────────────────────────────────

export function WorkspaceSummaryPage({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation('board');
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    api.get<SummaryData>(`/workspaces/${workspaceId}/summary`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[110px] rounded-xl bg-bg-card border border-border-subtle animate-[pulse_1.5s_ease_infinite]" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="h-[280px] rounded-xl bg-bg-card border border-border-subtle animate-[pulse_1.5s_ease_infinite]" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-8 gap-3 animate-fade-in">
        <p className="text-text-muted">{t('summary.unableToLoad')}</p>
      </div>
    );
  }

  // Build donut chart
  const statusEntries = Object.entries(data.statusCounts);
  const totalStatus = statusEntries.reduce((sum, [, c]) => sum + c, 0);
  let cumulativePercent = 0;
  const conicStops = statusEntries.map(([name, count]) => {
    const start = cumulativePercent;
    const pct = totalStatus > 0 ? (count / totalStatus) * 100 : 0;
    cumulativePercent += pct;
    return `${getStatusColor(name)} ${start}% ${cumulativePercent}%`;
  });
  const conicGradient = totalStatus > 0
    ? `conic-gradient(${conicStops.join(', ')})`
    : 'conic-gradient(#2a2a2e 0% 100%)';

  // Priority bar
  const priorityEntries = Object.entries(data.priorityCounts).filter(([, c]) => c > 0);
  const totalPriority = priorityEntries.reduce((sum, [, c]) => sum + c, 0);

  // Type bar
  const typeEntries = Object.entries(data.typeCounts).filter(([, c]) => c > 0);
  const totalType = typeEntries.reduce((sum, [, c]) => sum + c, 0);

  const statCards = [
    { label: t('summary.completed7d'), value: data.completedRecently, gradient: 'from-emerald-500/10 to-emerald-500/5' },
    { label: t('summary.updated7d'), value: data.updatedRecently, gradient: 'from-amber-500/10 to-amber-500/5' },
    { label: t('summary.created7d'), value: data.createdRecently, gradient: 'from-blue-500/10 to-blue-500/5' },
    { label: t('summary.dueSoon'), value: data.dueSoon, gradient: 'from-red-500/10 to-red-500/5' },
  ];

  return (
    <div className="p-6 animate-fade-in">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <div key={i} className={`rounded-xl bg-gradient-to-br ${s.gradient} border border-border-subtle p-5 flex flex-col gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg`}>
            <span className="text-[0.75rem] font-semibold text-text-muted uppercase tracking-wide">{s.label}</span>
            <span className="text-[1.8rem] font-bold text-text-primary leading-none">{s.value}</span>
            <span className="text-[0.7rem] text-text-muted">{t('summary.ofTotalCards', { count: data.totalCards })}</span>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Status Overview — Donut Chart */}
        <div className="rounded-xl bg-bg-card border border-border-subtle p-5">
          <h3 className="text-[0.85rem] font-semibold text-text-primary mb-5 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            {t('summary.statusOverview')}
          </h3>
          <div className="flex items-center gap-6">
            {/* Donut */}
            <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
              <div
                className="w-full h-full rounded-full"
                style={{ background: conicGradient }}
              />
              <div className="absolute inset-[25%] rounded-full bg-bg-card flex items-center justify-center flex-col">
                <span className="text-[1.4rem] font-bold text-text-primary leading-none">{totalStatus}</span>
                <span className="text-[0.6rem] text-text-muted mt-0.5">{t('summary.total')}</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-col gap-2 flex-1">
              {statusEntries.map(([name, count]) => (
                <div key={name} className="flex items-center gap-2 text-[0.8rem]">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: getStatusColor(name) }} />
                  <span className="flex-1 text-text-secondary">{name}</span>
                  <span className="text-text-primary font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl bg-bg-card border border-border-subtle p-5">
          <h3 className="text-[0.85rem] font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
            {t('summary.recentActivity')}
          </h3>
          <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1">
            {data.recentActivity.length === 0 ? (
              <p className="text-[0.8rem] text-text-muted italic py-4 text-center">{t('summary.noRecentActivity')}</p>
            ) : (
              data.recentActivity.map((item) => (
                <div key={item.cardId} className="flex items-start gap-2.5 py-2 px-2 rounded-md hover:bg-white/[0.12] transition-colors">
                  <div className="w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center text-[0.55rem] font-bold text-accent-light shrink-0 mt-0.5">
                    {item.author.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8rem] text-text-primary truncate font-medium leading-tight">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[0.7rem] text-text-muted">{item.author.name}</span>
                      <span className="text-text-muted text-[0.55rem]">·</span>
                      <span className="text-[0.65rem] text-text-muted">{item.columnName}</span>
                      <span className="text-text-muted text-[0.55rem]">·</span>
                      <span className="text-[0.65rem] text-text-muted">{formatTimeAgo(item.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="rounded-xl bg-bg-card border border-border-subtle p-5">
          <h3 className="text-[0.85rem] font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            {t('summary.priorityBreakdown')}
          </h3>
          <div className="flex flex-col gap-3">
            {priorityEntries.length === 0 ? (
              <p className="text-[0.8rem] text-text-muted italic py-4 text-center">{t('summary.noCardsYet')}</p>
            ) : (
              priorityEntries.map(([priority, count]) => {
                const pct = totalPriority > 0 ? (count / totalPriority) * 100 : 0;
                return (
                  <div key={priority} className="flex items-center gap-3">
                    <span className="w-[60px] text-[0.75rem] text-text-secondary capitalize shrink-0">{priority}</span>
                    <div className="flex-1 h-[10px] rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: PRIORITY_COLORS[priority] ?? '#6b7280' }}
                      />
                    </div>
                    <span className="text-[0.75rem] font-semibold text-text-primary w-[28px] text-right">{count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Types of Work */}
        <div className="rounded-xl bg-bg-card border border-border-subtle p-5">
          <h3 className="text-[0.85rem] font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 12l2 2 4-4" /></svg>
            {t('summary.typesOfWork')}
          </h3>
          <div className="flex flex-col gap-3">
            {typeEntries.length === 0 ? (
              <p className="text-[0.8rem] text-text-muted italic py-4 text-center">{t('summary.noCardsYet')}</p>
            ) : (
              typeEntries.map(([type, count]) => {
                const pct = totalType > 0 ? (count / totalType) * 100 : 0;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="w-[60px] text-[0.75rem] text-text-secondary capitalize shrink-0">{type}</span>
                    <div className="flex-1 h-[10px] rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: TYPE_COLORS[type] ?? '#6b7280' }}
                      />
                    </div>
                    <span className="text-[0.75rem] text-text-muted w-[40px] text-right">{Math.round(pct)}%</span>
                    <span className="text-[0.75rem] font-semibold text-text-primary w-[28px] text-right">{count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
