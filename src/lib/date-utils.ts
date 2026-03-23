/**
 * Converts a local datetime string (e.g. from <input type="datetime-local">)
 * into a UTC ISO string to pass to the backend.
 * 
 * Example:
 * localToUtc("2026-03-23T22:43") -> "2026-03-23T17:43:00.000Z" (if in UTC+5)
 */
export function localToUtc(localDateTimeStr: string | null | undefined): string | undefined {
  if (!localDateTimeStr) return undefined;
  const date = new Date(localDateTimeStr);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

/**
 * Ensures a UTC timestamp string from the backend is parsed as UTC,
 * then returns a formatted local string using the user's browser timezone.
 * 
 * Appends 'Z' to the string if it does not already end with it, to ensure
 * reliable cross-browser parsing of UTC times.
 */
export function utcToLocalDisplay(
  utcDateStr: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!utcDateStr) return "—";
  
  const str = utcDateStr.endsWith("Z") ? utcDateStr : `${utcDateStr}Z`;
  const date = new Date(str);
  
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, options);
}

/**
 * Returns a standardized local date string (e.g., MM/DD/YYYY) from a UTC string.
 */
export function utcToLocalDateDisplay(utcDateStr: string | null | undefined): string {
  if (!utcDateStr) return "—";
  
  const str = utcDateStr.endsWith("Z") ? utcDateStr : `${utcDateStr}Z`;
  const date = new Date(str);
  
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

/**
 * Returns a standardized local time string (e.g., HH:MM:SS AM/PM) from a UTC string.
 */
export function utcToLocalTimeDisplay(utcDateStr: string | null | undefined): string {
  if (!utcDateStr) return "—";
  
  const str = utcDateStr.endsWith("Z") ? utcDateStr : `${utcDateStr}Z`;
  const date = new Date(str);
  
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString();
}
