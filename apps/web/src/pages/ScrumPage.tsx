import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { CardDetailPanel, PRIORITIES, LABEL_OPTIONS, TypeIcon } from '../components/CardDetailPanel';
import { BoardTabs } from '../components/BoardTabs';
import { SprintPlanningModal } from '../components/SprintPlanningModal';
import { BurndownChart } from '../components/BurndownChart';
import { VelocityChart } from '../components/VelocityChart';
import { useAuthStore } from '../lib/auth-store';
import { api } from '../lib/api';
import { ShareModal } from '../features/share/ShareModal';

// ── Types ──────────────────────────────────────────────────────────────────

interface Card {
  id: string;
  title: string;
  body?: string;
  priority?: string;
  type?: string;
  labels: string[];
  storyPoints?: number | null;
  sprintId?: string | null;
  rank?: string;
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

interface Column {
  id: string;
  name: string;
  rank: string;
}

interface Board {
  id: string;
  name: string;
  workspaceId: string;
  columns: (Column & { cards: Card[] })[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getPriorityColor(p?: string): string {
  switch (p) {
    case 'urgent': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#3b82f6';
    default: return 'transparent';
  }
}

function getStatusGroup(colName: string): 'todo' | 'progress' | 'done' {
  const lower = colName.toLowerCase();
  if (lower === 'done' || lower === 'complete' || lower === 'completed') return 'done';
  if (lower.includes('progress') || lower.includes('review') || lower === 'doing') return 'progress';
  return 'todo';
}

const STATUS_META = {
  todo: { label: 'To Do', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', headerBg: 'rgba(107,114,128,0.12)', icon: '○', emoji: '📋' },
  progress: { label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', headerBg: 'rgba(245,158,11,0.12)', icon: '◐', emoji: '⚡' },
  done: { label: 'Done', color: '#34d399', bg: 'rgba(52,211,153,0.06)', headerBg: 'rgba(52,211,153,0.12)', icon: '●', emoji: '✅' },
} as const;

// ── Draggable Sprint Card ──────────────────────────────────────────────────

function SortableSprintCard({ card, onClick }: { card: Card; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}>
      <SprintCard card={card} />
    </div>
  );
}

const STICKY_COLORS = [
  { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
  { bg: '#fce7f3', border: '#f9a8d4', text: '#9d174d' },
  { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' },
  { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46' },
  { bg: '#ede9fe', border: '#c4b5fd', text: '#5b21b6' },
  { bg: '#ffedd5', border: '#fdba74', text: '#9a3412' },
  { bg: '#e0e7ff', border: '#a5b4fc', text: '#3730a3' },
  { bg: '#fef9c3', border: '#fde047', text: '#854d0e' },
];

function getStickyColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return STICKY_COLORS[Math.abs(hash) % STICKY_COLORS.length];
}

function SprintCard({ card, overlay }: { card: Card; overlay?: boolean }) {
  const statusGroup = getStatusGroup(card.column?.name ?? 'To Do');
  const sticky = getStickyColor(card.id);
  const isDone = statusGroup === 'done';

  return (
    <div
      className={`relative rounded-lg p-3.5 transition-all group select-none ${
        overlay
          ? 'shadow-2xl rotate-[3deg] scale-105'
          : 'hover:shadow-lg hover:-translate-y-1 hover:rotate-[-0.5deg] cursor-grab active:cursor-grabbing active:scale-[1.02]'
      } ${isDone ? 'opacity-60' : ''}`}
      style={{
        background: sticky.bg,
        borderLeft: `4px solid ${card.priority ? getPriorityColor(card.priority) : sticky.border}`,
        boxShadow: overlay
          ? '0 20px 40px rgba(0,0,0,0.3), 0 0 0 2px rgba(99,102,241,0.4)'
          : '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
      }}
    >
      {/* Pin decoration */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full opacity-40"
        style={{ background: sticky.border, boxShadow: `0 1px 3px ${sticky.border}` }} />

      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.slice(0, 3).map((l) => {
            const info = LABEL_OPTIONS.find((o) => o.value === l);
            return info ? (
              <span key={l} className="text-[0.5rem] font-bold uppercase tracking-wider px-1.5 py-[2px] rounded-full shadow-sm"
                style={{ color: '#fff', background: info.color }}>
                {info.label}
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Title */}
      <div className="flex items-start gap-1.5">
        <TypeIcon type={card.type ?? 'task'} size={14} />
        <p className={`text-[0.82rem] font-semibold leading-snug flex-1 ${isDone ? 'line-through' : ''}`}
          style={{ color: sticky.text }}>
          {card.title}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-2" style={{ borderTop: `1px dashed ${sticky.border}` }}>
        <div className="flex items-center gap-1.5">
          {card.priority && (
            <span className="text-[0.55rem] font-bold px-1.5 py-[2px] rounded-full text-white shadow-sm"
              style={{ background: getPriorityColor(card.priority) }}>
              {PRIORITIES.find((p) => p.value === card.priority)?.label}
            </span>
          )}
          {(card._count?.comments ?? 0) > 0 && (
            <span className="text-[0.6rem] flex items-center gap-0.5" style={{ color: sticky.text, opacity: 0.6 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              {card._count!.comments}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {card.storyPoints != null && (
            <span className="min-w-[20px] h-[20px] rounded-full text-[0.6rem] font-bold flex items-center justify-center px-1 text-white shadow-sm"
              style={{ background: '#6366f1' }}>
              {card.storyPoints}
            </span>
          )}
          {card.assignee && (
            <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[0.55rem] font-bold text-white shadow-sm"
              style={{ background: '#6366f1' }}
              title={card.assignee.name}>
              {card.assignee.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Drop Column ────────────────────────────────────────────────────────────

function StatusColumn({
  status,
  cards,
  columnId,
  onCardClick,
  onCreateCard,
}: {
  status: 'todo' | 'progress' | 'done';
  cards: Card[];
  columnId: string | null;
  onCardClick: (id: string) => void;
  onCreateCard?: (columnId: string, title: string) => Promise<void>;
}) {
  const meta = STATUS_META[status];
  const totalPts = cards.reduce((s, c) => s + (c.storyPoints ?? 0), 0);
  const cardIds = cards.map((c) => c.id);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !columnId || !onCreateCard) return;
    setCreating(true);
    try {
      await onCreateCard(columnId, newTitle.trim());
      setNewTitle('');
      setIsAdding(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to create card'); }
    finally { setCreating(false); }
  };

  return (
    <div
      className="flex flex-col min-w-[300px] flex-1 rounded-xl overflow-hidden"
      data-column-id={columnId}
      style={{ background: meta.bg }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: meta.headerBg }}>
        <div className="flex items-center gap-2.5">
          <span className="text-base">{meta.emoji}</span>
          <h3 className="text-[0.88rem] font-bold text-text-primary">{meta.label}</h3>
          <span className="min-w-[24px] h-[24px] rounded-full text-[0.7rem] font-bold flex items-center justify-center px-1.5 text-white shadow-sm"
            style={{ background: meta.color }}>
            {cards.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {totalPts > 0 && (
            <span className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full" style={{ color: meta.color, background: `${meta.color}15` }}>
              {totalPts} pts
            </span>
          )}
          {columnId && onCreateCard && (
            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary transition-all"
              style={{ background: `${meta.color}15` }}
              onClick={() => setIsAdding(true)}
              title="Add a card"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Droppable area */}
      <SortableContext items={cardIds} strategy={rectSortingStrategy} id={columnId ?? status}>
        <div className="flex-1 grid grid-cols-2 auto-rows-min gap-3 px-3 py-3 min-h-[140px] transition-colors">
          {cards.map((card) => (
            <SortableSprintCard
              key={card.id}
              card={card}
              onClick={() => onCardClick(card.id)}
            />
          ))}
          {cards.length === 0 && !isAdding && (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[120px] rounded-xl border-2 border-dashed transition-colors"
              style={{ borderColor: `${meta.color}30` }}>
              <span className="text-2xl mb-1.5 opacity-40">{meta.emoji}</span>
              <span className="text-[0.75rem] text-text-muted">
                {status === 'done' ? 'Drag cards here when done' : status === 'progress' ? 'Move cards here to start' : 'No cards yet'}
              </span>
            </div>
          )}
        </div>
      </SortableContext>

      {/* Inline card creation */}
      {isAdding ? (
        <div className="mx-3 mb-3">
          <div className="rounded-lg p-3 shadow-lg" style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
            <textarea
              ref={inputRef}
              className="w-full bg-transparent text-[0.85rem] placeholder:text-amber-600/50 resize-none outline-none min-h-[50px]"
              style={{ color: '#92400e' }}
              placeholder="Write on this sticky note..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCreate();
                }
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewTitle('');
                }
              }}
              disabled={creating}
            />
            <div className="flex items-center gap-2 mt-1.5 pt-2" style={{ borderTop: '1px dashed #fcd34d' }}>
              <button
                className="px-3.5 py-1.5 rounded-lg text-[0.78rem] font-semibold bg-accent text-white hover:bg-[#5558e6] transition-colors disabled:opacity-50 shadow-sm"
                onClick={handleCreate}
                disabled={!newTitle.trim() || creating}
              >
                {creating ? 'Adding...' : 'Add Card'}
              </button>
              <button
                className="p-1.5 rounded-lg text-amber-700/60 hover:text-amber-700 hover:bg-amber-200/50 transition-colors"
                onClick={() => { setIsAdding(false); setNewTitle(''); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        columnId && onCreateCard && (
          <button
            className="mx-3 mb-3 flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[0.78rem] font-semibold transition-all hover:shadow-sm"
            style={{ color: meta.color, background: `${meta.color}10` }}
            onClick={() => setIsAdding(true)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add a card
          </button>
        )
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

import { useRealtime } from '../hooks/useRealtime';

export function ScrumPage() {
  const { boardId } = useParams<{ boardId: string }>();
  useRealtime(boardId);
  const navigate = useNavigate();
  const dbUser = useAuthStore((s) => s.dbUser);
  const isFree = dbUser?.subscription === 'FREE';

  const [board, setBoard] = useState<Board | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [sprintCards, setSprintCards] = useState<Card[]>([]);
  const [backlogCards, setBacklogCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'board' | 'backlog' | 'burndown' | 'velocity'>('board');
  const [showPlanning, setShowPlanning] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedBulk, setSelectedBulk] = useState<Set<string>>(new Set());
  const [targetSprint, setTargetSprint] = useState('');
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [showSprintList, setShowSprintList] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // ── Data fetching ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!boardId) return;
    try {
      const [boardData, sprintList, backlog] = await Promise.all([
        api.get<Board>(`/boards/${boardId}`),
        api.get<Sprint[]>(`/boards/${boardId}/sprints`),
        api.get<Card[]>(`/boards/${boardId}/backlog`),
      ]);
      setBoard(boardData);
      setSprints(sprintList);
      setBacklogCards(backlog);

      const active = sprintList.find((s) => s.status === 'ACTIVE');
      const target = selectedSprintId
        ? sprintList.find((s) => s.id === selectedSprintId)
        : active ?? sprintList.find((s) => s.status === 'PLANNING');

      if (target) {
        setSelectedSprintId(target.id);
        const detail = await api.get<Sprint>(`/sprints/${target.id}`);
        setSprintCards(detail.cards ?? []);
      } else {
        setSelectedSprintId(null);
        setSprintCards([]);
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to load sprint data'); }
    finally { setLoading(false); }
  }, [boardId, selectedSprintId]);

  useEffect(() => { fetchData(); }, [boardId]);

  const switchSprint = async (sprintId: string) => {
    setSelectedSprintId(sprintId);
    try {
      const detail = await api.get<Sprint>(`/sprints/${sprintId}`);
      setSprintCards(detail.cards ?? []);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to load sprint'); }
  };

  // ── Current sprint helpers ─────────────────────────────────────────────

  const currentSprint = sprints.find((s) => s.id === selectedSprintId);
  const isActive = currentSprint?.status === 'ACTIVE';
  const isPlanning = currentSprint?.status === 'PLANNING';

  const columnMap = (board?.columns ?? []).reduce<Record<string, Column>>((acc, col) => {
    acc[col.id] = col;
    return acc;
  }, {});

  const groupedCards = {
    todo: sprintCards.filter((c) => getStatusGroup(c.column?.name ?? 'To Do') === 'todo'),
    progress: sprintCards.filter((c) => getStatusGroup(c.column?.name ?? '') === 'progress'),
    done: sprintCards.filter((c) => getStatusGroup(c.column?.name ?? '') === 'done'),
  };

  const totalPoints = sprintCards.reduce((sum, c) => sum + (c.storyPoints ?? 0), 0);
  const donePoints = groupedCards.done.reduce((sum, c) => sum + (c.storyPoints ?? 0), 0);
  const progressPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;
  const daysLeft = currentSprint
    ? Math.max(0, Math.ceil((new Date(currentSprint.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const daysTotal = currentSprint
    ? Math.max(1, Math.ceil((new Date(currentSprint.endDate).getTime() - new Date(currentSprint.startDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;

  // Find matching board column for each status group
  const getColumnForStatus = (status: 'todo' | 'progress' | 'done'): string | null => {
    if (!board) return null;
    const col = board.columns.find((c) => getStatusGroup(c.name) === status);
    return col?.id ?? null;
  };

  // ── Drag & Drop ────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const card = sprintCards.find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    if (!over || !board) return;

    const cardId = active.id as string;
    const card = sprintCards.find((c) => c.id === cardId);
    if (!card) return;

    // Figure out which status group the card was dropped into
    let targetStatus: 'todo' | 'progress' | 'done' | null = null;

    // Check if dropped on another card — use that card's column
    const overCard = sprintCards.find((c) => c.id === over.id);
    if (overCard) {
      targetStatus = getStatusGroup(overCard.column?.name ?? 'To Do');
    }

    // If dropped on a column container
    if (!targetStatus) {
      const overId = over.id as string;
      for (const [status, colId] of Object.entries({
        todo: getColumnForStatus('todo'),
        progress: getColumnForStatus('progress'),
        done: getColumnForStatus('done'),
      })) {
        if (colId === overId) {
          targetStatus = status as 'todo' | 'progress' | 'done';
          break;
        }
      }
    }

    if (!targetStatus) return;

    const currentStatus = getStatusGroup(card.column?.name ?? 'To Do');
    if (currentStatus === targetStatus) return;

    const targetColumnId = getColumnForStatus(targetStatus);
    if (!targetColumnId) return;

    // Optimistic update
    setSprintCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? { ...c, column: { id: targetColumnId, name: columnMap[targetColumnId]?.name ?? targetStatus } }
          : c
      )
    );

    try {
      await api.patch(`/cards/${cardId}/move`, { targetColumnId, rank: '0' });
    } catch {
      await fetchData();
    }
  };

  // ── Sprint actions ─────────────────────────────────────────────────────

  const handleStartSprint = async (sprintId: string) => {
    setActionLoading(true);
    try { await api.post(`/sprints/${sprintId}/start`); await fetchData(); toast.success('Sprint started'); } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to start sprint'); }
    finally { setActionLoading(false); }
  };

  const handleCompleteSprint = async () => {
    if (!currentSprint) return;
    setActionLoading(true);
    try { await api.post(`/sprints/${currentSprint.id}/complete`); await fetchData(); toast.success('Sprint completed'); } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to complete sprint'); }
    finally { setActionLoading(false); }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    try { await api.delete(`/sprints/${sprintId}`); await fetchData(); } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to delete sprint'); }
  };

  // ── Create card in sprint ──────────────────────────────────────────────

  const handleCreateCard = useCallback(async (columnId: string, title: string) => {
    if (!currentSprint) return;
    try {
      const card = await api.post<Card>(`/columns/${columnId}/cards`, { title });
      await api.post(`/sprints/${currentSprint.id}/cards`, { cardIds: [card.id] });
      await fetchData();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to create card'); }
  }, [currentSprint, fetchData]);

  // ── Backlog actions ────────────────────────────────────────────────────

  const handleBulkMove = async () => {
    if (!targetSprint || selectedBulk.size === 0) return;
    try {
      await api.post(`/sprints/${targetSprint}/cards`, { cardIds: Array.from(selectedBulk) });
      setSelectedBulk(new Set());
      setTargetSprint('');
      await fetchData();
      toast.success('Cards moved to sprint');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to move cards'); }
  };

  const toggleBulk = (id: string) => {
    setSelectedBulk((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };



  // ── Free tier gate ─────────────────────────────────────────────────────

  if (isFree) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
          <TopNav title="Scrum Board" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-[420px] px-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-warning/10 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <h2 className="text-[1.2rem] font-bold text-text-primary mb-2">Scrum Board is a Pro Feature</h2>
              <p className="text-text-secondary text-[0.85rem] mb-6">
                Sprint planning, burndown charts, velocity tracking, and the Scrum board are available on the Pro and Pro Max plans.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button className="px-5 py-2.5 rounded-md text-[0.85rem] font-medium bg-warning text-black hover:bg-warning/90 transition-colors" onClick={() => navigate('/pricing')}>
                  View Plans
                </button>
                <button className="px-5 py-2.5 rounded-md text-[0.85rem] font-medium text-text-secondary hover:bg-white/10 transition-colors" onClick={() => navigate(`/boards/${boardId}`)}>
                  Back to Kanban
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
          <TopNav title="Loading..." />
          <div className="flex-1 p-3 sm:p-4 md:p-6">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[300px] rounded-xl bg-bg-surface border border-border-subtle animate-[pulse_1.5s_ease_infinite]" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const planningSprints = sprints.filter((s) => s.status === 'PLANNING');
  const completedSprints = sprints.filter((s) => s.status === 'COMPLETED');
  const activeSprint = sprints.find((s) => s.status === 'ACTIVE');

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
        <TopNav
          title={`Scrum · ${board?.name ?? 'Board'}`}
          subtitle={
            currentSprint
              ? `${currentSprint.name}${isActive ? ` — ${daysLeft}d remaining` : ` — ${currentSprint.status.toLowerCase()}`}`
              : 'No sprints yet'
          }
          actions={
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-md text-[0.8rem] font-medium text-white bg-gradient-to-br from-[#6366f1] to-[#a855f7] hover:opacity-90 transition-opacity"
                onClick={() => setShareOpen(true)}
                title="Share board"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-md text-[0.8rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors"
                onClick={() => { setEditingSprint(null); setShowPlanning(true); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Sprint
              </button>
            </div>
          }
        />
        <BoardTabs boardId={boardId!} />

        {/* Tabs */}
        <div className="flex items-center gap-0 px-6 border-b border-border-subtle bg-bg-root">
          {([
            { key: 'board', label: 'Sprint Board' },
            { key: 'backlog', label: `Backlog (${backlogCards.length})` },
            { key: 'burndown', label: 'Burndown' },
            { key: 'velocity', label: 'Velocity' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              className={`px-4 py-2.5 text-[0.8rem] font-semibold transition-colors relative
                ${activeTab === tab.key ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'}
              `}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
              )}
            </button>
          ))}

          {/* Sprint selector (right side) */}
          {activeTab === 'board' && sprints.length > 0 && (
            <div className="ml-auto relative">
              <button
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[0.78rem] font-medium text-text-secondary hover:bg-white/[0.06] transition-colors"
                onClick={() => setShowSprintList(!showSprintList)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                {currentSprint?.name ?? 'Select Sprint'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>

              {showSprintList && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSprintList(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-[280px] rounded-lg border border-border-subtle bg-bg-surface shadow-xl overflow-hidden">
                    {activeSprint && (
                      <div className="border-b border-border-subtle">
                        <p className="px-3 pt-2.5 pb-1 text-[0.6rem] font-bold text-text-muted uppercase tracking-wider">Active</p>
                        <button
                          className={`w-full text-left px-3 py-2 text-[0.8rem] hover:bg-white/[0.06] transition-colors flex items-center justify-between ${selectedSprintId === activeSprint.id ? 'text-accent font-semibold' : 'text-text-primary'}`}
                          onClick={() => { switchSprint(activeSprint.id); setShowSprintList(false); }}
                        >
                          <span>{activeSprint.name}</span>
                          <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full bg-success/12 text-success">Active</span>
                        </button>
                      </div>
                    )}
                    {planningSprints.length > 0 && (
                      <div className="border-b border-border-subtle">
                        <p className="px-3 pt-2.5 pb-1 text-[0.6rem] font-bold text-text-muted uppercase tracking-wider">Planning</p>
                        {planningSprints.map((s) => (
                          <button
                            key={s.id}
                            className={`w-full text-left px-3 py-2 text-[0.8rem] hover:bg-white/[0.06] transition-colors flex items-center justify-between ${selectedSprintId === s.id ? 'text-accent font-semibold' : 'text-text-primary'}`}
                            onClick={() => { switchSprint(s.id); setShowSprintList(false); }}
                          >
                            <span>{s.name}</span>
                            <span className="text-[0.6rem] text-text-muted">{s._count?.cards ?? 0} cards</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {completedSprints.length > 0 && (
                      <div>
                        <p className="px-3 pt-2.5 pb-1 text-[0.6rem] font-bold text-text-muted uppercase tracking-wider">Completed</p>
                        {completedSprints.slice(0, 5).map((s) => (
                          <button
                            key={s.id}
                            className={`w-full text-left px-3 py-2 text-[0.8rem] hover:bg-white/[0.06] transition-colors flex items-center justify-between opacity-70 ${selectedSprintId === s.id ? 'text-accent font-semibold' : 'text-text-primary'}`}
                            onClick={() => { switchSprint(s.id); setShowSprintList(false); }}
                          >
                            <span>{s.name}</span>
                            <span className="text-[0.6rem] text-text-muted">{s.velocity ?? 0} pts</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            SPRINT BOARD TAB
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'board' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {currentSprint ? (
              <>
                {/* Sprint info bar */}
                <div className="flex items-center justify-between px-6 py-3 bg-bg-surface/50 border-b border-border-subtle">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-[0.95rem] font-bold text-text-primary">{currentSprint.name}</h2>
                        <span className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${isActive ? 'bg-success/12 text-success' : isPlanning ? 'bg-accent/12 text-accent' : 'bg-white/[0.08] text-text-muted'
                          }`}>
                          {currentSprint.status}
                        </span>
                      </div>
                      {currentSprint.goal && (
                        <p className="text-text-muted text-[0.72rem] mt-0.5">{currentSprint.goal}</p>
                      )}
                    </div>
                    <div className="h-8 w-px bg-border-subtle" />
                    <div className="flex items-center gap-4 text-[0.72rem] text-text-muted">
                      <span>{new Date(currentSprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(currentSprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      {isActive && (
                        <>
                          <span className="font-medium text-text-secondary">{daysLeft}d left</span>
                          <div className="flex items-center gap-2">
                            <div className="w-[80px] h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(((daysTotal - daysLeft) / daysTotal) * 100)}%`, background: daysLeft <= 2 ? '#ef4444' : '#6366f1' }} />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Points progress */}
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-1">
                        <p className="text-[0.95rem] font-bold text-text-primary">{progressPct}%</p>
                        <p className="text-[0.6rem] text-text-muted">{donePoints}/{totalPoints} pts</p>
                      </div>
                      <div className="w-[60px] h-[60px] relative">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round"
                            strokeDasharray={`${progressPct * 0.88} 88`} />
                        </svg>
                      </div>
                    </div>

                    {/* Sprint actions */}
                    {isPlanning && (
                      <button
                        className="px-3 py-1.5 rounded-md text-[0.78rem] font-medium bg-success/15 text-success hover:bg-success/25 transition-colors disabled:opacity-50"
                        onClick={() => handleStartSprint(currentSprint.id)}
                        disabled={actionLoading}
                      >
                        Start Sprint
                      </button>
                    )}
                    {isActive && (
                      <button
                        className="px-3 py-1.5 rounded-md text-[0.78rem] font-medium bg-success/15 text-success hover:bg-success/25 transition-colors disabled:opacity-50"
                        onClick={handleCompleteSprint}
                        disabled={actionLoading}
                      >
                        Complete Sprint
                      </button>
                    )}
                    <button
                      className="p-1.5 rounded-md text-text-muted hover:bg-white/[0.06] hover:text-text-secondary transition-colors"
                      onClick={() => { setEditingSprint(currentSprint); setShowPlanning(true); }}
                      title="Edit sprint"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    {!isActive && (
                      <button
                        className="p-1.5 rounded-md text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                        onClick={() => handleDeleteSprint(currentSprint.id)}
                        title="Delete sprint"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* ── 3-column sprint board with DnD ──────────────────────────── */}
                <div className="flex-1 overflow-auto p-5">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex gap-5 min-h-full">
                      <StatusColumn status="todo" cards={groupedCards.todo} columnId={getColumnForStatus('todo')} onCardClick={setSelectedCardId} onCreateCard={handleCreateCard} />
                      <StatusColumn status="progress" cards={groupedCards.progress} columnId={getColumnForStatus('progress')} onCardClick={setSelectedCardId} onCreateCard={handleCreateCard} />
                      <StatusColumn status="done" cards={groupedCards.done} columnId={getColumnForStatus('done')} onCardClick={setSelectedCardId} onCreateCard={handleCreateCard} />
                    </div>
                    <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                      {activeCard && <SprintCard card={activeCard} overlay />}
                    </DragOverlay>
                  </DndContext>
                </div>
              </>
            ) : (
              /* No sprint selected */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-[480px] px-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-accent">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>
                  <h2 className="text-[1.15rem] font-bold text-text-primary mb-2">No sprints yet</h2>
                  <p className="text-text-secondary text-[0.85rem] mb-6">
                    Create your first sprint and add cards from the backlog to get started with Scrum.
                  </p>
                  <button
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-[0.85rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors"
                    onClick={() => { setEditingSprint(null); setShowPlanning(true); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Create Sprint
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            BACKLOG TAB
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'backlog' && (
          <div className="flex-1 overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[1.05rem] font-bold text-text-primary">Product Backlog</h2>
                <p className="text-text-muted text-[0.75rem]">
                  {backlogCards.length} card{backlogCards.length !== 1 ? 's' : ''} · {backlogCards.reduce((s, c) => s + (c.storyPoints ?? 0), 0)} story points total
                </p>
              </div>
              {selectedBulk.size > 0 && sprints.filter((s) => s.status !== 'COMPLETED').length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[0.8rem] text-accent font-medium">{selectedBulk.size} selected</span>
                  <select
                    className="px-3 py-1.5 rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.8rem] outline-none focus:border-border-focus transition-colors"
                    value={targetSprint}
                    onChange={(e) => setTargetSprint(e.target.value)}
                  >
                    <option value="">Move to sprint...</option>
                    {sprints.filter((s) => s.status !== 'COMPLETED').map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s._count?.cards ?? 0} cards)</option>
                    ))}
                  </select>
                  <button
                    className="px-3 py-1.5 rounded-md text-[0.8rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors disabled:opacity-50"
                    onClick={handleBulkMove}
                    disabled={!targetSprint}
                  >
                    Move
                  </button>
                  <button
                    className="px-2 py-1.5 rounded-md text-[0.75rem] text-text-muted hover:bg-white/[0.06] transition-colors"
                    onClick={() => setSelectedBulk(new Set())}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {backlogCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20 gap-3">
                <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-success/10 text-success mb-2">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h3 className="text-[1rem] text-text-primary font-semibold">Backlog is empty</h3>
                <p className="text-text-secondary text-[0.85rem] max-w-[360px]">
                  All cards are assigned to sprints. Create new cards in the Kanban board to add them here.
                </p>
                <button
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[0.82rem] font-medium text-text-secondary hover:bg-white/[0.06] transition-colors"
                  onClick={() => navigate(`/boards/${boardId}`)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
                  Go to Kanban Board
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-border-subtle overflow-hidden">
                {/* Table header */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-bg-surface border-b border-border-subtle text-[0.68rem] font-bold text-text-muted uppercase tracking-wider">
                  <div className="w-7">
                    <input
                      type="checkbox"
                      className="rounded accent-accent cursor-pointer"
                      checked={selectedBulk.size === backlogCards.length && backlogCards.length > 0}
                      onChange={() => setSelectedBulk(selectedBulk.size === backlogCards.length ? new Set() : new Set(backlogCards.map((c) => c.id)))}
                    />
                  </div>
                  <div className="w-5" />
                  <div className="flex-1">Title</div>
                  <div className="w-[70px] text-center">Priority</div>
                  <div className="w-12 text-center">Pts</div>
                  <div className="w-[70px] text-center">Status</div>
                  <div className="w-16 text-right">Assignee</div>
                </div>

                {/* Rows */}
                {backlogCards.map((card) => (
                  <div
                    key={card.id}
                    className={`flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle last:border-b-0 transition-colors ${selectedBulk.has(card.id) ? 'bg-accent/[0.06]' : 'hover:bg-white/[0.03]'
                      }`}
                  >
                    <div className="w-7">
                      <input
                        type="checkbox"
                        className="rounded accent-accent cursor-pointer"
                        checked={selectedBulk.has(card.id)}
                        onChange={() => toggleBulk(card.id)}
                      />
                    </div>
                    <div className="w-5"><TypeIcon type={card.type ?? 'task'} size={14} /></div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedCardId(card.id)}>
                      <p className="text-[0.82rem] font-medium text-text-primary truncate hover:text-accent transition-colors">{card.title}</p>
                      {card.labels.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {card.labels.slice(0, 3).map((l) => {
                            const info = LABEL_OPTIONS.find((o) => o.value === l);
                            return info ? (
                              <span key={l} className="text-[0.5rem] font-bold uppercase px-1 py-[0px] rounded" style={{ color: info.color, background: info.bg }}>
                                {info.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                    <div className="w-[70px] text-center">
                      {card.priority && (
                        <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded" style={{ color: getPriorityColor(card.priority), background: `${getPriorityColor(card.priority)}15` }}>
                          {PRIORITIES.find((p) => p.value === card.priority)?.label}
                        </span>
                      )}
                    </div>
                    <div className="w-12 text-center">
                      <span className={`text-[0.78rem] font-bold ${card.storyPoints != null ? 'text-accent' : 'text-text-muted'}`}>
                        {card.storyPoints ?? '–'}
                      </span>
                    </div>
                    <div className="w-[70px] text-center">
                      <span className="text-[0.6rem] font-medium px-1.5 py-0.5 rounded bg-white/[0.06] text-text-muted">
                        {card.column?.name ?? '–'}
                      </span>
                    </div>
                    <div className="w-16 text-right">
                      {card.assignee ? (
                        <span className="w-5 h-5 rounded-full bg-accent/60 inline-flex items-center justify-center text-[0.55rem] font-bold text-white" title={card.assignee.name}>
                          {card.assignee.name.charAt(0).toUpperCase()}
                        </span>
                      ) : <span className="text-text-muted text-[0.7rem]">–</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            BURNDOWN TAB
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'burndown' && activeSprint && <BurndownChart sprintId={activeSprint.id} />}
        {activeTab === 'burndown' && !activeSprint && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-text-muted text-[0.9rem] mb-2">No active sprint</p>
              <p className="text-text-muted text-[0.75rem]">Start a sprint to see the burndown chart</p>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            VELOCITY TAB
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'velocity' && boardId && <VelocityChart boardId={boardId} />}
      </main>

      {/* Card Detail Panel */}
      {selectedCardId && (
        <CardDetailPanel
          cardId={selectedCardId}
          columnName=""
          columns={(board?.columns ?? []).map((c) => ({ id: c.id, name: c.name }))}
          workspaceId={board?.workspaceId ?? ''}
          onClose={() => setSelectedCardId(null)}
          onUpdate={fetchData}
          onDelete={async (id) => {
            try { await api.delete(`/cards/${id}`); setSelectedCardId(null); await fetchData(); } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to delete card'); }
          }}
          onDuplicate={async () => { setSelectedCardId(null); await fetchData(); }}
        />
      )}

      {/* Sprint Planning Modal */}
      {showPlanning && boardId && (
        <SprintPlanningModal
          boardId={boardId}
          sprint={editingSprint}
          onClose={() => { setShowPlanning(false); setEditingSprint(null); }}
          onSaved={() => { setShowPlanning(false); setEditingSprint(null); fetchData(); }}
        />
      )}

      {/* Share Modal */}
      {boardId && <ShareModal resourceType="board" resourceId={boardId} open={shareOpen} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
