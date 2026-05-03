/**
 * Shared string utility helpers.
 * Pure functions — no component dependencies.
 */

/**
 * Truncates a string to `max` characters, appending "…" if truncated.
 */
export function truncate(str: string, max = 36): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}
