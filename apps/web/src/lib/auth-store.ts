import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('ff_token'),
  user: JSON.parse(localStorage.getItem('ff_user') ?? 'null'),

  setAuth: (token, user) => {
    localStorage.setItem('ff_token', token);
    localStorage.setItem('ff_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('ff_token');
    localStorage.removeItem('ff_user');
    set({ token: null, user: null });
  },

  isAuthenticated: () => !!get().token,
}));
