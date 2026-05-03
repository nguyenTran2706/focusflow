import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJoinByLink } from '../features/share/useShare';

export function JoinWhiteboardLinkPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const join = useJoinByLink('whiteboard');
  const ranRef = useRef(false);

  useEffect(() => {
    if (!token || ranRef.current) return;
    ranRef.current = true;
    join
      .mutateAsync(token)
      .then((res) => {
        navigate(`/boards/${res.boardId}/whiteboards/${res.whiteboardId}`, { replace: true });
      })
      .catch(() => {});
  }, [token, join, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-root p-4">
      <div className="max-w-md w-full bg-bg-card border border-border-subtle rounded-xl p-8 text-center">
        {join.isError ? (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-danger/20 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h2 className="text-[1.1rem] font-semibold text-text-primary mb-2">Could not open whiteboard</h2>
            <p className="text-[0.85rem] text-text-muted mb-4">
              {(join.error as Error)?.message ?? 'Link is invalid or sharing is disabled'}
            </p>
            <button
              className="px-5 py-2 rounded-md text-[0.85rem] font-medium bg-accent text-white hover:bg-[#5558e6]"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-[1.1rem] font-semibold text-text-primary mb-2">Opening whiteboard…</h2>
          </>
        )}
      </div>
    </div>
  );
}
