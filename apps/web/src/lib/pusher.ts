import Pusher from 'pusher-js';

import { getTokenFn } from './api';

// We initialize Pusher only once globally
export const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY || 'dummy_key', {
  cluster: import.meta.env.VITE_PUSHER_CLUSTER || 'ap4',
  forceTLS: true,
  authorizer: (channel) => {
    return {
      authorize: async (socketId, callback) => {
        try {
          const token = getTokenFn ? await getTokenFn() : null;
          const response = await fetch('/api/pusher/auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          callback(null, data);
        } catch (error) {
          callback(error as Error, { auth: '' });
        }
      },
    };
  },
});

export function getSocketId() {
  return pusher.connection.socket_id;
}
