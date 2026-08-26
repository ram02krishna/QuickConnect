import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  bio?: string | null;
  createdAt?: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  setAuth: (user: UserProfile, token: string) => void;
  setToken: (token: string) => void;
  updateUser: (fields: Partial<UserProfile>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      setToken: (token) => set({ token }),
      updateUser: (fields) =>
          set((state) => ({
            user: state.user ? { ...state.user, ...fields } : null,
          })),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: "quickconnect-auth", 
    }
  )
);
