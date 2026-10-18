/**
 * Forgets the "kept at 0 or more" notes of one family. They are kept by position (`merits:2`), so once an
 * entry is removed or put back the positions shift and a note would sit beside a different entry.
 */
export function forgetHintsOf(hints: Map<string, string>, family: string): void {
  for (const key of hints.keys()) if (key.startsWith(`${family}:`)) hints.delete(key);
}
