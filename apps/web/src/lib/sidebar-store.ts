import { create } from 'zustand';

interface SidebarState {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  close: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
  close: () => set({ open: false }),
}));
