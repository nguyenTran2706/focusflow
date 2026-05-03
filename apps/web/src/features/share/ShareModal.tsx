import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  useShare,
  useInviteCollaborators,
  useUpdateCollaborator,
  useRemoveCollaborator,
  useRevokeInvitation,
  useUpdateLinkAccess,
  type ShareRole,
  type LinkAccess,
  type ResourceType,
} from './useShare';

interface Props {
  resourceType: ResourceType;
  resourceId: string;
  open: boolean;
  onClose: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PLURAL: Record<ResourceType, string> = {
  whiteboard: 'whiteboards',
  board: 'boards',
  diagram: 'diagrams',
};

export function ShareModal({ resourceType, resourceId, open, onClose }: Props) {
  const id = open ? resourceId : undefined;
  const { data: share, isLoading } = useShare(resourceType, id);
  const invite = useInviteCollaborators(resourceType, resourceId);
  const updateCollab = useUpdateCollaborator(resourceType, resourceId);
  const removeCollab = useRemoveCollaborator(resourceType, resourceId);
  const revokeInvite = useRevokeInvitation(resourceType, resourceId);
  const updateLink = useUpdateLinkAccess(resourceType, resourceId);

  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [role, setRole] = useState<ShareRole>('EDITOR');

  const linkUrl = useMemo(() => {
    if (!share) return '';
    return `${window.location.origin}/${PLURAL[resourceType]}/join/${share.linkToken}`;
  }, [share, resourceType]);

  if (!open) return null;

  const tryAddEmail = (raw: string) => {
    const e = raw.trim().toLowerCase();
    if (!e) return;
    if (!EMAIL_RE.test(e)) {
      toast.error('Invalid email address');
      return;
    }
    if (emails.includes(e)) return;
    setEmails((prev) => [...prev, e]);
    setEmailInput('');
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      tryAddEmail(emailInput);
    } else if (e.key === 'Backspace' && !emailInput && emails.length) {
      setEmails((prev) => prev.slice(0, -1));
    }
  };

  const handleInvite = async () => {
    const pending = emailInput.trim();
    const all = pending && EMAIL_RE.test(pending) ? [...emails, pending.toLowerCase()] : emails;
    if (!all.length) return;
    try {
      const res = await invite.mutateAsync({ emails: all, role });
      setEmails([]);
      setEmailInput('');
      const collab = res.results.filter((r) => r.status === 'collaborator').length;
      const invited = res.results.filter((r) => r.status === 'invited').length;
      const already = res.results.filter((r) => r.status === 'already').length;
      const parts: string[] = [];
      if (collab) parts.push(`${collab} added`);
      if (invited) parts.push(`${invited} invited`);
      if (already) parts.push(`${already} already had access`);
      toast.success(parts.join(' · ') || 'Done');
    } catch (err) {
      toast.error((err as Error).message || 'Failed to invite');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(linkUrl);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const handleLinkAccessChange = async (access: LinkAccess) => {
    try {
      await updateLink.mutateAsync(access);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to update link access');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] bg-bg-card border border-border-subtle rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-[1rem] font-semibold text-text-primary">
            Share {share?.name ? `"${share.name}"` : resourceType}
          </h2>
          <button
            className="p-1.5 rounded-md text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[0.75rem] font-medium text-text-secondary mb-2">
              Invite people
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-md bg-bg-surface border border-border-subtle min-h-[38px]">
                {emails.map((e) => (
                  <span
                    key={e}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent/15 text-accent-light text-[0.75rem]"
                  >
                    {e}
                    <button
                      onClick={() => setEmails((prev) => prev.filter((x) => x !== e))}
                      className="hover:text-text-primary"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="email"
                  value={emailInput}
                  onChange={(ev) => setEmailInput(ev.target.value)}
                  onKeyDown={handleEmailKeyDown}
                  onBlur={() => emailInput && tryAddEmail(emailInput)}
                  placeholder={emails.length ? '' : 'name@example.com'}
                  className="flex-1 min-w-[140px] bg-transparent text-[0.85rem] text-text-primary placeholder:text-text-muted outline-none"
                />
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ShareRole)}
                className="px-3 py-1.5 rounded-md bg-bg-surface border border-border-subtle text-[0.8rem] text-text-primary outline-none"
              >
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={invite.isPending || (!emails.length && !emailInput.trim())}
                className="px-4 py-1.5 rounded-md text-[0.8rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors disabled:opacity-50"
              >
                Invite
              </button>
            </div>
            <p className="text-[0.7rem] text-text-muted mt-1.5">
              External email addresses get a sign-up link. They'll join after creating a FocusFlow account.
            </p>
          </div>

          <div className="rounded-md border border-border-subtle bg-bg-surface px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent-light">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <div>
                  <div className="text-[0.8rem] font-medium text-text-primary">Anyone with the link</div>
                  <div className="text-[0.7rem] text-text-muted">
                    {share?.linkAccess === 'NONE' && 'No access'}
                    {share?.linkAccess === 'VIEW' && 'Can view'}
                    {share?.linkAccess === 'EDIT' && 'Can edit'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={share?.linkAccess ?? 'NONE'}
                  onChange={(e) => handleLinkAccessChange(e.target.value as LinkAccess)}
                  disabled={!share || updateLink.isPending}
                  className="px-2.5 py-1 rounded-md bg-bg-card border border-border-subtle text-[0.75rem] text-text-primary outline-none"
                >
                  <option value="NONE">No access</option>
                  <option value="VIEW">Can view</option>
                  <option value="EDIT">Can edit</option>
                </select>
                {share && share.linkAccess !== 'NONE' && (
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1 rounded-md text-[0.75rem] font-medium bg-bg-card border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                  >
                    Copy link
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="text-[0.75rem] font-medium text-text-secondary mb-2">
              {resourceType === 'board' ? 'Board' : resourceType === 'diagram' ? 'Diagram' : 'Whiteboard'} access
            </div>
            {isLoading ? (
              <div className="text-[0.8rem] text-text-muted py-3">Loading…</div>
            ) : (
              <div className="space-y-1.5">
                {share?.collaborators.length === 0 && share?.invitations.length === 0 && (
                  <div className="text-[0.8rem] text-text-muted py-2">
                    No external collaborators yet. Invite people above.
                  </div>
                )}
                {share?.collaborators.map((c) => (
                  <div
                    key={c.userId}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-md hover:bg-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {c.user?.imageUrl ? (
                        <img src={c.user.imageUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-accent/20 text-accent-light flex items-center justify-center text-[0.7rem] font-semibold">
                          {(c.user?.name ?? c.user?.email ?? '?').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-[0.8rem] text-text-primary truncate">
                          {c.user?.name ?? c.user?.email ?? 'Unknown'}
                        </div>
                        {c.user?.email && c.user.name && (
                          <div className="text-[0.7rem] text-text-muted truncate">{c.user.email}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={c.role}
                        onChange={(e) =>
                          updateCollab.mutate({ userId: c.userId, role: e.target.value as ShareRole })
                        }
                        className="px-2 py-1 rounded-md bg-bg-surface border border-border-subtle text-[0.7rem] text-text-primary outline-none"
                      >
                        <option value="EDITOR">Editor</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      <button
                        onClick={() => removeCollab.mutate(c.userId)}
                        className="p-1 rounded text-text-muted hover:text-danger hover:bg-danger/10"
                        title="Remove"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                {share?.invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-md hover:bg-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-bg-surface border border-dashed border-border-subtle text-text-muted flex items-center justify-center text-[0.7rem] font-semibold">
                        {inv.email.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[0.8rem] text-text-primary truncate">{inv.email}</div>
                        <div className="text-[0.7rem] text-text-muted">Pending · {inv.role.toLowerCase()}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => revokeInvite.mutate(inv.id)}
                      className="p-1 rounded text-text-muted hover:text-danger hover:bg-danger/10"
                      title="Revoke"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
