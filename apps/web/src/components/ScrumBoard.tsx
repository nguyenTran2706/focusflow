import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { BacklogPanel } from './BacklogPanel';
import { SprintPlanningModal } from './SprintPlanningModal';
import { BurndownChart } from './BurndownChart';
import { VelocityChart } from './VelocityChart';
import { TypeIcon, PRIORITIES, LABEL_OPTIONS } from './CardDetailPanel';

interface Card {
  id: string;
  title: string;
  body?: string;
  priority?: string;
  type?: string;
  labels: string[];
  storyPoints?: number | null;
  sprintId?: string | null;
  author?: { id: string; name: string };
  assignee?: { id: string; name: string } | null;
  column?: { id: string; name: string };
  _count?: { comments: number };
}

interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  velocity?: number | null;
  _count?: { cards: number };
  cards?: Card[];
}

interface ScrumBoardProps {
  boardId: string;
  onCardClick: (cardId: string) => void;
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  PLANNING: { bg: 'rgba(99,102,241,0.12)', text: '#818cf8', label: 'Planning' },
  ACTIVE: { bg: 'rgba(52,211,153,0.12)', text: '#34d399', label: 'Active' },
  COMPLETED: { bg: 'rgba(107,114,128,0.12)', text: '#9ca3af', label: 'Completed' },
};

function getPriorityColor(p?: string): string {
  switch (p) {
    case 'urgent': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#3b82f6';
    default: return 'transparent';
  }
}

function SprintCardItem({ card, onClick }: { card: Card; onClick: () => void }) {
  const priorityColor = getPriorityColor(card.priority);
  const colName = card.column?.name ?? '';
  const isDone = ['done', 'complete', 'completed'].includes(colName.toLowerCase());

  return (
    <div
      className={`bg-bg-surface border border-border-subtle rounded-lg cursor-pointer select-none transition-all hover:-translate-y-[1px] hover:shadow-md hover:border-white/10 ${isDone ? 'opacity-60' : ''}`}
      style={card.priority ? { borderLeftWidth: '3px', borderLeftColor: priorityColor } : undefined}
      onClick={onClick}
    >
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pt-2.5">
          {card.labels.map((l) => {
            const info = LABEL_OPTIONS.find((o) => o.value === l);
            return info ? (
              <span key={l} className="text-[0.6rem] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded" style={{ color: info.color, background: info.bg }}>
                {info.label}
              </span>
            ) : null;
          })}
        </div>
      )}

      <div className="px-3 pt-2 pb-2">
        <div className="flex items-start gap-2">
          <TypeIcon type={card.type ?? 'task'} size={14} />
          <p className={`font-medium text-[0.82rem] text-text-primary leading-snug flex-1 ${isDone ? 'line-through' : ''}`}>{card.title}</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 pb-2.5 gap-2">
        <div className="flex items-center gap-1.5">
          {card.priority && (
            <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded" style={{ color: priorityColor, background: `${priorityColor}18` }}>
              {PRIORITIES.find((p) => p.value === card.priority)?.label}
            </span>
          )}
          {card.column && (
            <span className="text-[0.6rem] font-medium px-1.5 py-0.5 rounded bg-white/[0.06] text-text-muted">
              {card.column.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {card.storyPoints != null && (
            <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[0.65rem] font-bold flex items-center justify-center" title="Story points">
              {card.storyPoints}
            </span>
          )}
          {card.assignee && (
            <div className="w-5 h-5 rounded-full bg-accent/60 flex items-center justify-center text-[0.55rem] font-bold text-white shrink-0" title={card.assignee.name}>
              {card.assignee.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ScrumBoard({ boardId, onCardClick }: ScrumBoardProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [activeSprintCards, setActiveSprintCards] = useState<Card[]>([]);
  const [backlogCards, setBacklogCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanning, setShowPlanning] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [activeTab, setActiveTab] = useState<'board' | 'backlog' | 'burndown' | 'velocity'>('board');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [sprintList, backlog] = await Promise.all([
        api.get<Sprint[]>(`/boards/${boardId}/sprints`),
        api.get<Card[]>(`/boards/${boardId}/backlog`),
      ]);
      setSprints(sprintList);
      setBacklogCards(backlog);

      const active = sprintList.find((s) => s.status === 'ACTIVE');
      if (active) {
        const sprintDetail = await api.get<Sprint>(`/sprints/${active.id}`);
        setActiveSprint(sprintDetail);
        setActiveSprintCards(sprintDetail.cards ?? []);
      } else {
        setActiveSprint(null);
        setActiveSprintCards([]);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [boardId]);

  const groupedCards = useMemo(() => {
    const groups: Record<string, Card[]> = {
      'To Do': [],
      'In Progress': [],
      'Done': [],
    };
    for (const card of activeSprintCards) {
      const colName = card.column?.name ?? 'To Do';
      const lower = colName.toLowerCase();
      if (lower === 'done' || lower === 'complete' || lower === 'completed') {
        groups['Done'].push(card);
      } else if (lower.includes('progress') || lower.includes('review') || lower === 'doing') {
        groups['In Progress'].push(card);
      } else {
        groups['To Do'].push(card);
      }
    }
    return groups;
  }, [activeSprintCards]);

  const totalPoints = activeSprintCards.reduce((sum, c) => sum + (c.storyPoints ?? 0), 0);
  const donePoints = groupedCards['Done'].reduce((sum, c) => sum + (c.storyPoints ?? 0), 0);

  const handleStartSprint = async (sprintId: string) => {
    setActionLoading(true);
    try {
      await api.post(`/sprints/${sprintId}/start`);
      await fetchData();
    } catch { /* */ }
    finally { setActionLoading(false); }
  };

  const handleCompleteSprint = async () => {
    if (!activeSprint) return;
    setActionLoading(true);
    try {
      await api.post(`/sprints/${activeSprint.id}/complete`);
      await fetchData();
    } catch { /* */ }
    finally { setActionLoading(false); }
  };

  const handleAddToSprint = async (cardIds: string[], sprintId: string) => {
    try {
      await api.post(`/sprints/${sprintId}/cards`, { cardIds });
      await fetchData();
    } catch { /* */ }
  };

  const handleRemoveFromSprint = async (cardId: string, sprintId: string) => {
    try {
      await api.delete(`/sprints/${sprintId}/cards/${cardId}`);
      await fetchData();
    } catch { /* */ }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    try {
      await api.delete(`/sprints/${sprintId}`);
      await fetchData();
    } catch { /* */ }
  };

  const daysLeft = activeSprint
    ? Math.max(0, Math.ceil((new Date(activeSprint.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[200px] rounded-lg bg-bg-surface border border-border-subtle animate-[pulse_1.5s_ease_infinite]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Scrum tabs */}
      <div className="flex items-center gap-0 px-6 border-b border-border-subtle bg-bg-root">
        {(['board', 'backlog', 'burndown', 'velocity'] as const).map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2.5 text-[0.8rem] font-semibold transition-colors relative capitalize
              ${activeTab === tab ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'}
            `}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'board' ? 'Sprint Board' : tab === 'backlog' ? 'Backlog' : tab === 'burndown' ? 'Burndown' : 'Velocity'}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.8rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors mr-2"
          onClick={() => { setEditingSprint(null); setShowPlanning(true); }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Sprint
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'board' && (
        <div className="flex-1 overflow-auto p-6">
          {/* Active sprint header */}
          {activeSprint ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-[1.1rem] font-bold text-text-primary">{activeSprint.name}</h2>
                    <span className="text-[0.7rem] font-semibold px-2.5 py-1 rounded-full" style={{ background: STATUS_BADGE.ACTIVE.bg, color: STATUS_BADGE.ACTIVE.text }}>
                      Active
                    </span>
                  </div>
                  {activeSprint.goal && (
                    <p className="text-text-secondary text-[0.8rem]">{activeSprint.goal}</p>
                  )}
                  <p className="text-text-muted text-[0.75rem] mt-1">
                    {new Date(activeSprint.startDate).toLocaleDateString()} – {new Date(activeSprint.endDate).toLocaleDateString()}
                    {' · '}{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Progress bar */}
                  <div className="text-right">
                    <p className="text-[0.75rem] text-text-muted mb-1">{donePoints}/{totalPoints} pts</p>
                    <div className="w-[120px] h-2 rounded-full bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-success transition-all"
                        style={{ width: totalPoints > 0 ? `${(donePoints / totalPoints) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                  <button
                    className="px-4 py-2 rounded-md text-[0.8rem] font-medium bg-success/15 text-success hover:bg-success/25 transition-colors disabled:opacity-50"
                    onClick={handleCompleteSprint}
                    disabled={actionLoading}
                  >
                    Complete Sprint
                  </button>
                </div>
              </div>

              {/* Sprint board columns */}
              <div className="grid grid-cols-3 gap-4">
                {(['To Do', 'In Progress', 'Done'] as const).map((status) => {
                  const cards = groupedCards[status];
                  const statusColors = status === 'To Do' ? '#6b7280' : status === 'In Progress' ? '#f59e0b' : '#34d399';
                  return (
                    <div key={status} className="flex flex-col">
                      <div className="flex items-center gap-2 mb-3 border-t-[3px] pt-3" style={{ borderColor: statusColors }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: statusColors }} />
                        <h4 className="font-semibold text-[0.825rem] text-text-secondary uppercase tracking-[0.04em] flex-1">{status}</h4>
                        <span className="text-[0.7rem] font-semibold px-[7px] py-[2px] rounded-full text-text-muted" style={{ background: `${statusColors}10` }}>
                          {cards.length}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 min-h-[100px]">
                        {cards.length === 0 && (
                          <div className="text-center py-6 text-text-muted text-[0.8rem] bg-white/[0.03] rounded-lg border border-dashed border-border-subtle">
                            No cards
                          </div>
                        )}
                        {cards.map((card) => (
                          <SprintCardItem key={card.id} card={card} onClick={() => onCardClick(card.id)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* No active sprint */
            <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
              <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-accent/10 text-accent mb-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <h2 className="text-[1.15rem] text-text-primary">No active sprint</h2>
              <p className="text-text-secondary text-[0.875rem] max-w-[400px]">
                Create a sprint and add cards from the backlog, then start it to begin tracking progress.
              </p>

              {/* Planning sprints list */}
              {sprints.filter((s) => s.status === 'PLANNING').length > 0 && (
                <div className="mt-6 w-full max-w-[500px]">
                  <h3 className="text-[0.85rem] font-semibold text-text-secondary mb-3 text-left">Planned Sprints</h3>
                  <div className="flex flex-col gap-2">
                    {sprints.filter((s) => s.status === 'PLANNING').map((sprint) => (
                      <div key={sprint.id} className="flex items-center justify-between p-3 rounded-lg bg-bg-surface border border-border-subtle">
                        <div>
                          <p className="text-[0.85rem] font-medium text-text-primary">{sprint.name}</p>
                          <p className="text-[0.7rem] text-text-muted">
                            {new Date(sprint.startDate).toLocaleDateString()} – {new Date(sprint.endDate).toLocaleDateString()}
                            {' · '}{sprint._count?.cards ?? 0} cards
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1.5 rounded-md text-[0.75rem] font-medium bg-success/15 text-success hover:bg-success/25 transition-colors disabled:opacity-50"
                            onClick={() => handleStartSprint(sprint.id)}
                            disabled={actionLoading}
                          >
                            Start
                          </button>
                          <button
                            className="p-1.5 rounded-md text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                            onClick={() => handleDeleteSprint(sprint.id)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed sprints */}
              {sprints.filter((s) => s.status === 'COMPLETED').length > 0 && (
                <div className="mt-6 w-full max-w-[500px]">
                  <h3 className="text-[0.85rem] font-semibold text-text-secondary mb-3 text-left">Completed Sprints</h3>
                  <div className="flex flex-col gap-2">
                    {sprints.filter((s) => s.status === 'COMPLETED').map((sprint) => (
                      <div key={sprint.id} className="flex items-center justify-between p-3 rounded-lg bg-bg-surface border border-border-subtle opacity-70">
                        <div>
                          <p className="text-[0.85rem] font-medium text-text-primary">{sprint.name}</p>
                          <p className="text-[0.7rem] text-text-muted">
                            Velocity: {sprint.velocity ?? 0} pts
                          </p>
                        </div>
                        <span className="text-[0.7rem] font-semibold px-2.5 py-1 rounded-full" style={{ background: STATUS_BADGE.COMPLETED.bg, color: STATUS_BADGE.COMPLETED.text }}>
                          Done
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'backlog' && (
        <BacklogPanel
          boardId={boardId}
          backlogCards={backlogCards}
          sprints={sprints.filter((s) => s.status !== 'COMPLETED')}
          onAddToSprint={handleAddToSprint}
          onRemoveFromSprint={handleRemoveFromSprint}
          onCardClick={onCardClick}
          onRefresh={fetchData}
        />
      )}

      {activeTab === 'burndown' && activeSprint && (
        <BurndownChart sprintId={activeSprint.id} />
      )}
      {activeTab === 'burndown' && !activeSprint && (
        <div className="flex-1 flex items-center justify-center text-text-muted text-[0.9rem]">
          No active sprint to show burndown for
        </div>
      )}

      {activeTab === 'velocity' && (
        <VelocityChart boardId={boardId} />
      )}

      {/* Sprint Planning Modal */}
      {showPlanning && (
        <SprintPlanningModal
          boardId={boardId}
          sprint={editingSprint}
          onClose={() => setShowPlanning(false)}
          onSaved={() => { setShowPlanning(false); fetchData(); }}
        />
      )}
    </div>
  );
}
