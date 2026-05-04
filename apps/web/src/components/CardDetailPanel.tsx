import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';

// ── Types ────────────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
}

interface CardDetail {
  id: string;
  title: string;
  body?: string;
  priority?: string;
  type?: string;
  labels: string[];
  columnId: string;
  assigneeId?: string;
  assignee?: { id: string; name: string } | null;
  storyPoints?: number | null;
  dueDate?: string | null;
  startDate?: string | null;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string };
  comments: Comment[];
  _count?: { comments: number };
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ColumnOption {
  id: string;
  name: string;
}

interface CardDetailPanelProps {
  cardId: string | null;
  columnName: string;
  columns: ColumnOption[];
  workspaceId: string;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: (cardId: string) => void;
  onDuplicate?: (cardId: string) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { value: 'high', label: 'High', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { value: 'medium', label: 'Medium', color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  { value: 'low', label: 'Low', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
] as const;

const LABEL_OPTIONS = [
  { value: 'bug', label: 'Bug', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  { value: 'feature', label: 'Feature', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  { value: 'improvement', label: 'Improvement', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  { value: 'documentation', label: 'Docs', color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  { value: 'design', label: 'Design', color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
  { value: 'testing', label: 'Testing', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
] as const;

const CARD_TYPES = [
  { value: 'task', label: 'Task', color: '#3b82f6' },
  { value: 'story', label: 'Story', color: '#22c55e' },
  { value: 'bug', label: 'Bug', color: '#ef4444' },
  { value: 'subtask', label: 'Subtask', color: '#06b6d4' },
] as const;

export { PRIORITIES, LABEL_OPTIONS, CARD_TYPES };

// ── Type Icon ────────────────────────────────────────────────────────────────

export function TypeIcon({ type, size = 16 }: { type?: string; size?: number }) {
  const info = CARD_TYPES.find(t => t.value === type) ?? CARD_TYPES[0];
  const s = String(size);
  switch (type) {
    case 'story':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill={info.color} stroke="none">
          <path d="M6 2a2 2 0 0 0-2 2v16l8-4 8 4V4a2 2 0 0 0-2-2H6z" />
        </svg>
      );
    case 'bug':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={info.color} strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="4" fill={info.color} />
        </svg>
      );
    case 'subtask':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={info.color} strokeWidth="2" strokeLinecap="round">
          <path d="M6 3v12" /><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill={info.color} />
          <path d="M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill={info.color} />
          <path d="M15 6H9" /><path d="M9 18h6" />
        </svg>
      );
    default: // task
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={info.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
  }
}

// ── Main Component ───────────────────────────────────────────────────────────

export function CardDetailPanel({ cardId, columnName, columns, workspaceId, onClose, onUpdate, onDelete, onDuplicate }: CardDetailPanelProps) {
  const [card, setCard] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activityTab, setActivityTab] = useState<'all' | 'comments'>('all');
  const [members, setMembers] = useState<Member[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const currentUser = useAuthStore((s) => s.dbUser);

  // Fetch card
  useEffect(() => {
    if (!cardId) return;
    setLoading(true);
    setConfirmDelete(false);
    api.get<CardDetail>(`/cards/${cardId}`)
      .then((data) => {
        setCard(data);
        setTitle(data.title);
        setBody(data.body ?? '');
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [cardId]);

  // Fetch members
  useEffect(() => {
    if (!workspaceId) return;
    api.get<Member[]>(`/workspaces/${workspaceId}/members`)
      .then(setMembers)
      .catch(() => { });
  }, [workspaceId]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Click outside menus to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setShowPriorityMenu(false);
        setShowLabelMenu(false);
        setShowTypeMenu(false);
        setShowStatusMenu(false);
        setShowAssigneeMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const saveField = async (field: string, value: unknown) => {
    if (!card) return;
    try {
      const updated = await api.patch<CardDetail>(`/cards/${card.id}`, { [field]: value });
      setCard((prev) => prev ? { ...prev, ...updated } : prev);
      onUpdate();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Action failed'); }
  };

  const saveTitle = () => {
    setEditingTitle(false);
    if (title.trim() && title !== card?.title) saveField('title', title.trim());
  };

  const saveBody = () => {
    setEditingBody(false);
    if (body !== (card?.body ?? '')) saveField('body', body);
  };

  const toggleLabel = (label: string) => {
    if (!card) return;
    const newLabels = card.labels.includes(label)
      ? card.labels.filter((l) => l !== label)
      : [...card.labels, label];
    setCard({ ...card, labels: newLabels });
    saveField('labels', newLabels);
  };

  const setPriority = (priority: string | null) => {
    if (!card) return;
    const value = priority === card.priority ? null : priority;
    setCard({ ...card, priority: value ?? undefined });
    saveField('priority', value ?? '');
    setShowPriorityMenu(false);
  };

  const setType = (type: string) => {
    if (!card) return;
    setCard({ ...card, type });
    saveField('type', type);
    setShowTypeMenu(false);
  };

  const setAssignee = (memberId: string | null) => {
    if (!card) return;
    const member = members.find(m => m.id === memberId);
    setCard({ ...card, assigneeId: memberId ?? undefined, assignee: member ? { id: member.id, name: member.name } : null });
    saveField('assigneeId', memberId ?? '');
    setShowAssigneeMenu(false);
  };

  const moveToColumn = async (targetColumnId: string) => {
    if (!card) return;
    try {
      await api.patch(`/cards/${card.id}/move`, { targetColumnId, rank: '0' });
      setCard({ ...card, columnId: targetColumnId });
      onUpdate();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Action failed'); }
    setShowStatusMenu(false);
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !card) return;
    setSubmittingComment(true);
    try {
      const comment = await api.post<Comment>(`/cards/${card.id}/comments`, { body: commentText });
      setCard({ ...card, comments: [...card.comments, comment] });
      setCommentText('');
      onUpdate();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Action failed'); }
    finally { setSubmittingComment(false); }
  };

  const editComment = async (commentId: string) => {
    if (!editingCommentBody.trim() || !card) return;
    try {
      const updated = await api.patch<Comment>(`/comments/${commentId}`, { body: editingCommentBody });
      setCard({ ...card, comments: card.comments.map(c => c.id === commentId ? updated : c) });
      setEditingCommentId(null);
      setEditingCommentBody('');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Action failed'); }
  };

  const deleteComment = async (commentId: string) => {
    if (!card) return;
    try {
      await api.delete(`/comments/${commentId}`);
      setCard({ ...card, comments: card.comments.filter(c => c.id !== commentId) });
      onUpdate();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Action failed'); }
  };

  const handleDuplicate = async () => {
    if (!card || !onDuplicate) return;
    onDuplicate(card.id);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const toInputDate = (iso?: string | null) => {
    if (!iso) return '';
    return new Date(iso).toISOString().split('T')[0];
  };

  if (!cardId) return null;

  const priorityInfo = PRIORITIES.find((p) => p.value === card?.priority);
  const typeInfo = CARD_TYPES.find(t => t.value === (card?.type ?? 'task')) ?? CARD_TYPES[0];
  const currentColumnName = columns.find(c => c.id === card?.columnId)?.name ?? columnName;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[200] transition-opacity backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[820px] bg-bg-surface border-l border-border-subtle z-[201] flex flex-col animate-slide-in-right shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-3">
            <TypeIcon type={card?.type ?? 'task'} size={20} />
            <span className="text-[0.75rem] font-medium px-2 py-0.5 rounded bg-white/10 text-text-secondary">
              {currentColumnName}
            </span>
            {priorityInfo && (
              <span className="text-[0.7rem] font-semibold px-2 py-0.5 rounded-full" style={{ color: priorityInfo.color, background: priorityInfo.bg }}>
                {priorityInfo.label}
              </span>
            )}
          </div>
          <button className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin-fast" />
          </div>
        ) : card ? (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col md:flex-row gap-0 min-h-full">
              {/* ═══ LEFT COLUMN (60% on desktop, full on phone) ═══ */}
              <div className="flex-[3] p-4 sm:p-5 md:p-6 flex flex-col gap-5 border-b md:border-b-0 md:border-r border-border-subtle min-w-0">
                {/* Title */}
                {editingTitle ? (
                  <textarea
                    ref={titleRef}
                    className="text-[1.25rem] font-semibold text-text-primary bg-transparent border border-border-focus rounded-md px-3 py-2 resize-none outline-none leading-tight"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveTitle(); } }}
                    rows={2}
                    autoFocus
                  />
                ) : (
                  <h2 className="text-[1.25rem] font-semibold text-text-primary leading-tight cursor-pointer hover:text-accent transition-colors px-1 -mx-1 py-1 rounded hover:bg-white/[0.12]" onClick={() => setEditingTitle(true)}>
                    {card.title}
                  </h2>
                )}

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[0.85rem] font-semibold text-text-primary flex items-center gap-2">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></svg>
                      Description
                    </h4>
                    {!editingBody && (
                      <button className="text-[0.75rem] text-text-muted hover:text-text-primary transition-colors" onClick={() => setEditingBody(true)}>Edit</button>
                    )}
                  </div>
                  {editingBody ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        className="w-full min-h-[120px] px-3 py-2 rounded-md border border-border-focus bg-bg-input text-text-primary text-[0.85rem] resize-y outline-none leading-relaxed"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Add a description..."
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 rounded-md text-[0.8rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors" onClick={saveBody}>Save</button>
                        <button className="px-3 py-1.5 rounded-md text-[0.8rem] font-medium text-text-secondary hover:bg-white/10 transition-colors" onClick={() => { setBody(card.body ?? ''); setEditingBody(false); }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="cursor-pointer rounded-md px-3 py-2 min-h-[60px] bg-white/[0.06] hover:bg-white/[0.08] transition-colors border border-transparent hover:border-border-subtle" onClick={() => setEditingBody(true)}>
                      {card.body ? (
                        <p className="text-[0.85rem] text-text-secondary leading-relaxed whitespace-pre-wrap">{card.body}</p>
                      ) : (
                        <p className="text-[0.85rem] text-text-muted italic">Click to add a description...</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-border-subtle" />

                {/* Activity */}
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <h4 className="text-[0.85rem] font-semibold text-text-primary flex items-center gap-2">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                      Activity
                    </h4>
                    <div className="flex bg-white/[0.08] rounded-md p-0.5">
                      <button
                        className={`px-2.5 py-1 rounded text-[0.7rem] font-medium transition-colors ${activityTab === 'all' ? 'bg-white/10 text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                        onClick={() => setActivityTab('all')}
                      >All</button>
                      <button
                        className={`px-2.5 py-1 rounded text-[0.7rem] font-medium transition-colors ${activityTab === 'comments' ? 'bg-white/10 text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                        onClick={() => setActivityTab('comments')}
                      >Comments{card.comments.length > 0 && ` (${card.comments.length})`}</button>
                    </div>
                  </div>

                  {/* Comment list */}
                  <div className="flex flex-col gap-4 mb-4">
                    {card.comments.map((c) => (
                      <div key={c.id} className="flex gap-3 group/comment">
                        <div className="w-7 h-7 rounded-full bg-accent/30 flex items-center justify-center text-[0.6rem] font-bold text-accent-light shrink-0 mt-0.5">
                          {c.author.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[0.8rem] font-semibold text-text-primary">{c.author.name}</span>
                            <span className="text-[0.7rem] text-text-muted">{formatTime(c.createdAt)}</span>
                            {currentUser?.id === c.author.id && editingCommentId !== c.id && (
                              <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                <button
                                  className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
                                  title="Edit"
                                  onClick={() => { setEditingCommentId(c.id); setEditingCommentBody(c.body); }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </button>
                                <button
                                  className="p-1 rounded hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"
                                  title="Delete"
                                  onClick={() => deleteComment(c.id)}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                </button>
                              </div>
                            )}
                          </div>
                          {editingCommentId === c.id ? (
                            <div className="flex flex-col gap-2">
                              <textarea
                                className="w-full min-h-[48px] px-3 py-2 rounded-md border border-border-focus bg-bg-input text-text-primary text-[0.825rem] resize-none outline-none transition-colors leading-relaxed"
                                value={editingCommentBody}
                                onChange={(e) => setEditingCommentBody(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) editComment(c.id); if (e.key === 'Escape') { setEditingCommentId(null); setEditingCommentBody(''); } }}
                              />
                              <div className="flex items-center gap-2">
                                <button className="px-3 py-1 rounded-md text-[0.75rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors" onClick={() => editComment(c.id)}>Save</button>
                                <button className="px-3 py-1 rounded-md text-[0.75rem] font-medium text-text-muted hover:bg-white/10 transition-colors" onClick={() => { setEditingCommentId(null); setEditingCommentBody(''); }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[0.825rem] text-text-secondary leading-relaxed">{c.body}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {card.comments.length === 0 && (
                      <p className="text-[0.8rem] text-text-muted italic">No comments yet</p>
                    )}
                  </div>

                  {/* Add comment */}
                  <form onSubmit={addComment} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-[0.6rem] font-bold text-white shrink-0 mt-0.5">
                      {currentUser?.name?.charAt(0)?.toUpperCase() ?? 'Y'}
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <textarea
                        className="w-full min-h-[72px] px-3 py-2 rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.825rem] resize-none outline-none focus:border-border-focus transition-colors placeholder:text-text-muted leading-relaxed"
                        placeholder="Write a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addComment(e); }}
                      />
                      {commentText.trim() && (
                        <div className="flex items-center gap-2">
                          <button type="submit" disabled={submittingComment} className="px-3 py-1.5 rounded-md text-[0.8rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors disabled:opacity-50">
                            {submittingComment ? 'Posting...' : 'Comment'}
                          </button>
                          <span className="text-[0.7rem] text-text-muted">Ctrl+Enter to submit</span>
                        </div>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* ═══ RIGHT COLUMN — Details Sidebar (40% on desktop, full on phone) ═══ */}
              <div className="flex-[2] p-4 sm:p-5 flex flex-col gap-4 md:min-w-[260px]">
                <h3 className="text-[0.8rem] font-bold text-text-muted uppercase tracking-wide">Details</h3>

                {/* Status */}
                <div className="flex flex-col gap-1.5" data-dropdown>
                  <span className="text-[0.7rem] font-semibold text-text-muted uppercase tracking-wide">Status</span>
                  <div className="relative">
                    <button className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-white/[0.08] hover:bg-white/[0.12] transition-colors text-left text-[0.8rem]" onClick={() => setShowStatusMenu(!showStatusMenu)}>
                      <span className="text-text-primary font-medium">{currentColumnName}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                    {showStatusMenu && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-border-subtle rounded-lg shadow-xl z-10 py-1">
                        {columns.map((col) => (
                          <button key={col.id} className="w-full flex items-center gap-2 px-3 py-2 text-[0.8rem] text-text-primary hover:bg-white/10 transition-colors text-left" onClick={() => moveToColumn(col.id)}>
                            {col.name}
                            {col.id === card.columnId && <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignee */}
                <div className="flex flex-col gap-1.5" data-dropdown>
                  <span className="text-[0.7rem] font-semibold text-text-muted uppercase tracking-wide">Assignee</span>
                  <div className="relative">
                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-white/[0.08] hover:bg-white/[0.12] transition-colors text-left text-[0.8rem]" onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}>
                      {card.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-accent/60 flex items-center justify-center text-[0.55rem] font-bold text-white">
                            {card.assignee.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-text-primary">{card.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-text-muted">Unassigned</span>
                      )}
                      <svg className="ml-auto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                    {showAssigneeMenu && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-border-subtle rounded-lg shadow-xl z-10 py-1 max-h-[200px] overflow-y-auto">
                        {currentUser && (
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-[0.8rem] text-accent hover:bg-white/10 transition-colors text-left border-b border-border-subtle" onClick={() => setAssignee(currentUser.id)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            Assign to me
                          </button>
                        )}
                        {members.map((m) => (
                          <button key={m.id} className="w-full flex items-center gap-2 px-3 py-2 text-[0.8rem] text-text-primary hover:bg-white/10 transition-colors text-left" onClick={() => setAssignee(m.id)}>
                            <div className="w-5 h-5 rounded-full bg-accent/40 flex items-center justify-center text-[0.5rem] font-bold text-white">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            {m.name}
                            {card.assigneeId === m.id && <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>}
                          </button>
                        ))}
                        {card.assigneeId && (
                          <button className="w-full px-3 py-2 text-[0.8rem] text-text-muted hover:bg-white/10 transition-colors text-left border-t border-border-subtle" onClick={() => setAssignee(null)}>
                            Remove assignee
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Priority */}
                <div className="flex flex-col gap-1.5" data-dropdown>
                  <span className="text-[0.7rem] font-semibold text-text-muted uppercase tracking-wide">Priority</span>
                  <div className="relative">
                    <button className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-white/[0.08] hover:bg-white/[0.12] transition-colors text-left text-[0.8rem]" onClick={() => setShowPriorityMenu(!showPriorityMenu)}>
                      {priorityInfo ? (
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: priorityInfo.color }} />
                          <span className="text-text-primary">{priorityInfo.label}</span>
                        </span>
                      ) : (
                        <span className="text-text-muted">None</span>
                      )}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                    {showPriorityMenu && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-border-subtle rounded-lg shadow-xl z-10 py-1">
                        {PRIORITIES.map((p) => (
                          <button key={p.value} className="w-full flex items-center gap-2 px-3 py-2 text-[0.8rem] text-text-primary hover:bg-white/10 transition-colors text-left" onClick={() => setPriority(p.value)}>
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                            {p.label}
                            {card.priority === p.value && <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>}
                          </button>
                        ))}
                        {card.priority && (
                          <button className="w-full px-3 py-2 text-[0.8rem] text-text-muted hover:bg-white/10 transition-colors text-left border-t border-border-subtle" onClick={() => setPriority(null)}>
                            Clear priority
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Type */}
                <div className="flex flex-col gap-1.5" data-dropdown>
                  <span className="text-[0.7rem] font-semibold text-text-muted uppercase tracking-wide">Type</span>
                  <div className="relative">
                    <button className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-white/[0.08] hover:bg-white/[0.12] transition-colors text-left text-[0.8rem]" onClick={() => setShowTypeMenu(!showTypeMenu)}>
                      <span className="flex items-center gap-2">
                        <TypeIcon type={card.type ?? 'task'} size={14} />
                        <span className="text-text-primary">{typeInfo.label}</span>
                      </span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                    {showTypeMenu && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-border-subtle rounded-lg shadow-xl z-10 py-1">
                        {CARD_TYPES.map((t) => (
                          <button key={t.value} className="w-full flex items-center gap-2 px-3 py-2 text-[0.8rem] text-text-primary hover:bg-white/10 transition-colors text-left" onClick={() => setType(t.value)}>
                            <TypeIcon type={t.value} size={14} />
                            {t.label}
                            {(card.type ?? 'task') === t.value && <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Story Points */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[0.7rem] font-semibold text-text-muted uppercase tracking-wide">Story Points</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="px-3 py-2 rounded-md bg-white/[0.08] border border-transparent focus:border-border-focus text-text-primary text-[0.8rem] outline-none transition-colors w-full"
                    placeholder="–"
                    value={card.storyPoints ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                      setCard({ ...card, storyPoints: val });
                      saveField('storyPoints', val);
                    }}
                  />
                </div>

                {/* Due Date */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[0.7rem] font-semibold text-text-muted uppercase tracking-wide">Due date</span>
                  <input
                    type="date"
                    className="w-full px-3 py-2 rounded-md bg-white/[0.08] border border-transparent hover:bg-white/[0.12] focus:border-border-focus text-text-primary text-[0.8rem] outline-none transition-colors [color-scheme:dark]"
                    value={toInputDate(card.dueDate)}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      setCard({ ...card, dueDate: val });
                      saveField('dueDate', val);
                    }}
                  />
                </div>

                {/* Start Date */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[0.7rem] font-semibold text-text-muted uppercase tracking-wide">Start date</span>
                  <input
                    type="date"
                    className="w-full px-3 py-2 rounded-md bg-white/[0.08] border border-transparent hover:bg-white/[0.12] focus:border-border-focus text-text-primary text-[0.8rem] outline-none transition-colors [color-scheme:dark]"
                    value={toInputDate(card.startDate)}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      setCard({ ...card, startDate: val });
                      saveField('startDate', val);
                    }}
                  />
                </div>

                {/* Labels */}
                <div className="flex flex-col gap-1.5" data-dropdown>
                  <span className="text-[0.7rem] font-semibold text-text-muted uppercase tracking-wide">Labels</span>
                  <div className="relative">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {card.labels.map((l) => {
                        const info = LABEL_OPTIONS.find((o) => o.value === l);
                        return info ? (
                          <span key={l} className="text-[0.7rem] font-semibold px-2 py-0.5 rounded-full" style={{ color: info.color, background: info.bg }}>
                            {info.label}
                          </span>
                        ) : null;
                      })}
                      <button className="w-6 h-6 rounded-full flex items-center justify-center text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors border border-dashed border-border-subtle" onClick={() => setShowLabelMenu(!showLabelMenu)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      </button>
                    </div>
                    {showLabelMenu && (
                      <div className="absolute top-full left-0 mt-2 w-[180px] bg-bg-card border border-border-subtle rounded-lg shadow-xl z-10 py-1">
                        {LABEL_OPTIONS.map((l) => (
                          <button key={l.value} className="w-full flex items-center gap-2 px-3 py-2 text-[0.8rem] text-text-primary hover:bg-white/10 transition-colors text-left" onClick={() => toggleLabel(l.value)}>
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                            {l.label}
                            {card.labels.includes(l.value) && <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border-subtle my-1" />

                {/* Reporter */}
                {card.author && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[0.7rem] font-semibold text-text-muted uppercase tracking-wide">Reporter</span>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-[0.55rem] font-bold text-white shrink-0">
                        {card.author.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[0.8rem] text-text-primary">{card.author.name}</span>
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="flex flex-col gap-2 text-[0.75rem] text-text-muted mt-1">
                  <div className="flex items-center gap-2">
                    <span className="w-[60px] shrink-0">Created</span>
                    <span className="text-text-secondary">{formatDate(card.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-[60px] shrink-0">Updated</span>
                    <span className="text-text-secondary">{formatDate(card.updatedAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-auto pt-4 border-t border-border-subtle flex flex-col gap-2">
                  {onDuplicate && (
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[0.8rem] font-medium text-text-secondary hover:bg-white/10 transition-colors" onClick={handleDuplicate}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      Duplicate card
                    </button>
                  )}
                  {confirmDelete ? (
                    <div className="flex items-center gap-3">
                      <span className="text-[0.8rem] text-danger">Delete?</span>
                      <button className="px-3 py-1.5 rounded-md text-[0.8rem] font-medium bg-danger text-white hover:bg-red-600 transition-colors" onClick={() => onDelete(card.id)}>Yes</button>
                      <button className="px-3 py-1.5 rounded-md text-[0.8rem] font-medium text-text-secondary hover:bg-white/10 transition-colors" onClick={() => setConfirmDelete(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[0.8rem] font-medium text-danger hover:bg-danger/10 transition-colors" onClick={() => setConfirmDelete(true)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      Delete card
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-muted">Card not found</div>
        )}
      </div>
    </>
  );
}
