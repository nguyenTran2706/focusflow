import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface SearchResult {
  type: 'workspace' | 'board' | 'card';
  id: string;
  title: string;
  subtitle?: string;
  path: string;
}

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Search on query change
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Get all workspaces first
        const workspaces = await api.get<{ id: string; name: string; slug: string }[]>('/workspaces');
        const q = query.toLowerCase();
        const matched: SearchResult[] = [];

        // Search workspaces
        for (const ws of workspaces) {
          if (ws.name.toLowerCase().includes(q) || ws.slug.toLowerCase().includes(q)) {
            matched.push({
              type: 'workspace',
              id: ws.id,
              title: ws.name,
              subtitle: `/${ws.slug}`,
              path: `/workspaces/${ws.id}`,
            });
          }
        }

        // Search boards within each workspace
        for (const ws of workspaces) {
          try {
            const boards = await api.get<{ id: string; name: string }[]>(`/workspaces/${ws.id}/boards`);
            for (const board of boards) {
              if (board.name.toLowerCase().includes(q)) {
                matched.push({
                  type: 'board',
                  id: board.id,
                  title: board.name,
                  subtitle: ws.name,
                  path: `/boards/${board.id}`,
                });
              }
            }
          } catch {
            // skip
          }
        }

        setResults(matched.slice(0, 10));
        setSelectedIdx(0);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault();
      handleSelect(results[selectedIdx]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  const typeIcons: Record<string, React.ReactNode> = {
    workspace: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    board: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
      </svg>
    ),
    card: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 7h10" /><path d="M7 12h6" />
      </svg>
    ),
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-[540px] max-w-[calc(100vw-2rem)] bg-bg-card border border-border-subtle rounded-2xl shadow-2xl z-[101] overflow-hidden animate-fade-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-muted shrink-0">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-text-primary text-[0.925rem] outline-none placeholder:text-text-muted"
            placeholder="Search workspaces, boards..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="px-2 py-0.5 rounded bg-white/[0.08] text-text-muted text-[0.65rem] font-mono border border-border-subtle">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto">
          {loading && (
            <div className="px-5 py-4 text-text-muted text-[0.825rem] flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Searching...
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-text-muted text-[0.825rem]">No results found for "{query}"</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${r.id}`}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                    i === selectedIdx ? 'bg-accent/10 text-accent-light' : 'text-text-primary hover:bg-white/[0.06]'
                  }`}
                  onClick={() => handleSelect(r)}
                  onMouseEnter={() => setSelectedIdx(i)}
                >
                  <div className={`shrink-0 ${i === selectedIdx ? 'text-accent-light' : 'text-text-muted'}`}>
                    {typeIcons[r.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.85rem] font-medium truncate">{r.title}</p>
                    {r.subtitle && (
                      <p className="text-[0.72rem] text-text-muted truncate">{r.subtitle}</p>
                    )}
                  </div>
                  <span className="text-[0.65rem] font-medium text-text-muted uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded bg-white/[0.06]">
                    {r.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && !query && (
            <div className="px-5 py-6 text-center">
              <p className="text-text-muted text-[0.825rem]">Start typing to search across workspaces and boards</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-5 py-3 border-t border-border-subtle bg-white/[0.02]">
          <div className="flex items-center gap-1.5 text-[0.65rem] text-text-muted">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] font-mono border border-border-subtle">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] font-mono border border-border-subtle">↓</kbd>
            <span>navigate</span>
          </div>
          <div className="flex items-center gap-1.5 text-[0.65rem] text-text-muted">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] font-mono border border-border-subtle">↵</kbd>
            <span>open</span>
          </div>
        </div>
      </div>
    </>
  );
}
