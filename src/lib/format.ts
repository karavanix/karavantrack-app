import type { TFunction } from "i18next";

/** "25 min", "2 h 10 min", "3 h" in the current language. */
export function formatDuration(minutes: number, t: TFunction): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return t("duration_minutes", { m });
  if (m === 0) return t("duration_hours", { h });
  return t("duration_hours_minutes", { h, m });
}

/** "34.7 km" under 100 km, "412 km" above, with the language's number format. */
export function formatDistance(meters: number, lang: string, t: TFunction): string {
  const km = meters / 1000;
  const value = new Intl.NumberFormat(lang, {
    maximumFractionDigits: km < 100 ? 1 : 0,
  }).format(km);
  return t("distance_km", { value });
}
