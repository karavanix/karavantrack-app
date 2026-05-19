import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";
import type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthTokens,
  VerifyEmailRequest,
  VerifyEmailResponse,
  TelegramSignInRequest,
  TelegramSignInResponse,
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
  verifyEmail: (req: VerifyEmailRequest) => Promise<void>;
  fetchMe: () => Promise<void>;
  telegramSignIn: (req: TelegramSignInRequest) => Promise<void>;
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
          // Register now just sends the OTP email — no tokens returned
          await api.post("/auth/register", req);
        } finally {
          set({ isLoading: false });
        }
      },

      verifyEmail: async (req) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post<VerifyEmailResponse>(
            "/auth/verify-email",
            req
          );
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

      telegramSignIn: async (req) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post<TelegramSignInResponse>("/auth/telegram/callback", req);
          set({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          });
          await get().fetchMe();
        } finally {
          set({ isLoading: false });
        }
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
      name: "yoollive-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);
