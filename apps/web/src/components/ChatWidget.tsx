import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
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
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string>('BOT');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pusherRef = useRef<Pusher | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

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

  // Pusher subscription for real-time admin replies
  useEffect(() => {
    if (!chatId || !pusherKey) return;

    const pusher = new Pusher(pusherKey, { cluster: pusherCluster });
    pusherRef.current = pusher;

    const channel = pusher.subscribe(`chat-${chatId}`);
    channel.bind('new-message', (msg: ChatMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.senderRole === 'ADMIN') setStatus('HUMAN');
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`chat-${chatId}`);
      pusher.disconnect();
    };
  }, [chatId]);

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

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[200] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #6366f1, #818cf8)',
          boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
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
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-[200] w-[380px] max-h-[540px] flex flex-col rounded-2xl border overflow-hidden"
          style={{
            background: '#1a1a1f',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
            animation: 'chatSlideUp 0.25s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-5 py-4 border-b"
            style={{
              borderColor: 'rgba(255,255,255,0.06)',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12), transparent)',
            }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.2)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-[0.9rem] font-semibold text-[#ececef]">FocusFlow Support</h4>
              <p className="text-[0.7rem] text-[#9394a0]">
                {status === 'WAITING_HUMAN'
                  ? 'Waiting for an agent…'
                  : status === 'HUMAN'
                    ? 'Connected to support'
                    : 'AI-powered assistant'}
              </p>
            </div>
            {status === 'BOT' && (
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
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: '380px' }}>
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="text-[0.85rem] text-[#9394a0]">Hi! How can I help you today?</p>
                <p className="text-[0.75rem] text-[#5c5d6a] mt-1">Ask me anything about FocusFlow</p>
              </div>
            )}
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
                        ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                        : msg.senderRole === 'ADMIN'
                          ? 'rgba(52,211,153,0.12)'
                          : 'rgba(255,255,255,0.06)',
                    color:
                      msg.senderRole === 'USER'
                        ? '#fff'
                        : msg.senderRole === 'ADMIN'
                          ? '#34d399'
                          : '#d4d4d8',
                    borderBottomRightRadius: msg.senderRole === 'USER' ? '6px' : undefined,
                    borderBottomLeftRadius: msg.senderRole !== 'USER' ? '6px' : undefined,
                  }}
                >
                  {msg.senderRole === 'ADMIN' && (
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider block mb-1" style={{ color: '#34d399' }}>
                      Support Agent
                    </span>
                  )}
                  {msg.body}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#6366f1] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#6366f1] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#6366f1] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-[0.82rem] text-[#ececef] outline-none placeholder:text-[#5c5d6a] focus:border-[#6366f1] transition-colors"
                placeholder="Type a message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                disabled={sending}
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: 'rgba(99,102,241,0.15)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation keyframe */}
      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
