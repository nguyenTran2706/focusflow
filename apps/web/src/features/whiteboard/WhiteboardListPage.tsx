import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../../components/Sidebar';
import { TopNav } from '../../components/TopNav';
import { BoardTabs } from '../../components/BoardTabs';
import { useAuthStore } from '../../lib/auth-store';
import { useWhiteboards, useCreateWhiteboard, useDeleteWhiteboard } from './hooks/useWhiteboard';

export function WhiteboardListPage() {
  const { t } = useTranslation('whiteboard');
  const { t: tc } = useTranslation('common');
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const dbUser = useAuthStore((s) => s.dbUser);
  const isFree = dbUser?.subscription === 'FREE';
  const { data: whiteboards, isLoading } = useWhiteboards(boardId);
  const createMut = useCreateWhiteboard(boardId);
  const deleteMut = useDeleteWhiteboard(boardId);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    try {
      const wb = await createMut.mutateAsync(undefined);
      navigate(`/boards/${boardId}/whiteboards/${wb.id}`);
    } catch {
      /* tier limit — handled by error boundary or toast */
    }
  };

  // ── Free tier gate ─────────────────────────────────────────────────────
  if (isFree) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
          <TopNav title={t('list.title')} />
          {boardId && <BoardTabs boardId={boardId} />}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-[420px] px-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-warning/10 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h2 className="text-[1.2rem] font-bold text-text-primary mb-2">{tc('upgrade.proFeature', { feature: t('title') })}</h2>
              <p className="text-text-secondary text-[0.85rem] mb-6">{tc('upgrade.unlockMessage', { feature: t('title') })}</p>
              <div className="flex items-center justify-center gap-3">
                <button className="px-5 py-2.5 rounded-md text-[0.85rem] font-medium bg-warning text-black hover:bg-warning/90 transition-colors" onClick={() => navigate('/pricing')}>
                  {tc('actions.viewPlans')}
                </button>
                <button className="px-5 py-2.5 rounded-md text-[0.85rem] font-medium text-text-secondary hover:bg-white/10 transition-colors" onClick={() => navigate(`/boards/${boardId}`)}>
                  {tc('actions.back')}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
          <TopNav title={t('list.title')} />
          {boardId && <BoardTabs boardId={boardId} />}
          <div className="flex-1 p-6">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[150px] rounded-lg bg-bg-card border border-border-subtle animate-[pulse_1.5s_ease_infinite]" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!whiteboards?.length) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
          <TopNav title="Whiteboards" />
          {boardId && <BoardTabs boardId={boardId} />}
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-8 gap-3 animate-fade-in">
            <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-accent-subtle text-accent-light mb-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="2" />
                <path d="M7 7h3v3H7z" /><path d="M14 7h3v3h-3z" /><path d="M7 14h3v3H7z" />
              </svg>
            </div>
            <h2 className="text-[1.15rem] text-text-primary font-semibold">{t('list.empty')}</h2>
            <p className="text-text-secondary max-w-[360px] text-[0.875rem]">{t('list.emptyDescription')}</p>
            <button
              className="mt-3 inline-flex items-center justify-center gap-[6px] px-5 py-2.5 rounded-md text-[0.9rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors"
              onClick={handleCreate}
              disabled={createMut.isPending}
            >
              {createMut.isPending ? tc('actions.creating') : t('list.create')}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
        <TopNav title="Whiteboards" />
        {boardId && <BoardTabs boardId={boardId} />}
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[1rem] font-semibold text-text-primary">
              {t('list.title')} <span className="text-text-muted font-normal">({whiteboards.length})</span>
            </h3>
            <button
              className="inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors"
              onClick={handleCreate}
              disabled={createMut.isPending}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t('list.create')}
            </button>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 animate-fade-in">
            {whiteboards.map((wb, i) => (
              <div
                key={wb.id}
                className="cursor-pointer animate-fade-in bg-bg-card border border-border-subtle rounded-lg p-5 transition-all hover:bg-bg-card-hover hover:-translate-y-[1px] hover:shadow-lg group relative"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => navigate(`/boards/${boardId}/whiteboards/${wb.id}`)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-[34px] h-[34px] rounded-md flex items-center justify-center font-semibold text-[0.95rem] text-white bg-[hsl(280,60%,55%)]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="2" y="2" width="20" height="20" rx="2" />
                      <path d="M7 7h3v3H7z" /><path d="M14 7h3v3h-3z" />
                    </svg>
                  </div>
                  {/* Delete button */}
                  {confirmDeleteId === wb.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="px-2 py-1 rounded text-[0.7rem] font-medium bg-danger text-white"
                        onClick={() => { deleteMut.mutate(wb.id); setConfirmDeleteId(null); }}
                      >
                        Delete
                      </button>
                      <button
                        className="px-2 py-1 rounded text-[0.7rem] font-medium text-text-muted"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        {tc('actions.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="p-1.5 rounded text-text-muted opacity-0 group-hover:opacity-100 hover:bg-danger/10 hover:text-danger transition-all"
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(wb.id); }}
                      title="Delete whiteboard"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
                <h3 className="text-[0.95rem] text-text-primary mb-[2px]">{wb.name}</h3>
                <p className="text-text-muted text-[0.75rem]">
                  Updated {new Date(wb.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
