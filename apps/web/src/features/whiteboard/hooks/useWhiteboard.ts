import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

export interface WhiteboardSummary {
  id: string;
  boardId: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhiteboardFull extends WhiteboardSummary {
  scene: any;
}

export function useWhiteboards(boardId: string | undefined) {
  return useQuery({
    queryKey: ['whiteboards', boardId],
    queryFn: () => api.get<WhiteboardSummary[]>(`/boards/${boardId}/whiteboards`),
    enabled: !!boardId,
  });
}

export function useWhiteboard(id: string | undefined) {
  return useQuery({
    queryKey: ['whiteboard', id],
    queryFn: () => api.get<WhiteboardFull>(`/whiteboards/${id}`),
    enabled: !!id,
  });
}

export function useCreateWhiteboard(boardId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name?: string) =>
      api.post<WhiteboardSummary>(`/boards/${boardId}/whiteboards`, name ? { name } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whiteboards', boardId] }),
  });
}

export function useUpdateWhiteboard(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; scene?: any }) =>
      api.patch<WhiteboardFull>(`/whiteboards/${id}`, data),
    onSuccess: (_, vars) => {
      if (vars.name !== undefined) {
        qc.invalidateQueries({ queryKey: ['whiteboards'] });
      }
    },
  });
}

export function useDeleteWhiteboard(boardId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/whiteboards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whiteboards', boardId] }),
  });
}
