// How a note says when it was written: the clock for today, the date for any other day. Local time,
// built from the parts of the date so the words never depend on the browser's language.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const two = (n: number): string => String(n).padStart(2, '0');

/** "23:42". */
export function clockTime(at: number): string {
  const date = new Date(at);
  return `${two(date.getHours())}:${two(date.getMinutes())}`;
}

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "23:42" for a time today, "14 Mar" for one on another day. */
export function noteTime(at: number, now: number): string {
  const date = new Date(at);
  return sameDay(date, new Date(now)) ? clockTime(at) : `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** What autosave and "Save note" say: "All changes saved · 23:42". */
export function savedStatus(at: number): string {
  return `All changes saved · ${clockTime(at)}`;
}
