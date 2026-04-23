import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

export interface DiagramSummary {
  id: string;
  boardId: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiagramFull extends DiagramSummary {
  data: any;
}

export function useDiagrams(boardId: string | undefined) {
  return useQuery({
    queryKey: ['diagrams', boardId],
    queryFn: () => api.get<DiagramSummary[]>(`/boards/${boardId}/diagrams`),
    enabled: !!boardId,
  });
}

export function useDiagram(id: string | undefined) {
  return useQuery({
    queryKey: ['diagram', id],
    queryFn: () => api.get<DiagramFull>(`/diagrams/${id}`),
    enabled: !!id,
  });
}

export function useCreateDiagram(boardId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name?: string) =>
      api.post<DiagramSummary>(`/boards/${boardId}/diagrams`, name ? { name } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diagrams', boardId] }),
  });
}

export function useUpdateDiagram(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name?: string; data?: any }) =>
      api.patch<DiagramFull>(`/diagrams/${id}`, payload),
    onSuccess: (_, vars) => {
      if (vars.name !== undefined) {
        qc.invalidateQueries({ queryKey: ['diagrams'] });
      }
    },
  });
}

export function useDeleteDiagram(boardId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/diagrams/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diagrams', boardId] }),
  });
}
