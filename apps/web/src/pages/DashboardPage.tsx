import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { Modal } from '../components/Modal';
import { api, ApiError } from '../lib/api';
import './DashboardPage.css';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  _count?: { boards: number };
  memberships?: { role: string; userId: string }[];
}

export function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const fetchWorkspaces = async () => {
    try {
      const data = await api.get<Workspace[]>('/workspaces');
      setWorkspaces(data);
    } catch {
      /* API not connected — show empty state */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkspaces(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await api.post('/workspaces', { name: createName, slug: createSlug });
      setShowCreate(false);
      setCreateName('');
      setCreateSlug('');
      fetchWorkspaces();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const autoSlug = (name: string) => {
    setCreateName(name);
    setCreateSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <TopNav
          title="Dashboard"
          subtitle={`${workspaces.length} workspace${workspaces.length !== 1 ? 's' : ''}`}
          actions={
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Workspace
            </button>
          }
        />

        <div className="dashboard-content">
          {loading ? (
            <div className="dashboard-loading">
              {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
            </div>
          ) : workspaces.length === 0 ? (
            <div className="dashboard-empty animate-fade-in">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h2>No workspaces yet</h2>
              <p>Create your first workspace to start organizing your projects with Kanban boards.</p>
              <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Workspace
              </button>
            </div>
          ) : (
            <div className="workspace-grid animate-fade-in">
              {workspaces.map((ws, i) => (
                <div
                  key={ws.id}
                  className="workspace-card card"
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() => navigate(`/workspaces/${ws.id}`)}
                >
                  <div className="workspace-card-header">
                    <div className="workspace-card-avatar">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <span className={`workspace-plan plan-${ws.plan.toLowerCase()}`}>{ws.plan}</span>
                  </div>
                  <h3 className="workspace-card-name">{ws.name}</h3>
                  <p className="workspace-card-slug">/{ws.slug}</p>
                  <div className="workspace-card-stats">
                    <span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
                      </svg>
                      {ws._count?.boards ?? 0} boards
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Workspace Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Workspace">
        <form onSubmit={handleCreate}>
          {createError && <div className="auth-error" style={{ marginBottom: 16 }}>{createError}</div>}
          <div className="input-group">
            <label htmlFor="ws-name">Workspace name</label>
            <input id="ws-name" className="input" type="text" placeholder="My Team" value={createName} onChange={(e) => autoSlug(e.target.value)} required autoFocus />
          </div>
          <div className="input-group" style={{ marginTop: 16 }}>
            <label htmlFor="ws-slug">URL slug</label>
            <input id="ws-slug" className="input" type="text" placeholder="my-team" value={createSlug} onChange={(e) => setCreateSlug(e.target.value)} required pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$" />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={creating} style={{ marginTop: 24 }}>
            {creating ? 'Creating...' : 'Create Workspace'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
