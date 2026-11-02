import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";
import { track } from "@/lib/analytics";
import { clearAttribution, currentAttribution } from "@/lib/attribution";
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
          track("login", { method: "email" });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (req) => {
        set({ isLoading: true });
        try {
          // Register now just sends the OTP email — no tokens returned.
          // `attribution` is where the visitor came from (utm marks of the landing); absent → the
          // server records `direct`.
          await api.post("/auth/register", { ...req, attribution: currentAttribution() });
          track("sign_up_start");
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
          clearAttribution();
          track("sign_up", { method: "email" });
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
          const { data } = await api.post<TelegramSignInResponse>("/auth/telegram/callback", {
            ...req,
            attribution: currentAttribution(),
          });
          set({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          });
          await get().fetchMe();
          if (data.is_new_user) {
            clearAttribution();
            track("sign_up", { method: "telegram" });
          } else {
            track("login", { method: "telegram" });
          }
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
