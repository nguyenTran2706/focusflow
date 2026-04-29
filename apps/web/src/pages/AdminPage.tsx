import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { useAuthStore } from '../lib/auth-store';
import { api } from '../lib/api';
import { useChatNotifications } from '../lib/chat-notifications';
import Pusher from 'pusher-js';

const pusherKey = import.meta.env.VITE_PUSHER_KEY;
const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER ?? 'ap4';

// ── Types ─────────────────────────────────────────────────────────────────

interface Stats {
  totalUsers: number;
  subscriptions: { FREE: number; PRO: number; PRO_MAX: number };
  activeChats: number;
  totalFaqs: number;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  subscription: string;
  createdAt: string;
}

interface Faq {
  id: string;
  question: string;
  answer: string;
  category?: string;
  createdAt: string;
}

interface ChatRow {
  id: string;
  status: string;
  user: { id: string; name: string; email: string };
  messages: { body: string; createdAt: string }[];
  updatedAt: string;
}

interface ChatMsg {
  id: string;
  senderRole: string;
  senderId?: string;
  body: string;
  createdAt: string;
}

type Tab = 'overview' | 'users' | 'faq' | 'chats';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
  { key: 'users', label: 'Users', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { key: 'faq', label: 'FAQ', icon: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z' },
  { key: 'chats', label: 'Chats', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
];

const SUB_COLORS: Record<string, string> = {
  FREE: '#818cf8', PRO: '#fbbf24', PRO_MAX: '#34d399',
};

// ── Main Component ────────────────────────────────────────────────────────

export function AdminPage() {
  const { t } = useTranslation('admin');
  const dbUser = useAuthStore((s) => s.dbUser);
  const [tab, setTab] = useState<Tab>('overview');

  if (dbUser && dbUser.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
        <TopNav title={t('title')} />

        {/* Tab bar */}
        <div className="flex gap-1 px-6 pt-4 border-b border-border-subtle">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[0.82rem] font-medium rounded-t-lg border-b-2 transition-colors ${
                tab === tabItem.key
                  ? 'border-accent text-accent-light bg-accent-subtle'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.12]'
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={tabItem.icon} />
              </svg>
              {tabItem.label}
            </button>
          ))}
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {tab === 'overview' && <OverviewTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'faq' && <FaqTab />}
          {tab === 'chats' && <ChatsTab />}
        </div>
      </main>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<Stats>('/admin/stats').then(setStats).catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[120px] rounded-xl bg-bg-card border border-border-subtle animate-[pulse_1.5s_ease_infinite]" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, color: '#6366f1', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
    { label: 'Active Chats', value: stats.activeChats, color: '#fbbf24', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
    { label: 'FAQ Articles', value: stats.totalFaqs, color: '#34d399', icon: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01' },
    { label: 'Pro Subscribers', value: stats.subscriptions.PRO + stats.subscriptions.PRO_MAX, color: '#f97316', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map((c, i) => (
          <div key={i} className="rounded-xl bg-bg-card border border-border-subtle p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[0.75rem] font-semibold text-text-muted uppercase tracking-wide">{c.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${c.color}15` }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={c.icon} />
                </svg>
              </div>
            </div>
            <span className="text-[2rem] font-bold text-text-primary leading-none">{c.value}</span>
          </div>
        ))}
      </div>

      {/* Subscription breakdown */}
      <div className="rounded-xl bg-bg-card border border-border-subtle p-5">
        <h3 className="text-[0.85rem] font-semibold text-text-primary mb-4">Subscription Breakdown</h3>
        <div className="flex gap-6">
          {(['FREE', 'PRO', 'PRO_MAX'] as const).map((tier) => {
            const count = stats.subscriptions[tier];
            const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
            return (
              <div key={tier} className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[0.8rem] font-medium" style={{ color: SUB_COLORS[tier] }}>
                    {tier === 'PRO_MAX' ? 'Pro Max' : tier.charAt(0) + tier.slice(1).toLowerCase()}
                  </span>
                  <span className="text-[0.8rem] font-bold text-text-primary">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.05] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: SUB_COLORS[tier] }} />
                </div>
                <span className="text-[0.7rem] text-text-muted mt-1 block">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    api.get<{ users: UserRow[]; total: number }>(`/admin/users?page=${page}&limit=15&search=${encodeURIComponent(search)}`)
      .then((r) => { if (!cancelled) { setUsers(r.users); setTotal(r.total); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, search]);

  const updateUser = async (id: string, data: { role?: string; subscription?: string }) => {
    try {
      const updated = await api.patch<UserRow>(`/admin/users/${id}`, data);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
      toast.success('User updated');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to update user'); }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="animate-fade-in">
      {/* Search */}
      <div className="mb-4">
        <input
          className="px-4 py-2.5 rounded-lg border border-border-subtle bg-bg-input text-text-primary text-[0.85rem] w-[320px] outline-none focus:border-border-focus transition-colors placeholder:text-text-muted"
          placeholder="Search users by name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border-subtle overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-bg-surface text-text-muted text-[0.7rem] uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-semibold">User</th>
              <th className="text-left px-4 py-3 font-semibold">Role</th>
              <th className="text-left px-4 py-3 font-semibold">Plan</th>
              <th className="text-left px-4 py-3 font-semibold">Joined</th>
              <th className="text-left px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted text-[0.85rem]">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted text-[0.85rem]">No users found</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-border-subtle hover:bg-white/[0.06] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-[0.7rem] font-bold text-accent-light">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[0.82rem] font-medium text-text-primary">{u.name}</p>
                        <p className="text-[0.7rem] text-text-muted">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="bg-bg-input border border-border-subtle rounded-md px-2 py-1 text-[0.78rem] text-text-primary outline-none cursor-pointer"
                      value={u.role}
                      onChange={(e) => updateUser(u.id, { role: e.target.value })}
                    >
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="bg-bg-input border border-border-subtle rounded-md px-2 py-1 text-[0.78rem] text-text-primary outline-none cursor-pointer"
                      value={u.subscription}
                      onChange={(e) => updateUser(u.id, { subscription: e.target.value })}
                    >
                      <option value="FREE">Free</option>
                      <option value="PRO">Pro</option>
                      <option value="PRO_MAX">Pro Max</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-[0.78rem] text-text-secondary">
                    {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[0.7rem] px-2 py-0.5 rounded-full font-semibold" style={{ color: SUB_COLORS[u.subscription], background: `${SUB_COLORS[u.subscription]}15` }}>
                      {u.subscription === 'PRO_MAX' ? 'Pro Max' : u.subscription.charAt(0) + u.subscription.slice(1).toLowerCase()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-[0.78rem] text-text-muted">{total} users total</span>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-md text-[0.78rem] font-medium transition-colors ${
                  p === page ? 'bg-accent text-white' : 'text-text-secondary hover:bg-white/[0.05]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── FAQ Tab ───────────────────────────────────────────────────────────────

function FaqTab() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    api.get<Faq[]>('/admin/faq').then(setFaqs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setShowForm(false); setEditId(null); setQuestion(''); setAnswer(''); setCategory('');
  };

  const handleSave = async () => {
    const data = { question, answer, category: category || undefined };
    try {
      if (editId) {
        const updated = await api.patch<Faq>(`/admin/faq/${editId}`, data);
        setFaqs((prev) => prev.map((f) => (f.id === editId ? updated : f)));
      } else {
        const created = await api.post<Faq>('/admin/faq', data);
        setFaqs((prev) => [created, ...prev]);
      }
      resetForm();
      toast.success(editId ? 'FAQ updated' : 'FAQ created');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to save FAQ'); }
  };

  const handleEdit = (faq: Faq) => {
    setEditId(faq.id); setQuestion(faq.question); setAnswer(faq.answer); setCategory(faq.category ?? ''); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/faq/${id}`);
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      toast.success('FAQ deleted');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to delete FAQ'); }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[0.95rem] font-semibold text-text-primary">FAQ Knowledge Base ({faqs.length})</h3>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 rounded-lg text-[0.82rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add FAQ
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl bg-bg-card border border-border-subtle p-5 mb-4 animate-fade-in">
          <h4 className="text-[0.85rem] font-semibold text-text-primary mb-4">{editId ? 'Edit FAQ' : 'New FAQ'}</h4>
          <div className="space-y-3">
            <input
              className="w-full px-3 py-2.5 rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.85rem] outline-none focus:border-border-focus placeholder:text-text-muted"
              placeholder="Question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <textarea
              className="w-full px-3 py-2.5 rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.85rem] outline-none focus:border-border-focus placeholder:text-text-muted resize-none h-[100px]"
              placeholder="Answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <input
              className="w-full px-3 py-2.5 rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.85rem] outline-none focus:border-border-focus placeholder:text-text-muted"
              placeholder="Category (optional)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={handleSave} className="px-4 py-2 rounded-md text-[0.82rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors" disabled={!question.trim() || !answer.trim()}>
                {editId ? 'Update' : 'Create'}
              </button>
              <button onClick={resetForm} className="px-4 py-2 rounded-md text-[0.82rem] font-medium text-text-secondary hover:bg-white/[0.05] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-text-muted text-[0.85rem]">Loading…</div>
      ) : faqs.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-[0.85rem]">No FAQ articles yet. Add your first one to help the AI chatbot answer common questions.</div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div key={faq.id} className="rounded-xl bg-bg-card border border-border-subtle p-4 hover:bg-bg-card-hover transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[0.85rem] font-medium text-text-primary mb-1">{faq.question}</p>
                  <p className="text-[0.78rem] text-text-secondary line-clamp-2">{faq.answer}</p>
                  {faq.category && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[0.65rem] font-semibold bg-accent-subtle text-accent-light">{faq.category}</span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleEdit(faq)} className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/[0.05] transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(faq.id)} className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Chats Tab ─────────────────────────────────────────────────────────────

function ChatsTab() {
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const selectedChatRef = useRef<string | null>(null);
  selectedChatRef.current = selectedChat;

  const clearAdminUnread = useChatNotifications((s) => s.clearAdmin);

  // Fetch chat list + clear admin badge
  useEffect(() => {
    clearAdminUnread();
    api.get<ChatRow[]>('/admin/chats').then(setChats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Pusher: Real-time updates for the selected chat ──────────────────
  useEffect(() => {
    if (!selectedChat || !pusherKey) return;

    const p = new Pusher(pusherKey, { cluster: pusherCluster });
    const channel = p.subscribe(`chat-${selectedChat}`);

    // Listen for new messages from the user (or bot)
    channel.bind('new-message', (msg: ChatMsg) => {
      if (selectedChatRef.current !== selectedChat) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      channel.unbind_all();
      p.unsubscribe(`chat-${selectedChat}`);
      p.disconnect();
    };
  }, [selectedChat]);

  // ── Pusher: Listen for new escalated chats + new user messages ──────────
  useEffect(() => {
    if (!pusherKey) return;
    const p = new Pusher(pusherKey, { cluster: pusherCluster });
    const channel = p.subscribe('admin-chats');

    channel.bind('chat-escalated', () => {
      api.get<ChatRow[]>('/admin/chats').then(setChats).catch(() => {});
      toast.info('A user has requested live support');
    });

    channel.bind('new-user-message', (data: { chatId: string; userName: string; preview: string }) => {
      api.get<ChatRow[]>('/admin/chats').then(setChats).catch(() => {});
      if (selectedChatRef.current !== data.chatId) {
        toast(`${data.userName}: ${data.preview}`, { icon: '💬' });
      }
    });

    return () => {
      channel.unbind_all();
      p.unsubscribe('admin-chats');
      p.disconnect();
    };
  }, []);

  const openChat = async (chatId: string) => {
    setSelectedChat(chatId);
    try {
      const detail = await api.get<{ messages: ChatMsg[] }>(`/admin/chats/${chatId}`);
      setMessages(detail.messages);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to load chat'); }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedChat || sending) return;
    setSending(true);
    try {
      const msg = await api.post<ChatMsg>(`/admin/chats/${selectedChat}/message`, { message: reply });
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setReply('');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to send reply'); }
    finally { setSending(false); }
  };

  const closeChat = async (chatId: string) => {
    try {
      await api.post(`/admin/chats/${chatId}/close`);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (selectedChat === chatId) { setSelectedChat(null); setMessages([]); }
      toast.success('Chat closed');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to close chat'); }
  };

  const clearChat = async (chatId: string) => {
    if (!confirm('Clear all messages in this chat? The user\'s chat will also be reset.')) return;
    setClearing(true);
    try {
      await api.delete(`/admin/chats/${chatId}/clear`);
      setMessages([]);
      setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, status: 'BOT', messages: [] } : c));
      toast.success('Chat cleared');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to clear chat'); }
    finally { setClearing(false); }
  };

  const statusColor: Record<string, string> = {
    BOT: '#6366f1', WAITING_HUMAN: '#fbbf24', HUMAN: '#34d399', CLOSED: '#6b7280',
  };

  const statusLabel: Record<string, string> = {
    BOT: 'Bot', WAITING_HUMAN: 'Waiting', HUMAN: 'Live', CLOSED: 'Closed',
  };

  return (
    <div className="animate-fade-in flex gap-4 h-[calc(100vh-180px)]">
      {/* Chat list */}
      <div className="w-[320px] shrink-0 rounded-xl border border-border-subtle overflow-hidden flex flex-col bg-bg-card">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="text-[0.85rem] font-semibold text-text-primary">Active Chats ({chats.length})</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-text-muted text-[0.82rem]">Loading…</div>
          ) : chats.length === 0 ? (
            <div className="p-6 text-center text-text-muted text-[0.82rem]">No active chats</div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => openChat(chat.id)}
                className={`px-4 py-3 border-b border-border-subtle cursor-pointer transition-colors ${
                  selectedChat === chat.id ? 'bg-accent-subtle' : 'hover:bg-white/[0.12]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[0.82rem] font-medium text-text-primary truncate">{chat.user.name}</span>
                  <span className="text-[0.6rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ color: statusColor[chat.status], background: `${statusColor[chat.status]}15` }}>
                    {statusLabel[chat.status] ?? chat.status}
                  </span>
                </div>
                <p className="text-[0.72rem] text-text-muted truncate">{chat.user.email}</p>
                {chat.messages[0] && (
                  <p className="text-[0.72rem] text-text-secondary truncate mt-1">{chat.messages[0].body}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat detail */}
      <div className="flex-1 rounded-xl border border-border-subtle overflow-hidden flex flex-col bg-bg-card">
        {!selectedChat ? (
          <div className="flex-1 flex items-center justify-center text-text-muted text-[0.85rem]">
            Select a chat to view
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
              <span className="text-[0.85rem] font-medium text-text-primary">
                {chats.find((c) => c.id === selectedChat)?.user.name ?? 'Chat'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => clearChat(selectedChat)}
                  disabled={clearing}
                  className="px-3 py-1.5 rounded-md text-[0.75rem] font-medium text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                >
                  {clearing ? 'Clearing…' : 'Clear Chat'}
                </button>
                <button
                  onClick={() => closeChat(selectedChat)}
                  className="px-3 py-1.5 rounded-md text-[0.75rem] font-medium text-danger bg-danger/10 hover:bg-danger/20 transition-colors"
                >
                  Close Chat
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8 text-text-muted text-[0.82rem]">
                  No messages yet — the chat has been cleared.
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderRole === 'USER' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[70%] px-3.5 py-2.5 rounded-2xl text-[0.82rem] leading-relaxed ${
                      msg.senderRole === 'USER'
                        ? 'bg-bg-surface text-text-primary border border-border-subtle'
                        : msg.senderRole === 'ADMIN'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                    }`}
                    style={{
                      borderBottomLeftRadius: msg.senderRole === 'USER' ? '6px' : undefined,
                      borderBottomRightRadius: msg.senderRole !== 'USER' ? '6px' : undefined,
                    }}
                  >
                    <span className="text-[0.6rem] font-bold uppercase tracking-wider block mb-1 opacity-60">
                      {msg.senderRole === 'USER' ? 'Customer' : msg.senderRole === 'ADMIN' ? 'You' : 'Bot'}
                    </span>
                    {msg.body}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Reply input */}
            <div className="px-4 py-3 border-t border-border-subtle flex gap-2">
              <input
                className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-4 py-2.5 text-[0.82rem] text-text-primary outline-none placeholder:text-text-muted focus:border-border-focus transition-colors"
                placeholder="Type a reply…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                disabled={sending}
              />
              <button
                onClick={sendReply}
                disabled={!reply.trim() || sending}
                className="px-4 py-2.5 rounded-lg text-[0.82rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
