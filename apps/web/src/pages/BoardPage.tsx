import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { Modal } from '../components/Modal';
import { api } from '../lib/api';
import './BoardPage.css';

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
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <TopNav
          title="Boards"
          actions={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Board
              </button>
            </>
          }
        />
        <div className="dashboard-content">
          {loading ? (
            <div className="dashboard-loading">
              {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
            </div>
          ) : boards.length === 0 ? (
            <div className="dashboard-empty animate-fade-in">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
                </svg>
              </div>
              <h2>No boards yet</h2>
              <p>Create your first Kanban board to start managing tasks.</p>
              <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>Create Board</button>
            </div>
          ) : (
            <div className="workspace-grid animate-fade-in">
              {boards.map((b, i) => (
                <div key={b.id} className="workspace-card card" style={{ animationDelay: `${i * 60}ms` }} onClick={() => navigate(`/boards/${b.id}`)}>
                  <div className="workspace-card-header">
                    <div className="workspace-card-avatar" style={{ background: `hsl(${(i * 60 + 250) % 360}, 60%, 55%)` }}>
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <h3 className="workspace-card-name">{b.name}</h3>
                  <div className="workspace-card-stats">
                    <span>{b._count?.columns ?? 0} columns</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Board">
        <form onSubmit={handleCreate}>
          <div className="input-group">
            <label htmlFor="board-name">Board name</label>
            <input id="board-name" className="input" type="text" placeholder="Sprint Board" value={boardName} onChange={(e) => setBoardName(e.target.value)} required autoFocus />
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 24 }}>Create Board</button>
        </form>
      </Modal>
    </div>
  );
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
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <TopNav title="Loading..." />
          <div className="board-loading">
            {[1,2,3].map(i => <div key={i} className="skeleton-column" />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <TopNav
          title={board?.name ?? 'Board'}
          subtitle={`${board?.columns.length ?? 0} columns`}
          actions={
            <button className="btn btn-ghost btn-sm" onClick={() => board && navigate(`/workspaces/${board.workspaceId}`)}>
              ← Back to boards
            </button>
          }
        />

        <div className="board-canvas">
          {board?.columns.map((col) => (
            <div key={col.id} className="board-column animate-fade-in">
              <div className="board-column-header">
                <h4 className="board-column-title">
                  {col.name}
                  <span className="board-column-count">{col.cards.length}</span>
                </h4>
              </div>

              <div className="board-column-cards">
                {col.cards.map((card) => (
                  <div key={card.id} className="board-card card" onClick={() => setSelectedCard(card)}>
                    <p className="board-card-title">{card.title}</p>
                    {card.body && <p className="board-card-body">{card.body}</p>}
                    <div className="board-card-meta">
                      {card.author && <span className="board-card-author">{card.author.name}</span>}
                      {(card._count?.comments ?? 0) > 0 && (
                        <span className="board-card-comments">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                          {card._count?.comments}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {addingCardCol === col.id ? (
                  <form onSubmit={(e) => addCard(e, col.id)} className="board-add-form">
                    <input className="input" placeholder="Card title..." value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)} autoFocus onBlur={() => { if (!newCardTitle) setAddingCardCol(null); }} />
                    <div className="board-add-actions">
                      <button type="submit" className="btn btn-primary btn-sm">Add</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAddingCardCol(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button className="board-add-btn" onClick={() => { setAddingCardCol(col.id); setNewCardTitle(''); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add card
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Column */}
          <div className="board-column board-column-add">
            {addingCol ? (
              <form onSubmit={addColumn} className="board-add-form">
                <input className="input" placeholder="Column name..." value={newColName} onChange={(e) => setNewColName(e.target.value)} autoFocus onBlur={() => { if (!newColName) setAddingCol(false); }} />
                <div className="board-add-actions">
                  <button type="submit" className="btn btn-primary btn-sm">Add</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAddingCol(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <button className="board-add-col-btn" onClick={() => setAddingCol(true)}>
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
          <div className="card-detail">
            {selectedCard.body && <p className="card-detail-body">{selectedCard.body}</p>}
            {selectedCard.author && (
              <div className="card-detail-author">
                <span className="card-detail-label">Author</span>
                <span>{selectedCard.author.name}</span>
              </div>
            )}
            <button className="btn btn-danger btn-block" style={{ marginTop: 24 }} onClick={() => deleteCard(selectedCard.id)}>
              Delete Card
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
