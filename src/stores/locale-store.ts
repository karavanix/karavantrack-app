import { create } from "zustand";
import { persist } from "zustand/middleware";
import i18n, { isLocale, savedLocale, type Locale } from "@/i18n";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types";

export type { Locale };

interface LocaleStore {
  locale: Locale;
  /** The person picked a language in the switcher: the interface, the saved choice and the account follow. */
  setLocale: (locale: Locale) => void;
  /**
   * Once after sign-in (and when the profile is refetched): the account's language and the
   * interface's may differ. A language chosen in this browser (the switcher or `?lang=` from the
   * landing) is the stronger signal and is written to the account; without such a choice the
   * interface takes the account's language — a person signing in on a new device sees what they
   * chose before.
   */
  syncWithUser: (user: Pick<User, "language">) => void;
}

/** The language last written to the account in this session: the profile is refetched right after sign-in, before the write lands. */
let pushed: Locale | null = null;

/** Writes the language to the account; silent, the interface is already switched. */
function saveAccountLanguage(language: Locale) {
  if (!useAuthStore.getState().accessToken || pushed === language) return;
  pushed = language;
  api.put("/users/me", { language }).catch(() => {
    pushed = null;
  });
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set, get) => ({
      locale: isLocale(i18n.language) ? i18n.language : "ru",
      setLocale: (locale) => {
        i18n.changeLanguage(locale);
        set({ locale });
        if (useAuthStore.getState().user?.language !== locale) saveAccountLanguage(locale);
      },
      syncWithUser: (user) => {
        const current = get().locale;
        if (!isLocale(user.language) || user.language === current) return;
        if (savedLocale()) {
          saveAccountLanguage(current);
        } else {
          i18n.changeLanguage(user.language);
          set({ locale: user.language });
        }
      },
    }),
    {
      name: "yoollive-locale",
    }
  )
);
