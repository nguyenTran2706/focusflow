import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { pusher } from '../lib/pusher';

export function useRealtime(boardId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!boardId) return;

    const channelName = `private-board-${boardId}`;
    const channel = pusher.subscribe(channelName);

    channel.bind('board.updated', () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    });

    channel.bind('sprint.updated', () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', boardId] });
      queryClient.invalidateQueries({ queryKey: ['sprint-backlog', boardId] });
      // Sprints also affect the board view potentially if cards are moved
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    });

    channel.bind('whiteboard.updated', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['whiteboards', boardId] });
      if (data && data.id) {
        queryClient.invalidateQueries({ queryKey: ['whiteboard', data.id] });
      }
    });

    channel.bind('diagram.updated', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['diagrams', boardId] });
      if (data && data.id) {
        queryClient.invalidateQueries({ queryKey: ['diagram', data.id] });
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [boardId, queryClient]);
}
