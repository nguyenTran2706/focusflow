import { useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import {
  useInvitationPreview,
  useAcceptInvitation,
  destinationFor,
  type ResourceType,
} from '../features/share/useShare';

/**
 * Generic accept-invite page — handles:
 *   /invite/board/:token/*
 *   /invite/diagram/:token/*
 *   /invite/whiteboard/:token/*   (handled by AcceptWhiteboardInvitePage, but this works too)
 *
 * Derives the resource type from the second URL path segment.
 */
export function AcceptShareInvitePage() {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();

  // Path is "/invite/<resource>/<token>/..."  →  second segment is resource
  const pathParts = location.pathname.split('/');
  const rawResource = pathParts[2]; // "board" | "diagram" | "whiteboard"
  const resourceType = (rawResource as ResourceType) ?? 'board';

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-root p-4">
      <SignedOut>
        <SignedOutInvite resourceType={resourceType} token={token} />
      </SignedOut>
      <SignedIn>
        <SignedInAccept resourceType={resourceType} token={token} />
      </SignedIn>
    </div>
  );
}

// ── Signed-out: show invitation preview + Clerk sign-in/sign-up ──────────────

function SignedOutInvite({ resourceType, token }: { resourceType: ResourceType; token?: string }) {
  const { data: preview, isLoading, error } = useInvitationPreview(resourceType, token);

  const redirectUrl = `/invite/${resourceType}/${token}`;

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

  const resourceLabel =
    resourceType === 'whiteboard'
      ? preview.whiteboardName ?? preview.resourceName ?? 'whiteboard'
      : preview.resourceName ?? resourceType;

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-6">
      <Card>
        <Title>You're invited to {resourceLabel}</Title>
        <Description>
          Sign in or create an account with{' '}
          <strong className="text-text-primary">{preview.email}</strong> to join as a{' '}
          {preview.role.toLowerCase()}.
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

// ── Signed-in: auto-accept and navigate ──────────────────────────────────────

function SignedInAccept({ resourceType, token }: { resourceType: ResourceType; token?: string }) {
  const navigate = useNavigate();
  const accept = useAcceptInvitation(resourceType);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!token || ranRef.current) return;
    ranRef.current = true;
    accept
      .mutateAsync(token)
      .then((res) => {
        navigate(destinationFor(resourceType, res), { replace: true });
      })
      .catch(() => {
        // error renders below
      });
  }, [token, accept, navigate, resourceType]);

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

  const label =
    resourceType === 'whiteboard'
      ? 'whiteboard'
      : resourceType === 'diagram'
        ? 'diagram'
        : 'board';

  return (
    <Card>
      <Spinner />
      <Title>Joining {label}…</Title>
    </Card>
  );
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

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
