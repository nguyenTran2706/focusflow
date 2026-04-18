import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { Modal } from '../components/Modal';
import { CardDetailPanel, PRIORITIES, LABEL_OPTIONS, TypeIcon } from '../components/CardDetailPanel';
import { WorkspaceSummaryPage } from './WorkspaceSummaryPage';
import { api } from '../lib/api';

// ── Types ───────────────────────────────────────────────────────────────────

interface Card {
  id: string;
  title: string;
  body?: string;
  priority?: string;
  type?: string;
  labels: string[];
  author?: { id: string; name: string };
  assignee?: { id: string; name: string } | null;
  assigneeId?: string;
  dueDate?: string | null;
  startDate?: string | null;
  rank?: string;
  _count?: { comments: number };
  createdAt?: string;
}

interface Column {
  id: string;
  name: string;
  rank: string;
  cards: Card[];
}

interface Board {
  id: string;
  name: string;
  workspaceId: string;
  columns: Column[];
}

interface BoardSummary {
  id: string;
  name: string;
  _count?: { columns: number };
}

// ── Priority helpers ────────────────────────────────────────────────────────

function getPriorityColor(priority?: string): string {
  switch (priority) {
    case 'urgent': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#3b82f6';
    default: return 'transparent';
  }
}

function getPriorityIcon(priority?: string) {
  if (!priority) return null;
  const color = getPriorityColor(priority);
  const info = PRIORITIES.find((p) => p.value === priority);
  if (!info) return null;
  return (
    <span title={info.label} className="flex items-center gap-1 text-[0.65rem] font-semibold px-1.5 py-0.5 rounded" style={{ color, background: `${color}18` }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
      {info.label}
    </span>
  );
}

// ── Column status (Jira-style) ──────────────────────────────────────────────

function getColumnStatus(name: string): string {
  const lower = name.toLowerCase().trim();
  if (lower === 'to do' || lower === 'todo' || lower === 'backlog') return 'todo';
  if (lower.includes('progress') || lower.includes('review') || lower === 'doing') return 'progress';
  if (lower === 'done' || lower === 'complete' || lower === 'completed') return 'done';
  return 'default';
}

const STATUS_COLORS: Record<string, { border: string; dot: string; bg: string }> = {
  todo: { border: 'border-t-[#6b7280]', dot: 'bg-[#6b7280]', bg: 'bg-[#6b7280]/5' },
  progress: { border: 'border-t-warning', dot: 'bg-warning', bg: 'bg-warning/5' },
  done: { border: 'border-t-success', dot: 'bg-success', bg: 'bg-success/5' },
  default: { border: 'border-t-accent', dot: 'bg-accent', bg: 'bg-accent/5' },
};

// ── Due date helpers ────────────────────────────────────────────────────────

function isDueDateOverdue(dueDate?: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function formatDueDate(dueDate: string): string {
  const d = new Date(dueDate);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Sortable Card ───────────────────────────────────────────────────────────

function SortableCard({ card, onClick }: { card: Card; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardItem card={card} onClick={onClick} />
    </div>
  );
}

function CardItem({ card, onClick, isOverlay }: { card: Card; onClick?: () => void; isOverlay?: boolean }) {
  const priorityColor = getPriorityColor(card.priority);
  const hasLeftBorder = card.priority && card.priority !== '';
  const overdue = isDueDateOverdue(card.dueDate);

  return (
    <div
      className={`bg-bg-surface border border-border-subtle rounded-lg cursor-pointer select-none shadow-sm transition-all group
        ${isOverlay ? 'shadow-xl rotate-[2deg] scale-105' : 'hover:-translate-y-[1px] hover:shadow-md hover:border-white/10'}
      `}
      style={hasLeftBorder ? { borderLeftWidth: '3px', borderLeftColor: priorityColor } : undefined}
      onClick={onClick}
    >
      {/* Labels row */}
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pt-3">
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

      {/* Title + Type */}
      <div className="px-3 pt-2.5 pb-2">
        <div className="flex items-start gap-2">
          <TypeIcon type={card.type ?? 'task'} size={14} />
          <p className="font-medium text-[0.85rem] text-text-primary leading-snug flex-1">{card.title}</p>
        </div>
        {card.body && <p className="text-text-muted text-[0.75rem] line-clamp-2 leading-relaxed mt-1 pl-[22px]">{card.body}</p>}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 pb-2.5 gap-2">
        <div className="flex items-center gap-1.5">
          {getPriorityIcon(card.priority)}
          {/* Due date badge */}
          {card.dueDate && (
            <span className={`flex items-center gap-1 text-[0.65rem] font-medium px-1.5 py-0.5 rounded ${overdue ? 'bg-danger/15 text-danger' : 'bg-white/[0.06] text-text-muted'}`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formatDueDate(card.dueDate)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(card._count?.comments ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-text-muted text-[0.7rem]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              {card._count?.comments}
            </span>
          )}
          {/* Assignee avatar */}
          {card.assignee ? (
            <div className="w-5 h-5 rounded-full bg-accent/60 flex items-center justify-center text-[0.55rem] font-bold text-white shrink-0" title={card.assignee.name}>
              {card.assignee.name.charAt(0).toUpperCase()}
            </div>
          ) : card.author ? (
            <div className="w-5 h-5 rounded-full bg-accent/40 flex items-center justify-center text-[0.55rem] font-bold text-white shrink-0" title={card.author.name}>
              {card.author.name.charAt(0).toUpperCase()}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Droppable Column ────────────────────────────────────────────────────────

function DroppableColumn({
  column,
  onCardClick,
  onAddCard,
  addingCardCol,
  setAddingCardCol,
  newCardTitle,
  setNewCardTitle,
}: {
  column: Column;
  onCardClick: (card: Card) => void;
  onAddCard: (e: React.FormEvent, columnId: string) => void;
  addingCardCol: string | null;
  setAddingCardCol: (id: string | null) => void;
  newCardTitle: string;
  setNewCardTitle: (v: string) => void;
}) {
  const status = getColumnStatus(column.name);
  const colors = STATUS_COLORS[status];
  const cardIds = column.cards.map((c) => c.id);

  const { setNodeRef } = useSortable({
    id: `column-${column.id}`,
    data: { type: 'column', column },
    disabled: true,
  });

  return (
    <div className="w-[290px] shrink-0 flex flex-col max-h-[calc(100vh-var(--spacing-topnav)-7rem)] animate-fade-in">
      {/* Column header */}
      <div className={`flex items-center gap-2 mb-3 px-1 border-t-[3px] pt-3 ${colors.border}`}>
        <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
        <h4 className="font-semibold text-[0.825rem] text-text-secondary uppercase tracking-[0.04em] flex-1">{column.name}</h4>
        <span className={`text-[0.7rem] font-semibold px-[7px] py-[2px] rounded-full text-text-muted ${colors.bg}`}>
          {column.cards.length}
        </span>
      </div>

      {/* Card list */}
      <div ref={setNodeRef} className="flex-1 flex flex-col gap-2 overflow-y-auto pb-2 pr-1 min-h-[60px]">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {column.cards.length === 0 && (
            <div className="text-center py-8 text-text-muted text-[0.8rem] bg-white/[0.015] rounded-lg border border-dashed border-border-subtle">
              <svg className="mx-auto mb-2 opacity-40" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Drop cards here
            </div>
          )}
          {column.cards.map((card) => (
            <SortableCard key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </SortableContext>

        {/* Add card form */}
        {addingCardCol === column.id ? (
          <form onSubmit={(e) => onAddCard(e, column.id)} className="flex flex-col gap-2 p-2.5 rounded-lg bg-bg-card border border-border-subtle">
            <input
              className="px-3 py-2 rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.825rem] outline-none focus:border-border-focus placeholder:text-text-muted w-full transition-colors"
              placeholder="What needs to be done?"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Escape') setAddingCardCol(null); }}
            />
            <div className="flex items-center gap-2">
              <button type="submit" className="px-3 py-1.5 rounded-md text-[0.8rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors">Add card</button>
              <button type="button" className="px-3 py-1.5 rounded-md text-[0.8rem] font-medium text-text-secondary hover:bg-white/5 transition-colors" onClick={() => setAddingCardCol(null)}>Cancel</button>
            </div>
          </form>
        ) : (
          <button
            className="mt-1 flex items-center gap-2 w-full py-2 px-2 rounded-lg text-text-muted text-[0.8rem] font-medium transition-colors hover:bg-white/[0.03] hover:text-text-secondary"
            onClick={() => { setAddingCardCol(column.id); setNewCardTitle(''); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add a card
          </button>
        )}
      </div>
    </div>
  );
}

// ── Workspace Page (with Summary / Board tabs) ──────────────────────────────

export function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'board'>('summary');
  const navigate = useNavigate();

  const fetchBoards = async () => {
    try {
      const data = await api.get<BoardSummary[]>(`/workspaces/${workspaceId}/boards`);
      setBoards(data);
    } catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBoards(); }, [workspaceId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newBoard = await api.post<{ id: string }>(`/workspaces/${workspaceId}/boards`, { name: boardName });
      setShowCreate(false);
      setBoardName('');
      navigate(`/boards/${newBoard.id}`);
    } catch { /* */ }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
        <TopNav
          title="Workspace"
          actions={
            <>
              <button className="inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary" onClick={() => navigate('/dashboard')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                Back
              </button>
              <button className="inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-accent text-white hover:bg-[#5558e6]" onClick={() => setShowCreate(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Board
              </button>
            </>
          }
        />

        {/* Tab Bar */}
        <div className="flex items-center gap-0 px-6 border-b border-border-subtle bg-bg-root">
          {(['summary', 'board'] as const).map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2.5 text-[0.8rem] font-semibold transition-colors relative capitalize
                ${activeTab === tab
                  ? 'text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
                }
              `}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'summary' ? 'Summary' : 'Board'}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'summary' ? (
          <WorkspaceSummaryPage workspaceId={workspaceId!} />
        ) : (
          <div className="flex-1 p-6">
            {loading ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-[150px] rounded-lg bg-bg-card border border-border-subtle animate-[pulse_1.5s_ease_infinite]" />)}
              </div>
            ) : boards.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-8 gap-3 animate-fade-in">
                <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-accent-subtle text-accent-light mb-2">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
                  </svg>
                </div>
                <h2 className="text-[1.15rem]">No boards yet</h2>
                <p className="text-text-secondary max-w-[360px] text-[0.875rem]">Create your first Kanban board to start managing tasks.</p>
                <button className="mt-3 inline-flex items-center justify-center gap-[6px] px-5 py-2.5 rounded-md text-[0.9rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors" onClick={() => setShowCreate(true)}>Create Board</button>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 animate-fade-in">
                {boards.map((b, i) => (
                  <div key={b.id} className="cursor-pointer animate-fade-in bg-bg-card border border-border-subtle rounded-lg p-5 transition-all hover:bg-bg-card-hover hover:-translate-y-[1px] hover:shadow-lg" style={{ animationDelay: `${i * 60}ms` }} onClick={() => navigate(`/boards/${b.id}`)}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-[34px] h-[34px] rounded-md flex items-center justify-center font-semibold text-[0.95rem] text-white" style={{ background: `hsl(${(i * 60 + 250) % 360}, 60%, 55%)` }}>
                        {b.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <h3 className="text-[0.95rem] mb-[2px]">{b.name}</h3>
                    <div className="flex gap-3 text-text-secondary text-[0.8rem]">
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
                        {b._count?.columns ?? 0} columns
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Board">
        <form onSubmit={handleCreate} className="flex flex-col">
          <div className="flex flex-col gap-[6px]">
            <label htmlFor="board-name" className="text-[0.8rem] font-medium text-text-secondary">Board name</label>
            <input id="board-name" className="px-3 py-[9px] rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.875rem] transition-colors outline-none focus:border-border-focus placeholder:text-text-muted w-full" type="text" placeholder="Sprint Board" value={boardName} onChange={(e) => setBoardName(e.target.value)} required autoFocus />
          </div>
          <button type="submit" className="mt-6 inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-accent text-white hover:bg-[#5558e6] w-full">Create Board</button>
        </form>
      </Modal>
    </div>
  );
}

// ── Board Page ──────────────────────────────────────────────────────────────

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [addingCardCol, setAddingCardCol] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedColumnName, setSelectedColumnName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const fetchBoard = async () => {
    try {
      const data = await api.get<Board>(`/boards/${boardId}`);
      setBoard(data);
    } catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBoard(); }, [boardId]);

  // Filter cards
  const filteredBoard = useMemo(() => {
    if (!board) return null;
    if (!searchQuery && !filterPriority) return board;
    const q = searchQuery.toLowerCase();
    return {
      ...board,
      columns: board.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((card) => {
          if (q && !card.title.toLowerCase().includes(q) && !(card.body ?? '').toLowerCase().includes(q)) return false;
          if (filterPriority && card.priority !== filterPriority) return false;
          return true;
        }),
      })),
    };
  }, [board, searchQuery, filterPriority]);

  const totalCards = board?.columns.reduce((sum, col) => sum + col.cards.length, 0) ?? 0;

  // Column list for CardDetailPanel status dropdown
  const columnOptions = useMemo(() => {
    return board?.columns.map(c => ({ id: c.id, name: c.name })) ?? [];
  }, [board]);

  const addColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    try {
      await api.post(`/boards/${boardId}/columns`, { name: newColName });
      setNewColName('');
      setAddingCol(false);
      fetchBoard();
    } catch { /* */ }
  };

  const addCard = async (e: React.FormEvent, columnId: string) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;
    try {
      await api.post(`/columns/${columnId}/cards`, { title: newCardTitle });
      setNewCardTitle('');
      setAddingCardCol(null);
      fetchBoard();
    } catch { /* */ }
  };

  const deleteCard = async (cardId: string) => {
    try {
      await api.delete(`/cards/${cardId}`);
      setSelectedCardId(null);
      fetchBoard();
    } catch { /* */ }
  };

  // ── Drag and Drop ───────────────────────────────────────────────────────

  const findColumnByCardId = (cardId: string): Column | undefined => {
    return board?.columns.find((col) => col.cards.some((c) => c.id === cardId));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = board?.columns
      .flatMap((c) => c.cards)
      .find((c) => c.id === active.id);
    setActiveCard(card ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !board) return;

    const activeCol = findColumnByCardId(active.id as string);
    let overCol: Column | undefined;

    const overId = over.id as string;
    if (overId.startsWith('column-')) {
      overCol = board.columns.find((c) => `column-${c.id}` === overId);
    } else {
      overCol = findColumnByCardId(overId);
    }

    if (!activeCol || !overCol || activeCol.id === overCol.id) return;

    setBoard((prev) => {
      if (!prev) return prev;
      const card = activeCol.cards.find((c) => c.id === active.id);
      if (!card) return prev;

      return {
        ...prev,
        columns: prev.columns.map((col) => {
          if (col.id === activeCol.id) {
            return { ...col, cards: col.cards.filter((c) => c.id !== active.id) };
          }
          if (col.id === overCol.id) {
            const overIndex = col.cards.findIndex((c) => c.id === over.id);
            const newCards = [...col.cards];
            if (overIndex >= 0) {
              newCards.splice(overIndex, 0, card);
            } else {
              newCards.push(card);
            }
            return { ...col, cards: newCards };
          }
          return col;
        }),
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || !board) return;

    const overCol = board.columns.find((col) =>
      col.cards.some((c) => c.id === active.id)
    );

    if (!overCol) return;

    const cardIndex = overCol.cards.findIndex((c) => c.id === active.id);
    let rank: string;
    if (cardIndex <= 0) {
      rank = '0';
    } else {
      const prevRank = Number(overCol.cards[cardIndex - 1]?.rank ?? '0');
      rank = String(prevRank + 1);
    }

    try {
      await api.patch(`/cards/${active.id}/move`, {
        targetColumnId: overCol.id,
        rank,
      });
      fetchBoard();
    } catch {
      fetchBoard();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
          <TopNav title="Loading..." />
          <div className="flex-1 p-6 flex gap-4 overflow-hidden">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-[290px] shrink-0 flex flex-col gap-3">
                <div className="h-4 w-24 rounded bg-bg-surface animate-[pulse_1.5s_ease_infinite]" />
                {[1, 2].map(j => <div key={j} className="h-[100px] rounded-lg bg-bg-surface border border-border-subtle animate-[pulse_1.5s_ease_infinite]" />)}
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
        <TopNav
          title={board?.name ?? 'Board'}
          subtitle={`${board?.columns.length ?? 0} columns · ${totalCards} cards`}
          actions={
            <button className="inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary" onClick={() => board && navigate(`/workspaces/${board.workspaceId}`)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
              Boards
            </button>
          }
        />

        {/* Filter bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border-subtle bg-bg-root/80 backdrop-blur-sm">
          <div className="relative flex-1 max-w-[280px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              className="w-full pl-9 pr-3 py-[7px] rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.8rem] outline-none focus:border-border-focus placeholder:text-text-muted transition-colors"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="px-3 py-[7px] rounded-md border border-border-subtle bg-bg-input text-text-secondary text-[0.8rem] outline-none focus:border-border-focus cursor-pointer transition-colors appearance-none pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235c5d6a' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          {(searchQuery || filterPriority) && (
            <button
              className="text-[0.75rem] text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
              onClick={() => { setSearchQuery(''); setFilterPriority(''); }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              Clear filters
            </button>
          )}
        </div>

        {/* Board columns */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 flex gap-4 p-6 overflow-x-auto overflow-y-hidden items-start">
            {filteredBoard?.columns.map((col) => (
              <DroppableColumn
                key={col.id}
                column={col}
                onCardClick={(card) => {
                  setSelectedCardId(card.id);
                  setSelectedColumnName(col.name);
                }}
                onAddCard={addCard}
                addingCardCol={addingCardCol}
                setAddingCardCol={setAddingCardCol}
                newCardTitle={newCardTitle}
                setNewCardTitle={setNewCardTitle}
              />
            ))}

            {/* Add Column */}
            <div className="w-[290px] shrink-0 pt-3">
              {addingCol ? (
                <form onSubmit={addColumn} className="flex flex-col gap-2 p-3 rounded-lg bg-bg-card border border-border-subtle">
                  <input
                    className="px-3 py-2 rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.825rem] outline-none focus:border-border-focus placeholder:text-text-muted w-full transition-colors"
                    placeholder="Column name..."
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Escape') setAddingCol(false); }}
                  />
                  <div className="flex items-center gap-2">
                    <button type="submit" className="px-3 py-1.5 rounded-md text-[0.8rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors">Add column</button>
                    <button type="button" className="px-3 py-1.5 rounded-md text-[0.8rem] font-medium text-text-secondary hover:bg-white/5 transition-colors" onClick={() => setAddingCol(false)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button
                  className="flex items-center justify-center gap-2 w-full h-[48px] rounded-xl border-2 border-dashed border-border-subtle text-text-muted text-[0.85rem] font-medium transition-all hover:border-accent/50 hover:text-accent hover:bg-accent/5"
                  onClick={() => setAddingCol(true)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Add column
                </button>
              )}
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeCard ? <CardItem card={activeCard} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Card Detail Panel */}
      {selectedCardId && (
        <CardDetailPanel
          cardId={selectedCardId}
          columnName={selectedColumnName}
          columns={columnOptions}
          workspaceId={board?.workspaceId ?? ''}
          onClose={() => setSelectedCardId(null)}
          onUpdate={fetchBoard}
          onDelete={deleteCard}
        />
      )}
    </div>
  );
}
