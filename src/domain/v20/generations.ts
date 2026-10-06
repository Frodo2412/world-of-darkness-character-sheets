// The V20 generation table as data. It sits beside the base domain, not in the
// creation rules, so the sheet can read it without importing the creation subpackage.

/** What a generation fixes for a character: trait ceiling and blood. */
export interface GenerationRow {
  readonly generation: number;
  readonly maxTrait: number;
  readonly bloodPoolMax: number;
  readonly bloodPerTurn: number;
}

/** Ordered from the most potent generation (4th) to the least (13th). */
export const GENERATION_TABLE: readonly GenerationRow[] = [
  { generation: 4, maxTrait: 9, bloodPoolMax: 50, bloodPerTurn: 10 },
  { generation: 5, maxTrait: 8, bloodPoolMax: 40, bloodPerTurn: 8 },
  { generation: 6, maxTrait: 7, bloodPoolMax: 30, bloodPerTurn: 6 },
  { generation: 7, maxTrait: 6, bloodPoolMax: 20, bloodPerTurn: 4 },
  { generation: 8, maxTrait: 5, bloodPoolMax: 15, bloodPerTurn: 3 },
  { generation: 9, maxTrait: 5, bloodPoolMax: 14, bloodPerTurn: 2 },
  { generation: 10, maxTrait: 5, bloodPoolMax: 13, bloodPerTurn: 1 },
  { generation: 11, maxTrait: 5, bloodPoolMax: 12, bloodPerTurn: 1 },
  { generation: 12, maxTrait: 5, bloodPoolMax: 11, bloodPerTurn: 1 },
  { generation: 13, maxTrait: 5, bloodPoolMax: 10, bloodPerTurn: 1 },
];

/** The first whole number in what the player typed ("10", "10th", "3rd generation"), if any. */
export function generationNumber(text: string): number | undefined {
  const digits = text.match(/\d+/);
  return digits ? Number(digits[0]) : undefined;
}
