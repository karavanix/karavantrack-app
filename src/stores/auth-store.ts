import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";
import type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthTokens,
  RegisterResponse,
} from "@/types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isLoading: boolean;

  setTokens: (access: string, refresh: string) => void;
  setUser: (user: User) => void;
  login: (req: LoginRequest) => Promise<void>;
  register: (req: RegisterRequest) => Promise<void>;
  fetchMe: () => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isLoading: false,

      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh }),

      setUser: (user) => set({ user }),

      login: async (req) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post<AuthTokens>("/auth/login", req);
          set({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          });
          // Fetch user profile after login
          await get().fetchMe();
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (req) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post<RegisterResponse>("/auth/register", req);
          set({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          });
          await get().fetchMe();
        } finally {
          set({ isLoading: false });
        }
      },

      fetchMe: async () => {
        const { data } = await api.get<User>("/users/me");
        set({ user: data });
      },

      logout: () => {
        // Fire-and-forget logout call
        api.post("/auth/logout").catch(() => {});
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
        });
      },

      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: "karavantrack-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);
