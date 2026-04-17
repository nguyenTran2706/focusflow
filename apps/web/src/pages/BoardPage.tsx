import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { Modal } from '../components/Modal';
import { api } from '../lib/api';

interface Card {
  id: string;
  title: string;
  body?: string;
  author?: { id: string; name: string };
  _count?: { comments: number };
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

export function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [boardName, setBoardName] = useState('');
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
          title="Boards"
          actions={
            <>
              <button className="inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary" onClick={() => navigate('/dashboard')}>
                ← Back
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
        <div className="flex-1 p-6">
          {loading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {[1,2,3].map(i => <div key={i} className="h-[150px] rounded-lg bg-bg-card border border-border-subtle animate-[pulse_1.5s_ease_infinite]" />)}
            </div>
          ) : boards.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-8 gap-3 animate-fade-in">
              <div className="w-[56px] h-[56px] flex items-center justify-center rounded-lg bg-accent-subtle text-accent-light mb-2">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
                </svg>
              </div>
              <h2 className="text-[1.15rem]">No boards yet</h2>
              <p className="text-text-secondary max-w-[360px] text-[0.875rem]">Create your first Kanban board to start managing tasks.</p>
              <button className="mt-3 inline-flex items-center justify-center gap-[6px] px-[20px] py-[10px] rounded-md text-[0.9rem] font-medium transition-colors whitespace-nowrap bg-accent text-white hover:bg-[#5558e6]" onClick={() => setShowCreate(true)}>Create Board</button>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 animate-fade-in">
              {boards.map((b, i) => (
                <div key={b.id} className="cursor-pointer animate-fade-in bg-bg-card border border-border-subtle rounded-lg p-5 transition-colors hover:bg-bg-card-hover" style={{ animationDelay: `${i * 60}ms` }} onClick={() => navigate(`/boards/${b.id}`)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-[34px] h-[34px] rounded-md bg-accent flex items-center justify-center font-semibold text-[0.95rem] text-white" style={{ background: `hsl(${(i * 60 + 250) % 360}, 60%, 55%)` }}>
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <h3 className="text-[0.95rem] mb-[2px]">{b.name}</h3>
                  <div className="flex gap-3 text-text-secondary text-[0.8rem] [&>span]:flex [&>span]:items-center [&>span]:gap-[5px]">
                    <span>{b._count?.columns ?? 0} columns</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Board">
        <form onSubmit={handleCreate} className="flex flex-col">
          <div className="flex flex-col gap-[6px] [&>label]:text-[0.8rem] [&>label]:font-medium [&>label]:text-text-secondary">
            <label htmlFor="board-name">Board name</label>
            <input id="board-name" className="px-3 py-[9px] rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.875rem] transition-colors outline-none focus:border-border-focus placeholder:text-text-muted w-full" type="text" placeholder="Sprint Board" value={boardName} onChange={(e) => setBoardName(e.target.value)} required autoFocus />
          </div>
          <button type="submit" className="mt-6 inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-accent text-white hover:bg-[#5558e6] w-full">Create Board</button>
        </form>
      </Modal>
    </div>
  );
}

// Helper to determine column status type for Jira-style colors
function getColumnStatus(name: string): string {
  const lower = name.toLowerCase().trim();
  if (lower === 'to do' || lower === 'todo' || lower === 'backlog') return 'todo';
  if (lower.includes('progress') || lower.includes('review') || lower === 'doing') return 'progress';
  if (lower === 'done' || lower === 'complete' || lower === 'completed') return 'done';
  return 'default';
}

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [addingCardCol, setAddingCardCol] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const navigate = useNavigate();

  const fetchBoard = async () => {
    try {
      const data = await api.get<Board>(`/boards/${boardId}`);
      setBoard(data);
    } catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBoard(); }, [boardId]);

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
      setSelectedCard(null);
      fetchBoard();
    } catch { /* */ }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
          <TopNav title="Loading..." />
          <div className="flex-1 p-6 flex gap-5 overflow-hidden">
            {[1,2,3].map(i => <div key={i} className="w-[280px] h-[70vh] rounded-xl bg-bg-surface border border-border-subtle animate-[pulse_1.5s_ease_infinite] shrink-0" />)}
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
          subtitle={`${board?.columns.length ?? 0} columns`}
          actions={
            <button className="inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary" onClick={() => board && navigate(`/workspaces/${board.workspaceId}`)}>
              ← Back to boards
            </button>
          }
        />

        <div className="flex-1 flex gap-5 p-6 overflow-x-auto overflow-y-hidden items-start">
          {board?.columns.map((col) => {
            const status = getColumnStatus(col.name);
            const borderTopColor = status === 'todo' ? 'border-t-border-subtle' : status === 'progress' ? 'border-t-warning' : status === 'done' ? 'border-t-success' : 'border-t-transparent';
            const dotBg = status === 'todo' ? 'bg-text-muted' : status === 'progress' ? 'bg-warning' : status === 'done' ? 'bg-success' : 'bg-transparent';
            
            return (
            <div key={col.id} className="w-[280px] shrink-0 flex flex-col max-h-[calc(100vh-var(--spacing-topnav)-3rem)] animate-fade-in">
              <div className={`flex items-center gap-[6px] mb-3 px-1 border-t-2 pt-2 ${borderTopColor}`}>
                <span className={`w-2 h-2 rounded-full opacity-80 ${dotBg}`} />
                <h4 className="font-semibold text-[0.95rem] text-text-primary uppercase tracking-[0.03em] flex items-center justify-between flex-1">
                  {col.name}
                  <span className="text-text-muted text-[0.75rem] font-medium bg-bg-surface px-[6px] py-[2px] rounded-full">{col.cards.length}</span>
                </h4>
              </div>

              <div className="flex-1 flex flex-col gap-[10px] overflow-y-auto p-[2px] pr-[4px]">
                {col.cards.length === 0 && (
                  <div className="text-center py-6 text-text-muted text-[0.875rem] italic bg-black/10 rounded-lg border border-dashed border-border-subtle">No cards yet</div>
                )}
                {col.cards.map((card) => (
                  <div key={card.id} className="bg-bg-surface border border-border-subtle rounded-lg p-[14px] cursor-grab select-none shadow-sm transition-all hover:-translate-y-[2px] hover:shadow-md hover:border-accent-subtle" onClick={() => setSelectedCard(card)}>
                    <p className="font-medium text-[0.9rem] text-text-primary leading-[1.4] mb-2">{card.title}</p>
                    {card.body && <p className="text-text-secondary text-[0.8rem] line-clamp-2 leading-[1.5] mb-3">{card.body}</p>}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-border-subtle">
                      {card.author && <span className="px-[6px] py-[2px] rounded bg-white/5 text-text-muted text-[0.7rem] font-medium">{card.author.name}</span>}
                      {(card._count?.comments ?? 0) > 0 && (
                        <span className="flex items-center gap-[4px] text-text-muted text-[0.7rem] font-medium">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                          {card._count?.comments}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {addingCardCol === col.id ? (
                  <form onSubmit={(e) => addCard(e, col.id)} className="mt-1 flex flex-col gap-2 p-[10px] rounded-lg bg-bg-surface border border-border-subtle shadow-sm">
                    <input className="px-3 py-[9px] rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.875rem] transition-colors outline-none focus:border-border-focus placeholder:text-text-muted w-full" placeholder="Card title..." value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)} autoFocus onBlur={() => { if (!newCardTitle) setAddingCardCol(null); }} />
                    <div className="flex items-center gap-2">
                      <button type="submit" className="inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-accent text-white hover:bg-[#5558e6]">Add</button>
                      <button type="button" className="inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary" onClick={() => setAddingCardCol(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button className="mt-2 flex items-center justify-center gap-2 w-full py-[10px] rounded-lg text-text-secondary text-[0.9rem] font-medium transition-colors hover:bg-bg-surface hover:text-text-primary" onClick={() => { setAddingCardCol(col.id); setNewCardTitle(''); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add card
                  </button>
                )}
              </div>
            </div>
            );
          })}

          {/* Add Column */}
          <div className="w-[280px] shrink-0 flex flex-col max-h-[calc(100vh-var(--spacing-topnav)-3rem)] shrink-0 pt-2 border-t-2 border-transparent">
            {addingCol ? (
              <form onSubmit={addColumn} className="mt-1 flex flex-col gap-2 p-[10px] rounded-lg bg-bg-surface border border-border-subtle shadow-sm">
                <input className="px-3 py-[9px] rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.875rem] transition-colors outline-none focus:border-border-focus placeholder:text-text-muted w-full" placeholder="Column name..." value={newColName} onChange={(e) => setNewColName(e.target.value)} autoFocus onBlur={() => { if (!newColName) setAddingCol(false); }} />
                <div className="flex items-center gap-2">
                  <button type="submit" className="inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-accent text-white hover:bg-[#5558e6]">Add</button>
                  <button type="button" className="inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary" onClick={() => setAddingCol(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <button className="flex items-center justify-center gap-2 w-[280px] h-[52px] rounded-xl border-2 border-dashed border-border-subtle text-text-secondary text-[0.95rem] font-medium transition-colors hover:border-accent hover:text-accent hover:bg-accent-subtle" onClick={() => setAddingCol(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add column
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Card Detail Modal */}
      <Modal open={!!selectedCard} onClose={() => setSelectedCard(null)} title={selectedCard?.title ?? ''}>
        {selectedCard && (
          <div className="flex flex-col gap-4 mt-2">
            {selectedCard.body && <p className="text-[0.95rem] leading-[1.6] text-text-secondary">{selectedCard.body}</p>}
            {selectedCard.author && (
              <div className="flex items-center gap-[10px] text-[0.85rem] mt-2 pt-4 border-t border-border-subtle">
                <span className="text-text-muted font-medium w-[60px]">Author</span>
                <span className="text-text-primary font-medium">{selectedCard.author.name}</span>
              </div>
            )}
            <button className="mt-6 inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-[rgba(248,113,113,0.1)] text-danger hover:bg-danger hover:text-white w-full" onClick={() => deleteCard(selectedCard.id)}>
              Delete Card
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
