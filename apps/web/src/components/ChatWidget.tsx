import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { useThemeStore, getEffectiveTheme } from '../lib/theme-store';
import Pusher from 'pusher-js';

interface ChatMsg {
  id: string;
  senderRole: 'USER' | 'BOT' | 'ADMIN';
  body: string;
  createdAt: string;
}

const pusherKey = import.meta.env.VITE_PUSHER_KEY;
const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER ?? 'ap4';

export function ChatWidget() {
  const dbUser = useAuthStore((s) => s.dbUser);
  const isFree = dbUser?.subscription === 'FREE';
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string>('BOT');
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const pusherRef = useRef<Pusher | null>(null);
  const themeMode = useThemeStore((s) => s.mode);
  const isDark = getEffectiveTheme(themeMode) === 'dark';

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setUnreadCount(0);
    }
  }, [open]);

  // ── Fetch or create chat on first open ──────────────────────────────────
  useEffect(() => {
    if (open && !chatId) {
      api
        .get<{ id: string; status: string; messages: ChatMsg[] }>('/chat')
        .then((chat) => {
          setChatId(chat.id);
          setMessages(chat.messages);
          setStatus(chat.status);
        })
        .catch(() => {});
    }
  }, [open, chatId]);

  // ── Pusher subscription for real-time messages + chat-cleared ───────────
  useEffect(() => {
    if (!chatId || !pusherKey) return;

    const pusher = new Pusher(pusherKey, { cluster: pusherCluster });
    pusherRef.current = pusher;

    const channel = pusher.subscribe(`chat-${chatId}`);

    // Listen for new messages (from admin, bot, or user on another tab)
    channel.bind('new-message', (msg: ChatMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      if (msg.senderRole === 'ADMIN') {
        setStatus('HUMAN');

        // If widget is closed, show notification toast + increment badge
        if (!openRef.current) {
          setUnreadCount((c) => c + 1);
          showToast(msg.body);
        }
      }
    });

    // Listen for chat cleared/closed by admin
    channel.bind('chat-cleared', () => {
      // Reset the widget state completely
      setMessages([]);
      setChatId(null);
      setStatus('BOT');
      setInput('');
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`chat-${chatId}`);
      pusher.disconnect();
    };
  }, [chatId]);

  // ── Toast notification ─────────────────────────────────────────────────
  const showToast = useCallback((message: string) => {
    const id = Date.now();
    setToast({ message, id });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 5000);
  }, []);

  const send = async () => {
    if (!input.trim() || !chatId || sending) return;

    const text = input.trim();
    setInput('');

    const tempMsg: ChatMsg = {
      id: `temp-${Date.now()}`,
      senderRole: 'USER',
      body: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setSending(true);

    try {
      const res = await api.post<{ reply: ChatMsg | null; source: string }>('/chat/message', {
        chatId,
        message: text,
      });
      if (res.reply) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.reply!.id)) return prev;
          return [...prev, res.reply!];
        });
      }
    } catch {
      // Silently fail
    } finally {
      setSending(false);
    }
  };

  const escalate = async () => {
    if (!chatId) return;
    try {
      await api.post('/chat/human', { chatId });
      setStatus('WAITING_HUMAN');
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          senderRole: 'BOT',
          body: "I've connected you to our support team. An agent will be with you shortly!",
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      // Silently fail
    }
  };

  const backToAI = async () => {
    if (!chatId) return;
    try {
      await api.post('/chat/back-to-ai', { chatId });
      setStatus('BOT');
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          senderRole: 'BOT',
          body: "You're now chatting with our AI assistant again. How can I help?",
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      // Silently fail
    }
  };

  // ── Theme-aware colors ────────────────────────────────────────────────
  const panelBg = isDark ? '#1a1d2b' : '#ffffff';
  const panelBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
  const panelShadow = isDark ? '0 12px 48px rgba(0,0,0,0.5)' : '0 12px 48px rgba(0,0,0,0.15)';
  const headerBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const headerGrad = isDark
    ? 'linear-gradient(135deg, rgba(124,58,237,0.12), transparent)'
    : 'linear-gradient(135deg, rgba(124,58,237,0.06), transparent)';
  const titleColor = isDark ? '#f0f0f5' : '#1a1a2e';
  const subtitleColor = isDark ? '#a8abbe' : '#4a4a68';
  const emptySubColor = isDark ? '#6b6f85' : '#8888a0';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
  const inputText = isDark ? '#f0f0f5' : '#1a1a2e';
  const inputPlaceholder = isDark ? '#6b6f85' : '#8888a0';

  // Bubble colors
  const userBubbleBg = 'linear-gradient(135deg, #7c3aed, #a78bfa)';
  const botBubbleBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const botBubbleText = isDark ? '#d4d4e0' : '#2e2e48';
  const adminBubbleBg = isDark ? 'rgba(52,211,153,0.12)' : 'rgba(16,185,129,0.10)';
  const adminBubbleText = isDark ? '#34d399' : '#059669';

  return (
    <>
      {/* ── Toast notification popup ─────────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-24 right-6 z-[210] max-w-[340px] animate-[chatSlideUp_0.3s_ease_both]"
          onClick={() => { setToast(null); setOpen(true); }}
          style={{ cursor: 'pointer' }}
        >
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl border"
            style={{
              background: isDark ? '#1e2235' : '#ffffff',
              borderColor: isDark ? 'rgba(52,211,153,0.25)' : 'rgba(16,185,129,0.25)',
              boxShadow: isDark
                ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(52,211,153,0.1)'
                : '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(16,185,129,0.1)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: 'rgba(52,211,153,0.15)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.7rem] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#34d399' }}>
                Support Agent
              </p>
              <p className="text-[0.8rem] leading-snug line-clamp-2" style={{ color: isDark ? '#d4d4e0' : '#2e2e48' }}>
                {toast.message}
              </p>
            </div>
            <button
              className="shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors"
              onClick={(e) => { e.stopPropagation(); setToast(null); }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#6b6f85' : '#8888a0'} strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Floating bubble with unread badge ────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[200] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
          boxShadow: '0 4px 24px rgba(124,58,237,0.35)',
        }}
        aria-label="Toggle chat"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        {/* Unread badge */}
        {!open && unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white animate-[badgePop_0.3s_ease_both]"
            style={{ background: '#ef4444', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Chat panel ───────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-[200] w-[380px] max-h-[540px] flex flex-col rounded-2xl border overflow-hidden"
          style={{
            background: panelBg,
            borderColor: panelBorder,
            boxShadow: panelShadow,
            animation: 'chatSlideUp 0.25s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-5 py-4 border-b"
            style={{
              borderColor: headerBorder,
              background: headerGrad,
            }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-[0.9rem] font-semibold" style={{ color: titleColor }}>FocusFlow Support</h4>
              <p className="text-[0.7rem]" style={{ color: subtitleColor }}>
                {status === 'WAITING_HUMAN'
                  ? 'Waiting for an agent…'
                  : status === 'HUMAN'
                    ? 'Connected to support'
                    : 'AI-powered assistant'}
              </p>
            </div>
            {status === 'BOT' ? (
              <button
                onClick={escalate}
                className="text-[0.7rem] px-3 py-1.5 rounded-full font-medium transition-colors"
                style={{
                  background: 'rgba(251,191,36,0.12)',
                  color: '#fbbf24',
                  border: '1px solid rgba(251,191,36,0.2)',
                }}
              >
                Talk to human
              </button>
            ) : (
              <button
                onClick={backToAI}
                className="text-[0.7rem] px-3 py-1.5 rounded-full font-medium transition-colors flex items-center gap-1.5"
                style={{
                  background: 'rgba(124,58,237,0.12)',
                  color: '#a78bfa',
                  border: '1px solid rgba(124,58,237,0.2)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                </svg>
                Back to AI
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: '380px' }}>
            {isFree ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.12)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <p className="text-[0.85rem] font-medium" style={{ color: titleColor }}>AI Chat is a Pro Feature</p>
                <p className="text-[0.75rem] mt-1" style={{ color: emptySubColor }}>Upgrade to Pro or Pro Max to chat with our AI assistant and get live support.</p>
                <a href="/pricing" className="inline-block mt-3 px-4 py-1.5 rounded-md text-[0.75rem] font-medium" style={{ background: 'rgba(251,191,36,0.15)', color: '#f59e0b' }}>
                  View Plans
                </a>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="text-[0.85rem]" style={{ color: subtitleColor }}>Hi! How can I help you today?</p>
                <p className="text-[0.75rem] mt-1" style={{ color: emptySubColor }}>Ask me anything about FocusFlow</p>
              </div>
            ) : null}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderRole === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[0.82rem] leading-relaxed"
                  style={{
                    background:
                      msg.senderRole === 'USER'
                        ? userBubbleBg
                        : msg.senderRole === 'ADMIN'
                          ? adminBubbleBg
                          : botBubbleBg,
                    color:
                      msg.senderRole === 'USER'
                        ? '#fff'
                        : msg.senderRole === 'ADMIN'
                          ? adminBubbleText
                          : botBubbleText,
                    borderBottomRightRadius: msg.senderRole === 'USER' ? '6px' : undefined,
                    borderBottomLeftRadius: msg.senderRole !== 'USER' ? '6px' : undefined,
                  }}
                >
                  {msg.senderRole === 'ADMIN' && (
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider block mb-1" style={{ color: adminBubbleText }}>
                      Support Agent
                    </span>
                  )}
                  {msg.body}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl" style={{ background: botBubbleBg }}>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t" style={{ borderColor: headerBorder }}>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                className="flex-1 rounded-xl px-4 py-2.5 text-[0.82rem] outline-none transition-colors"
                style={{
                  background: inputBg,
                  border: `1px solid ${inputBorder}`,
                  color: inputText,
                }}
                placeholder={isFree ? 'Upgrade to Pro to chat…' : 'Type a message…'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                disabled={sending || isFree}
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: 'rgba(124,58,237,0.15)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation keyframes */}
      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes badgePop {
          0% { transform: scale(0); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        input::placeholder {
          color: ${inputPlaceholder};
        }
      `}</style>
    </>
  );
}
