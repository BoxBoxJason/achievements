/**
 * Formatting helpers shared by the webview components
 *
 * @module format
 * @author BoxBoxJason
 */

/**
 * Formats an achievement unlock date for display
 *
 * Accepts both ISO-8601 ("YYYY-MM-DDTHH:MM:SS.sssZ") and SQLite's
 * CURRENT_TIMESTAMP ("YYYY-MM-DD HH:MM:SS") formats.
 *
 * @param {string | Date} dateValue - The date to format
 * @returns {string} - "YYYY-MM-DD @HH:MM:SS"
 */
export function formatUnlockDate(dateValue: string | Date): string {
  const dateString =
    typeof dateValue === "string" ? dateValue : dateValue.toISOString();
  const [date, time] = dateString.split(/[T ]/);
  if (!date) {
    return dateString;
  }
  if (!time) {
    return date;
  }
  return `${date} @${time.split(".")[0]}`;
}
