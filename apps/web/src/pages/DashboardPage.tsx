import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { Modal } from '../components/Modal';
import { api, ApiError } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  locked?: boolean;
  _count?: { boards: number };
  memberships?: { role: string; userId: string }[];
}

interface Limits {
  tier: string;
  limits: { workspaces: number; boardsPerWorkspace: number; scrum: boolean; aiChat: boolean };
  usage: { workspaces: number };
}

interface DashboardStats {
  totalBoards: number;
  totalCards: number;
  completedCards: number;
  overdueCards: number;
  recentBoards: { id: string; name: string; workspaceId: string; workspaceName: string; cardCount: number; updatedAt: string }[];
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color, delay }: { icon: React.ReactNode; label: string; value: string | number; color: string; delay: number }) {
  return (
    <div
      className="bg-bg-card border border-border-subtle rounded-xl p-5 flex items-center gap-4 animate-fade-in hover:bg-bg-card-hover transition-colors"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[1.4rem] font-bold text-text-primary leading-none mb-1">{value}</p>
        <p className="text-[0.75rem] text-text-muted font-medium">{label}</p>
      </div>
    </div>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const dbUser = useAuthStore((s) => s.dbUser);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [data, lim] = await Promise.all([
        api.get<Workspace[]>('/workspaces'),
        api.get<Limits>('/workspaces/limits'),
      ]);
      setWorkspaces(data);
      setLimits(lim);

      // Aggregate dashboard stats from workspace summaries
      let totalBoards = 0;
      let totalCards = 0;
      let completedCards = 0;
      let overdueCards = 0;
      const recentBoards: DashboardStats['recentBoards'] = [];

      for (const ws of data) {
        totalBoards += ws._count?.boards ?? 0;
        try {
          const summary = await api.get<{ totalCards?: number; completedRecently?: number; dueSoon?: number }>(`/workspaces/${ws.id}/summary`);
          totalCards += summary.totalCards ?? 0;
          completedCards += summary.completedRecently ?? 0;
          overdueCards += summary.dueSoon ?? 0;
        } catch {
          // workspace might not have boards yet
        }
      }

      setStats({ totalBoards, totalCards, completedCards, overdueCards, recentBoards });
    } catch {
      /* API not connected — show empty state */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const atWorkspaceLimit = limits ? workspaces.length >= limits.limits.workspaces : false;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await api.post('/workspaces', { name: createName, slug: createSlug });
      setShowCreate(false);
      setCreateName('');
      setCreateSlug('');
      fetchData();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : tc('errors.somethingWentWrong'));
    } finally {
      setCreating(false);
    }
  };

  const autoSlug = (name: string) => {
    setCreateName(name);
    setCreateSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting.morning');
    if (hour < 17) return t('greeting.afternoon');
    return t('greeting.evening');
  })();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
        <TopNav
          title={t('title')}
          subtitle={`${workspaces.length}${limits ? `/${limits.limits.workspaces}` : ''} workspace${workspaces.length !== 1 ? 's' : ''}${limits ? ` · ${limits.tier} plan` : ''}`}
          actions={
            <div className="flex items-center gap-2">
              {atWorkspaceLimit && (
                <span className="text-[0.72rem] text-warning font-medium px-2 py-1 rounded bg-warning/10">
                  {t('workspaces.limitReached')}
                </span>
              )}
              <button
                className={`inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap ${atWorkspaceLimit ? 'bg-warning text-black hover:bg-warning/90' : 'bg-accent text-white hover:bg-[#5558e6]'}`}
                onClick={() => atWorkspaceLimit ? navigate('/pricing') : setShowCreate(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  {atWorkspaceLimit ? <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /> : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>}
                </svg>
                {atWorkspaceLimit ? t('workspaces.upgradePlan') : t('workspaces.new')}
              </button>
            </div>
          }
        />

        <div className="flex-1 p-6">
          {/* Greeting */}
          <div className="mb-6 animate-fade-in">
            <h2 className="text-[1.4rem] font-bold text-text-primary">{greeting}, {dbUser?.name?.split(' ')[0] ?? 'there'} 👋</h2>
            <p className="text-text-secondary text-[0.85rem] mt-1">{t('whatsHappening')}</p>
          </div>

          {/* Stats Cards */}
          {!loading && stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>}
                label={t('stats.totalBoards')}
                value={stats.totalBoards}
                color="#6366f1"
                delay={0}
              />
              <StatCard
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>}
                label={t('stats.totalCards')}
                value={stats.totalCards}
                color="#8b5cf6"
                delay={50}
              />
              <StatCard
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>}
                label={t('stats.completed7d')}
                value={stats.completedCards}
                color="#34d399"
                delay={100}
              />
              <StatCard
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                label={t('stats.dueSoon')}
                value={stats.overdueCards}
                color="#f59e0b"
                delay={150}
              />
            </div>
          )}

          {/* Workspaces grid */}
          <div className="mb-4">
            <h3 className="text-[0.95rem] font-semibold text-text-primary flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
              {t('workspaces.title')}
            </h3>
          </div>

          {loading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {[1,2,3].map(i => <div key={i} className="h-[150px] rounded-lg bg-bg-card border border-border-subtle animate-[pulse_1.5s_ease_infinite]" />)}
            </div>
          ) : workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-8 gap-3 animate-fade-in">
              <div className="w-[56px] h-[56px] flex items-center justify-center rounded-lg bg-accent-subtle text-accent-light mb-2">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h2 className="text-[1.15rem]">{t('workspaces.empty')}</h2>
              <p className="text-text-secondary max-w-[360px] text-[0.875rem]">{t('workspaces.emptyDescription')}</p>
              <button className="mt-3 inline-flex items-center justify-center gap-[6px] px-[20px] py-[10px] rounded-md text-[0.9rem] font-medium transition-colors whitespace-nowrap bg-accent text-white hover:bg-[#5558e6]" onClick={() => setShowCreate(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {t('workspaces.create')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 animate-fade-in">
              {workspaces.map((ws, i) => (
                <div
                  key={ws.id}
                  className={`relative cursor-pointer animate-fade-in bg-bg-card border border-border-subtle rounded-lg p-5 transition-all ${ws.locked ? 'opacity-60 hover:opacity-80' : 'hover:bg-bg-card-hover hover:-translate-y-[1px] hover:shadow-lg'}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() => ws.locked ? setShowLockedModal(true) : navigate(`/workspaces/${ws.id}`)}
                >
                  {ws.locked && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-[2px] rounded-full text-[0.65rem] font-semibold uppercase tracking-[0.04em] bg-warning/10 text-warning">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Locked
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-[34px] h-[34px] rounded-md bg-accent flex items-center justify-center font-semibold text-[0.95rem] text-white">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    {!ws.locked && (
                      <span className={`px-[8px] py-[2px] rounded-full text-[0.65rem] font-semibold uppercase tracking-[0.04em] ${(dbUser?.subscription ?? 'FREE').toLowerCase() === 'free' ? 'bg-accent-subtle text-accent-light' : (dbUser?.subscription ?? 'FREE').toLowerCase() === 'pro' ? 'bg-[rgba(251,191,36,0.1)] text-warning' : 'bg-[rgba(52,211,153,0.1)] text-success'}`}>
                        {dbUser?.subscription === 'PRO_MAX' ? 'Pro Max' : dbUser?.subscription ?? 'FREE'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-[0.95rem] mb-[2px]">{ws.name}</h3>
                  <p className="text-text-muted text-[0.8rem] mb-3">/{ws.slug}</p>
                  <div className="flex gap-3 text-text-secondary text-[0.8rem] [&>span]:flex [&>span]:items-center [&>span]:gap-[5px]">
                    <span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
                      </svg>
                      {tc('boards_other', { count: ws._count?.boards ?? 0 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Locked workspace modal */}
      <Modal open={showLockedModal} onClose={() => setShowLockedModal(false)} title="Workspace locked">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-md bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <p className="text-text-secondary text-[0.875rem] leading-relaxed">
              This workspace is locked because your plan no longer covers it. On the Free plan you can access your 3 most-recently-used workspaces. Upgrade to Pro to unlock all of your workspaces and boards.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium border border-border-subtle text-text-secondary hover:bg-bg-card-hover transition-colors"
              onClick={() => setShowLockedModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors"
              onClick={() => { setShowLockedModal(false); navigate('/pricing'); }}
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Workspace Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('createModal.title')}>
        <form onSubmit={handleCreate} className="flex flex-col">
          {createError && <div className="py-[10px] px-[12px] rounded-md bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] text-danger text-[0.8rem]" style={{ marginBottom: 16 }}>{createError}</div>}
          <div className="flex flex-col gap-[6px] [&>label]:text-[0.8rem] [&>label]:font-medium [&>label]:text-text-secondary">
            <label htmlFor="ws-name">{t('createModal.nameLabel')}</label>
            <input id="ws-name" className="px-3 py-[9px] rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.875rem] transition-colors outline-none focus:border-border-focus placeholder:text-text-muted w-full" type="text" placeholder={t('createModal.namePlaceholder')} value={createName} onChange={(e) => autoSlug(e.target.value)} required autoFocus />
          </div>
          <div className="flex flex-col gap-[6px] [&>label]:text-[0.8rem] [&>label]:font-medium [&>label]:text-text-secondary mt-4">
            <label htmlFor="ws-slug">{t('createModal.slugLabel')}</label>
            <input id="ws-slug" className="px-3 py-[9px] rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.875rem] transition-colors outline-none focus:border-border-focus placeholder:text-text-muted w-full" type="text" placeholder={t('createModal.slugPlaceholder')} value={createSlug} onChange={(e) => setCreateSlug(e.target.value)} required pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$" />
          </div>
          <button type="submit" className="mt-6 inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-accent text-white hover:bg-[#5558e6] w-full disabled:opacity-40 disabled:cursor-not-allowed" disabled={creating} >
            {creating ? tc('actions.creating') : t('createModal.submit')}
          </button>
        </form>
      </Modal>
    </div>
  );
}
