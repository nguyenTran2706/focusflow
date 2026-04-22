import { create } from 'zustand';

interface UserProfile {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  imageUrl?: string;
  phone?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressPostal?: string;
  addressCountry?: string;
  role: string;
  subscription: string;
  createdAt: string;
}

interface AuthState {
  dbUser: UserProfile | null;
  setDbUser: (user: UserProfile) => void;
  clearDbUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  dbUser: null,
  setDbUser: (user) => set({ dbUser: user }),
  clearDbUser: () => set({ dbUser: null }),
}));

export type { UserProfile };
