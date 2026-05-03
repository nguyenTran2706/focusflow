import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import { useInvitationPreview, useAcceptInvitation } from '../features/share/useShare';

export function AcceptWhiteboardInvitePage() {
  const { token } = useParams<{ token: string }>();
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-root p-4">
      <SignedOut>
        <SignedOutInvite token={token} />
      </SignedOut>
      <SignedIn>
        <SignedInAccept token={token} />
      </SignedIn>
    </div>
  );
}

function SignedOutInvite({ token }: { token?: string }) {
  const { data: preview, isLoading, error } = useInvitationPreview('whiteboard', token);

  if (isLoading) {
    return (
      <Card>
        <Spinner />
        <Title>Loading invitation…</Title>
      </Card>
    );
  }

  if (error || !preview) {
    return (
      <Card>
        <ErrorIcon />
        <Title>Invitation not found</Title>
        <Description>This invitation may have expired or been revoked.</Description>
      </Card>
    );
  }

  const redirectUrl = `/invite/whiteboard/${token}`;

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-6">
      <Card>
        <Title>You're invited to {preview.whiteboardName}</Title>
        <Description>
          Sign in or create an account with <strong className="text-text-primary">{preview.email}</strong> to join as a {preview.role.toLowerCase()}.
        </Description>
      </Card>
      <SignIn
        routing="path"
        path={redirectUrl}
        signUpUrl={redirectUrl}
        forceRedirectUrl={redirectUrl}
        signUpForceRedirectUrl={redirectUrl}
        initialValues={{ emailAddress: preview.email }}
      />
    </div>
  );
}

function SignedInAccept({ token }: { token?: string }) {
  const navigate = useNavigate();
  const accept = useAcceptInvitation('whiteboard');
  const ranRef = useRef(false);

  useEffect(() => {
    if (!token || ranRef.current) return;
    ranRef.current = true;
    accept
      .mutateAsync(token)
      .then((res) => {
        navigate(`/boards/${res.boardId}/whiteboards/${res.whiteboardId}`, { replace: true });
      })
      .catch(() => {
        // error renders below
      });
  }, [token, accept, navigate]);

  if (accept.isError) {
    return (
      <Card>
        <ErrorIcon />
        <Title>Could not accept invitation</Title>
        <Description>{(accept.error as Error)?.message ?? 'Something went wrong'}</Description>
        <button
          className="mt-4 px-5 py-2 rounded-md text-[0.85rem] font-medium bg-accent text-white hover:bg-[#5558e6]"
          onClick={() => navigate('/dashboard')}
        >
          Go to Dashboard
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <Spinner />
      <Title>Joining whiteboard…</Title>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md w-full bg-bg-card border border-border-subtle rounded-xl p-8 text-center">
      {children}
    </div>
  );
}
function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[1.1rem] font-semibold text-text-primary mb-2">{children}</h2>;
}
function Description({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.85rem] text-text-muted">{children}</p>;
}
function Spinner() {
  return <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />;
}
function ErrorIcon() {
  return (
    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-danger/20 flex items-center justify-center">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </div>
  );
}
