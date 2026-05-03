import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export type ResourceType = 'whiteboard' | 'board' | 'diagram';
export type ShareRole = 'VIEWER' | 'EDITOR';
export type LinkAccess = 'NONE' | 'VIEW' | 'EDIT';

export interface ShareCollaborator {
  userId: string;
  role: ShareRole;
  addedById: string;
  createdAt: string;
  user: { id: string; name: string; email: string; imageUrl: string | null } | null;
}

export interface ShareInvitation {
  id: string;
  email: string;
  role: ShareRole;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface ShareInfo {
  id: string;
  name: string;
  linkAccess: LinkAccess;
  linkToken: string;
  collaborators: ShareCollaborator[];
  invitations: ShareInvitation[];
}

const PLURAL: Record<ResourceType, string> = {
  whiteboard: 'whiteboards',
  board: 'boards',
  diagram: 'diagrams',
};

export function resourcePath(resource: ResourceType, id: string) {
  return `/${PLURAL[resource]}/${id}`;
}

export function joinPath(resource: ResourceType, token: string) {
  return `/${PLURAL[resource]}/by-link/${token}/join`;
}

export function shareKey(resource: ResourceType, id: string | undefined) {
  return ['share', resource, id] as const;
}

export function useShare(resource: ResourceType, id: string | undefined) {
  return useQuery({
    queryKey: shareKey(resource, id),
    queryFn: () => api.get<ShareInfo>(`${resourcePath(resource, id!)}/share`),
    enabled: !!id,
  });
}

export function useInviteCollaborators(resource: ResourceType, id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { emails: string[]; role: ShareRole }) =>
      api.post<{ results: Array<{ email: string; status: 'collaborator' | 'invited' | 'already' }> }>(
        `${resourcePath(resource, id!)}/invitations`,
        vars,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: shareKey(resource, id) }),
  });
}

export function useUpdateCollaborator(resource: ResourceType, id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; role: ShareRole }) =>
      api.patch(`${resourcePath(resource, id!)}/collaborators/${vars.userId}`, { role: vars.role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: shareKey(resource, id) }),
  });
}

export function useRemoveCollaborator(resource: ResourceType, id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`${resourcePath(resource, id!)}/collaborators/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: shareKey(resource, id) }),
  });
}

export function useRevokeInvitation(resource: ResourceType, id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      api.delete(`${resourcePath(resource, id!)}/invitations/${invitationId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: shareKey(resource, id) }),
  });
}

export function useUpdateLinkAccess(resource: ResourceType, id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (access: LinkAccess) =>
      api.patch<{ id: string; linkAccess: LinkAccess; linkToken: string }>(
        `${resourcePath(resource, id!)}/link-access`,
        { access },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: shareKey(resource, id) }),
  });
}

export interface InvitationPreview {
  email: string;
  role: ShareRole;
  resourceType: ResourceType;
  resourceName?: string;
  whiteboardName?: string;
  whiteboardId?: string;
  diagramId?: string;
  boardId: string;
  expiresAt: string;
}

export function useInvitationPreview(resource: ResourceType, token: string | undefined) {
  return useQuery({
    queryKey: ['invite-preview', resource, token],
    queryFn: () => api.get<InvitationPreview>(`/invitations/${resource}/${token}`),
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptInvitation(resource: ResourceType) {
  return useMutation({
    mutationFn: (token: string) =>
      api.post<{ whiteboardId?: string; diagramId?: string; boardId: string }>(
        `/invitations/${resource}/${token}/accept`,
      ),
  });
}

export function useJoinByLink(resource: ResourceType) {
  return useMutation({
    mutationFn: (token: string) =>
      api.post<{ whiteboardId?: string; diagramId?: string; boardId: string }>(
        joinPath(resource, token),
      ),
  });
}

export function destinationFor(
  resource: ResourceType,
  res: { whiteboardId?: string; diagramId?: string; boardId: string },
): string {
  if (resource === 'whiteboard') return `/boards/${res.boardId}/whiteboards/${res.whiteboardId}`;
  if (resource === 'diagram') return `/boards/${res.boardId}/diagrams/${res.diagramId}`;
  return `/boards/${res.boardId}`;
}
