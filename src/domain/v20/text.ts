// The two rules for "the same text": `folded` for search and sorting, `caseFolded`
// for chronicles, clans and repeated names. Accents count in the second, not the first.

/** The text without accent marks: "Éloïse" is "Eloise". */
export function withoutAccents(text: string): string {
  // Recompose after stripping marks so scripts such as Hangul are not left decomposed.
  return text.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
}

/** The text trimmed, lower-cased and without accents, ready to search or sort by. */
export function folded(text: string): string {
  return withoutAccents(text.trim()).toLowerCase();
}

/**
 * The text trimmed and lower-cased, accents kept: "Élysée" and "Elysee" differ. It is composed first,
 * so one accented letter typed as a single character or as a letter and a mark is the same text.
 */
export function caseFolded(text: string): string {
  return text.normalize('NFC').trim().toLowerCase();
}

/** A true minus sign (U+2212), for a wound and a penalty. */
export const MINUS_SIGN = '−';
