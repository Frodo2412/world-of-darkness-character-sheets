// The one rule for "the same text": used wherever the library compares what the
// player typed (chronicles, clans, search, sorting).

/** The text without accent marks: "Éloïse" is "Eloise". */
export function withoutAccents(text: string): string {
  // Recompose after stripping marks so scripts such as Hangul are not left decomposed.
  return text.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
}

/** The text trimmed, lower-cased and without accents, ready to compare. */
export function folded(text: string): string {
  return withoutAccents(text.trim()).toLowerCase();
}
