import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ accessToken: string; user: { id: string; email: string; name: string } }>(
        '/auth/register',
        { name, email, password },
      );
      setAuth(res.accessToken, res.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg-root">
      <div className="w-full max-w-[380px] bg-bg-surface border border-border-subtle rounded-xl p-8">
        <div className="flex items-center gap-[10px] mb-8">
          <div className="w-[36px] h-[36px] flex items-center justify-center bg-accent rounded-md">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#fff" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#fff" opacity="0.6" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#fff" opacity="0.6" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#fff" opacity="0.3" />
            </svg>
          </div>
          <span className="text-[1.15rem] font-bold text-text-primary">FocusFlow</span>
        </div>

        <h1 className="text-[1.35rem] mb-1">Create account</h1>
        <p className="text-text-secondary text-[0.875rem] mb-6">Start with a free workspace</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <div className="py-[10px] px-[12px] rounded-md bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] text-danger text-[0.8rem]">{error}</div>}

          <div className="flex flex-col gap-[6px] [&>label]:text-[0.8rem] [&>label]:font-medium [&>label]:text-text-secondary">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              className="px-3 py-[9px] rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.875rem] transition-colors outline-none focus:border-border-focus placeholder:text-text-muted w-full"
              type="text"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-[6px] [&>label]:text-[0.8rem] [&>label]:font-medium [&>label]:text-text-secondary">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="px-3 py-[9px] rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.875rem] transition-colors outline-none focus:border-border-focus placeholder:text-text-muted w-full"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-[6px] [&>label]:text-[0.8rem] [&>label]:font-medium [&>label]:text-text-secondary">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="px-3 py-[9px] rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.875rem] transition-colors outline-none focus:border-border-focus placeholder:text-text-muted w-full"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <button type="submit" className="inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-md text-[0.875rem] font-medium transition-colors whitespace-nowrap bg-accent text-white hover:bg-[#5558e6] w-full disabled:opacity-40 disabled:cursor-not-allowed" disabled={loading}>
            {loading ? <span className="inline-block w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin-fast" /> : null}
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-[0.85rem] text-text-secondary [&>a]:font-medium">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
