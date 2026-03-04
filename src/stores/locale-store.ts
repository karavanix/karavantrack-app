import { create } from "zustand";
import { persist } from "zustand/middleware";
import i18n from "@/i18n";

type Locale = "en" | "ru" | "uz";

interface LocaleStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => {
        i18n.changeLanguage(locale);
        set({ locale });
      },
    }),
    {
      name: "yoollive-locale",
    }
  )
);
