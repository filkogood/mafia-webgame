import { create } from 'zustand';

interface AdminState {
  adminToken: string | null;
  setAdminToken: (token: string | null) => void;
  isAdmin: () => boolean;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  adminToken: null,
  setAdminToken: (token) => set({ adminToken: token }),
  isAdmin: () => get().adminToken !== null,
}));
