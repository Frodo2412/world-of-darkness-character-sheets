// The id of a trait row's label, shared by the rows the page is served with (TraitRow.astro) and the
// Discipline rows it draws (parts/ranked.ts), so a rating's aria-labelledby finds the same id in both.

/** Every character an id would not keep, as its code point between underscores, so no two names share an id. */
const escaped = (text: string): string => text.replace(/[^a-zA-Z0-9]/gu, (char) => `_${char.codePointAt(0)!.toString(16)}_`);

/**
 * `step` keeps ids unique when a trait appears on two steps; `ref` is a build trait ref ("discipline:Auspex").
 * The ref's first colon, which splits its kind from its name, reads as a hyphen; any other character that is not
 * a letter or digit is escaped (a hyphen included), so 'Dark Arts' and 'Dark-Arts' get different ids.
 */
export function traitLabelId(step: string, ref: string): string {
  const colon = ref.indexOf(':');
  const trait = colon < 0 ? escaped(ref) : `${escaped(ref.slice(0, colon))}-${escaped(ref.slice(colon + 1))}`;
  return `${step}-${trait}-label`;
}
