import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import ru from "./locales/ru";
import uz from "./locales/uz";

export const LOCALES = ["ru", "uz", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Zustand persist key of `locale-store`; the value is `{ state: { locale }, version }`. */
const STORAGE_KEY = "yoollive-locale";

export const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale);

/** The language chosen in this browser: the switcher's saved value or a `?lang=` of a visit. */
export function savedLocale(): Locale | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isLocale(parsed?.state?.locale) ? parsed.state.locale : null;
  } catch {
    return null;
  }
}

/** Remembers the choice in the store's own format, so `locale-store` hydrates with it. */
export function persistLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { locale }, version: 0 }));
  } catch {
    // Private mode or storage disabled: the choice lives for this page only.
  }
}

/** The browser's first language that we have, e.g. `uz-UZ` → `uz`. */
export function browserLocale(): Locale | null {
  const langs = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const l of langs) {
    const code = (l || "").toLowerCase().split("-")[0];
    if (isLocale(code)) return code;
  }
  return null;
}

/**
 * The language to open with: `?lang=` (the landing passes its language — and it is remembered as
 * a choice) → the choice saved in this browser → the browser's language, if it is one of ours →
 * Russian, the language of most of our users.
 */
export function resolveInitialLocale(search = typeof location === "undefined" ? "" : location.search): Locale {
  const fromUrl = new URLSearchParams(search).get("lang");
  if (isLocale(fromUrl)) {
    persistLocale(fromUrl);
    return fromUrl;
  }
  return savedLocale() ?? browserLocale() ?? "ru";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    uz: { translation: uz },
  },
  lng: resolveInitialLocale(),
  // Keys missing from a locale fall back to English, the most complete file.
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

const setHtmlLang = (lng: string) => {
  if (typeof document !== "undefined") document.documentElement.lang = lng;
};
setHtmlLang(i18n.language);
i18n.on("languageChanged", setHtmlLang);

export default i18n;
