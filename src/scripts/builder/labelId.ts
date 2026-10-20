// The id of a trait row's label, shared by the rows the page is served with (TraitRow.astro) and the
// Discipline rows it draws (parts/ranked.ts), so a rating's aria-labelledby finds the same id in both.

/** `step` keeps ids unique when a trait appears on two steps; `ref` is a build trait ref ("discipline:Auspex"). */
export const traitLabelId = (step: string, ref: string): string => `${step}-${ref.replace(/[^a-zA-Z0-9]/g, '-')}-label`;
