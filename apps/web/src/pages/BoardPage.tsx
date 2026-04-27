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
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { Modal } from '../components/Modal';
import { BoardTabs } from '../components/BoardTabs';
import { CardDetailPanel, PRIORITIES, LABEL_OPTIONS, TypeIcon } from '../components/CardDetailPanel';
import { WorkspaceSummaryPage } from './WorkspaceSummaryPage';
import { useAuthStore } from '../lib/auth-store';
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
  menuOpen,
  onToggleMenu,
  renamingId,
  renamingName,
  onStartRename,
  onRenamingNameChange,
  onRenameSubmit,
  onCancelRename,
  onDeleteColumn,
}: {
  column: Column;
  onCardClick: (card: Card) => void;
  onAddCard: (e: React.FormEvent, columnId: string) => void;
  addingCardCol: string | null;
  setAddingCardCol: (id: string | null) => void;
  newCardTitle: string;
  setNewCardTitle: (v: string) => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  renamingId: string | null;
  renamingName: string;
  onStartRename: () => void;
  onRenamingNameChange: (v: string) => void;
  onRenameSubmit: () => void;
  onCancelRename: () => void;
  onDeleteColumn: () => void;
}) {
  const status = getColumnStatus(column.name);
  const colors = STATUS_COLORS[status];
  const cardIds = column.cards.map((c) => c.id);
  const isRenaming = renamingId === column.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${column.id}`,
    data: { type: 'column', column },
  });

  const colStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={colStyle} className="w-[290px] shrink-0 flex flex-col max-h-[calc(100vh-var(--spacing-topnav)-7rem)] animate-fade-in">
      {/* Column header — drag handle via spread listeners */}
      <div className={`flex items-center gap-2 mb-3 px-1 border-t-[3px] pt-3 ${colors.border} group/colhdr cursor-grab active:cursor-grabbing`} {...attributes} {...listeners}>
        <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
        {isRenaming ? (
          <input
            className="flex-1 font-semibold text-[0.825rem] text-text-primary bg-bg-input border border-border-focus rounded px-2 py-0.5 outline-none uppercase tracking-[0.04em]"
            value={renamingName}
            onChange={(e) => onRenamingNameChange(e.target.value)}
            onBlur={onRenameSubmit}
            onKeyDown={(e) => { if (e.key === 'Enter') onRenameSubmit(); if (e.key === 'Escape') onCancelRename(); }}
            autoFocus
          />
        ) : (
          <h4 className="font-semibold text-[0.825rem] text-text-secondary uppercase tracking-[0.04em] flex-1">{column.name}</h4>
        )}
        <span className={`text-[0.7rem] font-semibold px-[7px] py-[2px] rounded-full text-text-muted ${colors.bg}`}>
          {column.cards.length}
        </span>
        {/* Context menu trigger */}
        <div className="relative">
          <button
            className="p-1 rounded text-text-muted opacity-0 group-hover/colhdr:opacity-100 hover:bg-white/10 hover:text-text-primary transition-all"
            onClick={onToggleMenu}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
          </button>
          {menuOpen && (
            <div className="absolute top-full right-0 mt-1 w-[140px] bg-bg-card border border-border-subtle rounded-lg shadow-xl z-20 py-1">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-[0.8rem] text-text-primary hover:bg-white/10 transition-colors text-left" onClick={() => { onToggleMenu(); onStartRename(); }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                Rename
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-[0.8rem] text-danger hover:bg-danger/10 transition-colors text-left" onClick={() => { onToggleMenu(); onDeleteColumn(); }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card list */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto pb-2 pr-1 min-h-[60px]">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {column.cards.length === 0 && (
            <div className="text-center py-8 text-text-muted text-[0.8rem] bg-white/[0.05] rounded-lg border border-dashed border-border-subtle">
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
              <button type="button" className="px-3 py-1.5 rounded-md text-[0.8rem] font-medium text-text-secondary hover:bg-white/10 transition-colors" onClick={() => setAddingCardCol(null)}>Cancel</button>
            </div>
          </form>
        ) : (
          <button
            className="mt-1 flex items-center gap-2 w-full py-2 px-2 rounded-lg text-text-muted text-[0.8rem] font-medium transition-colors hover:bg-white/[0.12] hover:text-text-secondary"
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
  const [activeTab, setActiveTab] = useState<'summary' | 'board' | 'settings'>('summary');
  const [wsName, setWsName] = useState('');
  const [wsSlug, setWsSlug] = useState('');
  const [wsPlan, setWsPlan] = useState('');
  const [editingWsName, setEditingWsName] = useState(false);
  const [wsNameDraft, setWsNameDraft] = useState('');
  const [confirmDeleteWs, setConfirmDeleteWs] = useState(false);
  const navigate = useNavigate();

  const fetchWorkspace = async () => {
    try {
      const data = await api.get<{ name: string; slug: string; plan: string }>(`/workspaces/${workspaceId}`);
      setWsName(data.name); setWsSlug(data.slug); setWsPlan(data.plan);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to load workspace'); }
  };

  const fetchBoards = async () => {
    try {
      const data = await api.get<BoardSummary[]>(`/workspaces/${workspaceId}/boards`);
      setBoards(data);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to load boards'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWorkspace(); fetchBoards(); }, [workspaceId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newBoard = await api.post<{ id: string }>(`/workspaces/${workspaceId}/boards`, { name: boardName });
      setShowCreate(false);
      setBoardName('');
      navigate(`/boards/${newBoard.id}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to create board'); }
  };

  const renameWorkspace = async () => {
    setEditingWsName(false);
    if (!wsNameDraft.trim() || wsNameDraft === wsName) return;
    try {
      await api.patch(`/workspaces/${workspaceId}`, { name: wsNameDraft });
      fetchWorkspace();
      toast.success('Workspace renamed');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to rename workspace'); }
  };

  const deleteWorkspace = async () => {
    try {
      await api.delete(`/workspaces/${workspaceId}`);
      navigate('/dashboard');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to delete workspace'); }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
        <TopNav
          title={wsName || 'Workspace'}
          subtitle={wsSlug ? `/${wsSlug} · ${wsPlan}` : ''}
          actions={
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-transparent text-text-secondary hover:bg-white/10 hover:text-text-primary" onClick={() => navigate('/dashboard')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                Back
              </button>
              <button className="inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-accent text-white hover:bg-[#5558e6]" onClick={() => setShowCreate(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Board
              </button>
            </div>
          }
        />

        {/* Tab Bar */}
        <div className="flex items-center gap-0 px-6 border-b border-border-subtle bg-bg-root">
          {(['summary', 'board', 'settings'] as const).map((tab) => (
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
              {tab === 'summary' ? 'Summary' : tab === 'board' ? 'Board' : 'Settings'}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'summary' ? (
          <WorkspaceSummaryPage workspaceId={workspaceId!} />
        ) : activeTab === 'settings' ? (
          /* ═══ Settings tab ═══ */
          <div className="flex-1 p-6 max-w-[600px]">
            <h3 className="text-[1rem] font-semibold text-text-primary mb-6">Workspace Settings</h3>

            {/* Rename */}
            <div className="bg-bg-card border border-border-subtle rounded-lg p-5 mb-4">
              <h4 className="text-[0.85rem] font-semibold text-text-primary mb-3">Workspace Name</h4>
              {editingWsName ? (
                <div className="flex items-center gap-3">
                  <input
                    className="flex-1 px-3 py-2 rounded-md border border-border-focus bg-bg-input text-text-primary text-[0.85rem] outline-none"
                    value={wsNameDraft}
                    onChange={(e) => setWsNameDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') renameWorkspace(); if (e.key === 'Escape') setEditingWsName(false); }}
                    autoFocus
                  />
                  <button className="px-4 py-2 rounded-md text-[0.8rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors" onClick={renameWorkspace}>Save</button>
                  <button className="px-4 py-2 rounded-md text-[0.8rem] font-medium text-text-muted hover:bg-white/10 transition-colors" onClick={() => setEditingWsName(false)}>Cancel</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-[0.85rem] text-text-secondary">{wsName}</span>
                  <button className="px-4 py-2 rounded-md text-[0.8rem] font-medium text-text-secondary hover:bg-white/10 transition-colors" onClick={() => { setWsNameDraft(wsName); setEditingWsName(true); }}>
                    Rename
                  </button>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="bg-bg-card border border-border-subtle rounded-lg p-5 mb-4">
              <h4 className="text-[0.85rem] font-semibold text-text-primary mb-3">Details</h4>
              <div className="flex flex-col gap-2 text-[0.825rem]">
                <div className="flex justify-between"><span className="text-text-muted">Slug</span><span className="text-text-secondary">/{wsSlug}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Plan</span><span className="text-text-secondary font-medium">{wsPlan}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Boards</span><span className="text-text-secondary">{boards.length}</span></div>
              </div>
            </div>

            {/* Danger zone */}
            <div className="bg-bg-card border border-danger/30 rounded-lg p-5">
              <h4 className="text-[0.85rem] font-semibold text-danger mb-2">Danger Zone</h4>
              <p className="text-[0.8rem] text-text-muted mb-4">Deleting this workspace will permanently remove all boards, columns, and cards.</p>
              {confirmDeleteWs ? (
                <div className="flex items-center gap-3">
                  <span className="text-[0.8rem] text-danger font-medium">Are you sure?</span>
                  <button className="px-4 py-2 rounded-md text-[0.8rem] font-medium bg-danger text-white hover:bg-red-600 transition-colors" onClick={deleteWorkspace}>Yes, delete</button>
                  <button className="px-4 py-2 rounded-md text-[0.8rem] font-medium text-text-muted hover:bg-white/10 transition-colors" onClick={() => setConfirmDeleteWs(false)}>Cancel</button>
                </div>
              ) : (
                <button className="px-4 py-2 rounded-md text-[0.8rem] font-medium text-danger border border-danger/30 hover:bg-danger/10 transition-colors" onClick={() => setConfirmDeleteWs(true)}>
                  Delete Workspace
                </button>
              )}
            </div>
          </div>
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

import { useRealtime } from '../hooks/useRealtime';

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  useRealtime(boardId);
  const dbUser = useAuthStore((s) => s.dbUser);
  const isFree = dbUser?.subscription === 'FREE';
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
  const [filterType, setFilterType] = useState<string>('');
  const [filterLabel, setFilterLabel] = useState<string>('');
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [editingBoardName, setEditingBoardName] = useState(false);
  const [boardNameDraft, setBoardNameDraft] = useState('');
  const [confirmDeleteBoard, setConfirmDeleteBoard] = useState(false);
  const [columnMenuId, setColumnMenuId] = useState<string | null>(null);
  const [renamingColId, setRenamingColId] = useState<string | null>(null);
  const [renamingColName, setRenamingColName] = useState('');
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const fetchBoard = async () => {
    try {
      const data = await api.get<Board>(`/boards/${boardId}`);
      setBoard(data);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to load board'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBoard(); }, [boardId]);

  // Filter cards
  const filteredBoard = useMemo(() => {
    if (!board) return null;
    if (!searchQuery && !filterPriority && !filterType && !filterLabel) return board;
    const q = searchQuery.toLowerCase();
    return {
      ...board,
      columns: board.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((card) => {
          if (q && !card.title.toLowerCase().includes(q) && !(card.body ?? '').toLowerCase().includes(q)) return false;
          if (filterPriority && card.priority !== filterPriority) return false;
          if (filterType && (card.type ?? 'task') !== filterType) return false;
          if (filterLabel && !card.labels.includes(filterLabel)) return false;
          return true;
        }),
      })),
    };
  }, [board, searchQuery, filterPriority, filterType, filterLabel]);

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
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to add column'); }
  };

  const addCard = async (e: React.FormEvent, columnId: string) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;
    try {
      await api.post(`/columns/${columnId}/cards`, { title: newCardTitle });
      setNewCardTitle('');
      setAddingCardCol(null);
      fetchBoard();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to add card'); }
  };

  const deleteCard = async (cardId: string) => {
    try {
      await api.delete(`/cards/${cardId}`);
      setSelectedCardId(null);
      fetchBoard();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to delete card'); }
  };

  const duplicateCard = async (cardId: string) => {
    try {
      await api.post(`/cards/${cardId}/duplicate`);
      setSelectedCardId(null);
      fetchBoard();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to duplicate card'); }
  };

  const renameBoardSave = async () => {
    setEditingBoardName(false);
    if (!boardNameDraft.trim() || boardNameDraft === board?.name) return;
    try {
      await api.patch(`/boards/${boardId}`, { name: boardNameDraft });
      fetchBoard();
      toast.success('Board renamed');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to rename board'); }
  };

  const deleteBoardConfirm = async () => {
    try {
      await api.delete(`/boards/${boardId}`);
      navigate(board ? `/workspaces/${board.workspaceId}` : '/dashboard');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to delete board'); }
  };

  const renameColumn = async (colId: string) => {
    if (!renamingColName.trim()) return;
    try {
      await api.patch(`/columns/${colId}`, { name: renamingColName });
      setRenamingColId(null);
      fetchBoard();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to rename column'); }
  };

  const deleteColumn = async (colId: string) => {
    try {
      await api.delete(`/columns/${colId}`);
      setColumnMenuId(null);
      fetchBoard();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to delete column'); }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !selectedCardId) {
        e.preventDefault();
        const firstCol = board?.columns[0];
        if (firstCol) { setAddingCardCol(firstCol.id); setNewCardTitle(''); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [board, selectedCardId]);

  // ── Drag and Drop ───────────────────────────────────────────────────────

  const findColumnByCardId = (cardId: string): Column | undefined => {
    return board?.columns.find((col) => col.cards.some((c) => c.id === cardId));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Check if dragging a column
    const activeId = active.id as string;
    if (activeId.startsWith('column-')) {
      setActiveCard(null);
      return;
    }
    const card = board?.columns
      .flatMap((c) => c.cards)
      .find((c) => c.id === activeId);
    setActiveCard(card ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !board) return;

    const activeId = active.id as string;
    // Skip column-over-column (handled in dragEnd)
    if (activeId.startsWith('column-')) return;

    const activeCol = findColumnByCardId(activeId);
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

    const activeId = active.id as string;
    const overId = over.id as string;

    // ── Column reorder ──
    if (activeId.startsWith('column-') && overId.startsWith('column-')) {
      const oldIndex = board.columns.findIndex((c) => `column-${c.id}` === activeId);
      const newIndex = board.columns.findIndex((c) => `column-${c.id}` === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(board.columns, oldIndex, newIndex);
      setBoard({ ...board, columns: reordered });

      // Persist new ranks
      try {
        await Promise.all(
          reordered.map((col, i) =>
            api.patch(`/columns/${col.id}/move`, { rank: String(i) })
          )
        );
        fetchBoard();
      } catch { fetchBoard(); }
      return;
    }

    // ── Card reorder ──
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
          title={editingBoardName ? '' : (board?.name ?? 'Board')}
          subtitle={editingBoardName ? '' : `${board?.columns.length ?? 0} columns · ${totalCards} cards`}
          actions={
            <div className="flex items-center gap-2">
              {editingBoardName ? (
                <input
                  className="px-3 py-[6px] rounded-md border border-border-focus bg-bg-input text-text-primary text-[0.875rem] outline-none w-[200px]"
                  value={boardNameDraft}
                  onChange={(e) => setBoardNameDraft(e.target.value)}
                  onBlur={renameBoardSave}
                  onKeyDown={(e) => { if (e.key === 'Enter') renameBoardSave(); if (e.key === 'Escape') setEditingBoardName(false); }}
                  autoFocus
                />
              ) : (
                <button className="p-2 rounded-md text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors" title="Rename board" onClick={() => { setBoardNameDraft(board?.name ?? ''); setEditingBoardName(true); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
              )}
              {confirmDeleteBoard ? (
                <div className="flex items-center gap-2">
                  <span className="text-[0.8rem] text-danger">Delete board?</span>
                  <button className="px-3 py-1 rounded-md text-[0.75rem] font-medium bg-danger text-white" onClick={deleteBoardConfirm}>Yes</button>
                  <button className="px-3 py-1 rounded-md text-[0.75rem] font-medium text-text-muted" onClick={() => setConfirmDeleteBoard(false)}>No</button>
                </div>
              ) : (
                <button className="p-2 rounded-md text-text-muted hover:bg-danger/10 hover:text-danger transition-colors" title="Delete board" onClick={() => setConfirmDeleteBoard(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
              )}
              <button
                className="p-2 rounded-md text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors"
                title="Export board as JSON"
                onClick={() => {
                  if (!board) return;
                  const data = JSON.stringify(board, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${board.name.replace(/\s+/g, '_')}_export.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              <div className="w-px h-5 bg-border-subtle mx-1" />
              <button
                className="inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-transparent text-text-secondary hover:bg-white/10 hover:text-text-primary"
                onClick={() => navigate(`/boards/${boardId}/scrum`)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                Scrum Board
                {isFree && <span className="ml-1 px-[5px] py-[1px] rounded text-[0.6rem] font-bold uppercase tracking-wide bg-warning/15 text-warning">Pro</span>}
              </button>
              <div className="w-px h-5 bg-border-subtle mx-1" />
              <button className="inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-transparent text-text-secondary hover:bg-white/10 hover:text-text-primary" onClick={() => board && navigate(`/workspaces/${board.workspaceId}`)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                Boards
              </button>
            </div>
          }
        />
        <BoardTabs boardId={boardId!} />

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

          <select
            className="px-3 py-[7px] rounded-md border border-border-subtle bg-bg-input text-text-secondary text-[0.8rem] outline-none focus:border-border-focus cursor-pointer transition-colors appearance-none pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235c5d6a' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All types</option>
            <option value="task">Task</option>
            <option value="story">Story</option>
            <option value="bug">Bug</option>
            <option value="subtask">Subtask</option>
          </select>

          <select
            className="px-3 py-[7px] rounded-md border border-border-subtle bg-bg-input text-text-secondary text-[0.8rem] outline-none focus:border-border-focus cursor-pointer transition-colors appearance-none pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235c5d6a' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            value={filterLabel}
            onChange={(e) => setFilterLabel(e.target.value)}
          >
            <option value="">All labels</option>
            {LABEL_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>

          {(searchQuery || filterPriority || filterType || filterLabel) && (
            <button
              className="text-[0.75rem] text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
              onClick={() => { setSearchQuery(''); setFilterPriority(''); setFilterType(''); setFilterLabel(''); }}
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
            <SortableContext items={filteredBoard?.columns.map(c => `column-${c.id}`) ?? []} strategy={horizontalListSortingStrategy}>
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
                menuOpen={columnMenuId === col.id}
                onToggleMenu={() => setColumnMenuId(columnMenuId === col.id ? null : col.id)}
                renamingId={renamingColId}
                renamingName={renamingColName}
                onStartRename={() => { setRenamingColId(col.id); setRenamingColName(col.name); }}
                onRenamingNameChange={setRenamingColName}
                onRenameSubmit={() => renameColumn(col.id)}
                onCancelRename={() => setRenamingColId(null)}
                onDeleteColumn={() => deleteColumn(col.id)}
              />
            ))}
            </SortableContext>

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
                    <button type="button" className="px-3 py-1.5 rounded-md text-[0.8rem] font-medium text-text-secondary hover:bg-white/10 transition-colors" onClick={() => setAddingCol(false)}>Cancel</button>
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
          onDuplicate={duplicateCard}
        />
      )}
    </div>
  );
}
