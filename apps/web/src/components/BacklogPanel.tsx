import { useState } from 'react';
import { TypeIcon, PRIORITIES, LABEL_OPTIONS } from './CardDetailPanel';

interface Card {
  id: string;
  title: string;
  body?: string;
  priority?: string;
  type?: string;
  labels: string[];
  storyPoints?: number | null;
  author?: { id: string; name: string };
  assignee?: { id: string; name: string } | null;
  column?: { id: string; name: string };
  _count?: { comments: number };
}

interface Sprint {
  id: string;
  name: string;
  status: string;
  _count?: { cards: number };
}

interface BacklogPanelProps {
  boardId: string;
  backlogCards: Card[];
  sprints: Sprint[];
  onAddToSprint: (cardIds: string[], sprintId: string) => Promise<void>;
  onRemoveFromSprint: (cardId: string, sprintId: string) => Promise<void>;
  onCardClick: (cardId: string) => void;
  onRefresh: () => void;
}

function getPriorityColor(p?: string): string {
  switch (p) {
    case 'urgent': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#3b82f6';
    default: return 'transparent';
  }
}

export function BacklogPanel({
  backlogCards,
  sprints,
  onAddToSprint,
  onCardClick,
}: BacklogPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetSprint, setTargetSprint] = useState<string>('');

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === backlogCards.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(backlogCards.map((c) => c.id)));
    }
  };

  const handleMoveToSprint = async () => {
    if (!targetSprint || selected.size === 0) return;
    await onAddToSprint(Array.from(selected), targetSprint);
    setSelected(new Set());
  };

  const totalPoints = backlogCards.reduce((sum, c) => sum + (c.storyPoints ?? 0), 0);

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[1.05rem] font-bold text-text-primary">Product Backlog</h2>
          <p className="text-text-muted text-[0.75rem]">
            {backlogCards.length} card{backlogCards.length !== 1 ? 's' : ''} · {totalPoints} story points
          </p>
        </div>
        {selected.size > 0 && sprints.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[0.8rem] text-text-secondary">{selected.size} selected</span>
            <select
              className="px-3 py-1.5 rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.8rem] outline-none"
              value={targetSprint}
              onChange={(e) => setTargetSprint(e.target.value)}
            >
              <option value="">Move to sprint…</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s._count?.cards ?? 0} cards)
                </option>
              ))}
            </select>
            <button
              className="px-3 py-1.5 rounded-md text-[0.8rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors disabled:opacity-50"
              onClick={handleMoveToSprint}
              disabled={!targetSprint}
            >
              Move
            </button>
          </div>
        )}
      </div>

      {backlogCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
          <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-accent/10 text-accent mb-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <h3 className="text-[1rem] text-text-primary">Backlog is empty</h3>
          <p className="text-text-secondary text-[0.85rem] max-w-[360px]">
            All cards are assigned to sprints. Create new cards in the Kanban view to add them to the backlog.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border-subtle overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-bg-surface border-b border-border-subtle text-[0.7rem] font-semibold text-text-muted uppercase tracking-wider">
            <div className="w-6">
              <input
                type="checkbox"
                className="rounded accent-accent"
                checked={selected.size === backlogCards.length && backlogCards.length > 0}
                onChange={selectAll}
              />
            </div>
            <div className="w-6">Type</div>
            <div className="flex-1">Title</div>
            <div className="w-16 text-center">Priority</div>
            <div className="w-12 text-center">Pts</div>
            <div className="w-16 text-center">Status</div>
            <div className="w-20 text-right">Assignee</div>
          </div>

          {/* Rows */}
          {backlogCards.map((card) => {
            const isSelected = selected.has(card.id);
            const priorityColor = getPriorityColor(card.priority);
            return (
              <div
                key={card.id}
                className={`flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle last:border-b-0 transition-colors cursor-pointer ${isSelected ? 'bg-accent/5' : 'hover:bg-white/[0.03]'}`}
              >
                <div className="w-6">
                  <input
                    type="checkbox"
                    className="rounded accent-accent"
                    checked={isSelected}
                    onChange={() => toggleSelect(card.id)}
                  />
                </div>
                <div className="w-6">
                  <TypeIcon type={card.type ?? 'task'} size={14} />
                </div>
                <div className="flex-1 min-w-0" onClick={() => onCardClick(card.id)}>
                  <p className="text-[0.82rem] font-medium text-text-primary truncate">{card.title}</p>
                  {card.labels.length > 0 && (
                    <div className="flex gap-1 mt-0.5">
                      {card.labels.slice(0, 3).map((l) => {
                        const info = LABEL_OPTIONS.find((o) => o.value === l);
                        return info ? (
                          <span key={l} className="text-[0.55rem] font-bold uppercase px-1 py-[0px] rounded" style={{ color: info.color, background: info.bg }}>
                            {info.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <div className="w-16 text-center">
                  {card.priority && (
                    <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded" style={{ color: priorityColor, background: `${priorityColor}18` }}>
                      {PRIORITIES.find((p) => p.value === card.priority)?.label}
                    </span>
                  )}
                </div>
                <div className="w-12 text-center">
                  {card.storyPoints != null ? (
                    <span className="text-[0.75rem] font-bold text-accent">{card.storyPoints}</span>
                  ) : (
                    <span className="text-text-muted text-[0.75rem]">–</span>
                  )}
                </div>
                <div className="w-16 text-center">
                  <span className="text-[0.6rem] font-medium px-1.5 py-0.5 rounded bg-white/[0.06] text-text-muted">
                    {card.column?.name ?? '–'}
                  </span>
                </div>
                <div className="w-20 text-right">
                  {card.assignee ? (
                    <div className="inline-flex items-center gap-1">
                      <span className="w-5 h-5 rounded-full bg-accent/60 flex items-center justify-center text-[0.55rem] font-bold text-white" title={card.assignee.name}>
                        {card.assignee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-text-muted text-[0.7rem]">–</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
