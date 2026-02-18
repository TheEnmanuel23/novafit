
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Staff } from '@/lib/types';

interface AuthState {
  isAuthenticated: boolean;
  user: Staff | null;
  login: (user: Staff) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      login: (user) => set({ isAuthenticated: true, user }),
      logout: () => set({ isAuthenticated: false, user: null }),
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
    }
  )
);
