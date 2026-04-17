import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { Modal } from '../components/Modal';
import { api, ApiError } from '../lib/api';

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
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
        <TopNav
          title="Dashboard"
          subtitle={`${workspaces.length} workspace${workspaces.length !== 1 ? 's' : ''}`}
          actions={
            <button className="inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-accent text-white hover:bg-[#5558e6]" onClick={() => setShowCreate(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Workspace
            </button>
          }
        />

        <div className="flex-1 p-6">
          {loading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {[1,2,3].map(i => <div key={i} className="h-[150px] rounded-lg bg-bg-card border border-border-subtle animate-[pulse_1.5s_ease_infinite]" />)}
            </div>
          ) : workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-8 gap-3 animate-fade-in">
              <div className="w-[56px] h-[56px] flex items-center justify-center rounded-lg bg-accent-subtle text-accent-light mb-2">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h2 className="text-[1.15rem]">No workspaces yet</h2>
              <p className="text-text-secondary max-w-[360px] text-[0.875rem]">Create your first workspace to start organizing your projects with Kanban boards.</p>
              <button className="mt-3 inline-flex items-center justify-center gap-[6px] px-[20px] py-[10px] rounded-md text-[0.9rem] font-medium transition-colors whitespace-nowrap bg-accent text-white hover:bg-[#5558e6]" onClick={() => setShowCreate(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Workspace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 animate-fade-in">
              {workspaces.map((ws, i) => (
                <div
                  key={ws.id}
                  className="cursor-pointer animate-fade-in bg-bg-card border border-border-subtle rounded-lg p-5 transition-colors hover:bg-bg-card-hover"
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() => navigate(`/workspaces/${ws.id}`)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-[34px] h-[34px] rounded-md bg-accent flex items-center justify-center font-semibold text-[0.95rem] text-white">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <span className={`px-[8px] py-[2px] rounded-full text-[0.65rem] font-semibold uppercase tracking-[0.04em] ${ws.plan.toLowerCase() === 'free' ? 'bg-accent-subtle text-accent-light' : ws.plan.toLowerCase() === 'pro' ? 'bg-[rgba(251,191,36,0.1)] text-warning' : 'bg-[rgba(52,211,153,0.1)] text-success'}`}>
                      {ws.plan}
                    </span>
                  </div>
                  <h3 className="text-[0.95rem] mb-[2px]">{ws.name}</h3>
                  <p className="text-text-muted text-[0.8rem] mb-3">/{ws.slug}</p>
                  <div className="flex gap-3 text-text-secondary text-[0.8rem] [&>span]:flex [&>span]:items-center [&>span]:gap-[5px]">
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
        <form onSubmit={handleCreate} className="flex flex-col">
          {createError && <div className="py-[10px] px-[12px] rounded-md bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] text-danger text-[0.8rem]" style={{ marginBottom: 16 }}>{createError}</div>}
          <div className="flex flex-col gap-[6px] [&>label]:text-[0.8rem] [&>label]:font-medium [&>label]:text-text-secondary">
            <label htmlFor="ws-name">Workspace name</label>
            <input id="ws-name" className="px-3 py-[9px] rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.875rem] transition-colors outline-none focus:border-border-focus placeholder:text-text-muted w-full" type="text" placeholder="My Team" value={createName} onChange={(e) => autoSlug(e.target.value)} required autoFocus />
          </div>
          <div className="flex flex-col gap-[6px] [&>label]:text-[0.8rem] [&>label]:font-medium [&>label]:text-text-secondary mt-4">
            <label htmlFor="ws-slug">URL slug</label>
            <input id="ws-slug" className="px-3 py-[9px] rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.875rem] transition-colors outline-none focus:border-border-focus placeholder:text-text-muted w-full" type="text" placeholder="my-team" value={createSlug} onChange={(e) => setCreateSlug(e.target.value)} required pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$" />
          </div>
          <button type="submit" className="mt-6 inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-accent text-white hover:bg-[#5558e6] w-full disabled:opacity-40 disabled:cursor-not-allowed" disabled={creating} >
            {creating ? 'Creating...' : 'Create Workspace'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
