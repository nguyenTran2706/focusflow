import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');

  useEffect(() => {
    if (!token) return;
    api.post<{ workspaceId: string; workspaceName: string }>(`/workspaces/invites/${token}/accept`)
      .then((res) => {
        setStatus('success');
        setWorkspaceName(res.workspaceName);
        setTimeout(() => navigate(`/workspaces/${res.workspaceId}`), 2000);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err?.message ?? 'Failed to accept invite');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-root">
      <div className="max-w-md w-full bg-bg-card border border-border-subtle rounded-xl p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-[1.1rem] font-semibold text-text-primary mb-2">Accepting invite...</h2>
            <p className="text-[0.85rem] text-text-muted">Please wait while we add you to the workspace.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h2 className="text-[1.1rem] font-semibold text-text-primary mb-2">You're in!</h2>
            <p className="text-[0.85rem] text-text-muted">You've been added to <strong className="text-text-primary">{workspaceName}</strong>. Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-danger/20 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </div>
            <h2 className="text-[1.1rem] font-semibold text-text-primary mb-2">Invite failed</h2>
            <p className="text-[0.85rem] text-text-muted mb-4">{message}</p>
            <button
              className="px-5 py-2 rounded-md text-[0.85rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
