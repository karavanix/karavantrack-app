import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import ru from "./locales/ru";
import uz from "./locales/uz";

const savedLocale = (() => {
  try {
    const raw = localStorage.getItem("yoollive-locale");
    if (!raw) return "en";
    const parsed = JSON.parse(raw);
    // Zustand persist wraps the state: { state: { locale: "ru" }, version: 0 }
    return parsed?.state?.locale ?? "en";
  } catch {
    return "en";
  }
})();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    uz: { translation: uz },
  },
  lng: savedLocale,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
