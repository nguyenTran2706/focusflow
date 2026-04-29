import { create } from 'zustand';
import Pusher from 'pusher-js';

const pusherKey = import.meta.env.VITE_PUSHER_KEY;
const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER ?? 'ap4';

interface ChatNotificationState {
  adminUnread: number;
  incrementAdmin: () => void;
  clearAdmin: () => void;
}

export const useChatNotifications = create<ChatNotificationState>((set) => ({
  adminUnread: 0,
  incrementAdmin: () => set((s) => ({ adminUnread: s.adminUnread + 1 })),
  clearAdmin: () => set({ adminUnread: 0 }),
}));

let adminPusherInitialized = false;

export function initAdminChatListener() {
  if (adminPusherInitialized || !pusherKey) return;
  adminPusherInitialized = true;

  const pusher = new Pusher(pusherKey, { cluster: pusherCluster });
  const channel = pusher.subscribe('admin-chats');

  channel.bind('new-user-message', () => {
    useChatNotifications.getState().incrementAdmin();
  });

  channel.bind('chat-escalated', () => {
    useChatNotifications.getState().incrementAdmin();
  });
}
