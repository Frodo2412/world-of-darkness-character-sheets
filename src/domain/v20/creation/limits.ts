// What a build may not exceed: the generation's ceilings and the freebie budget.

import type { V20Build } from './build';
import { GENERATION_TABLE, STANDARD_FREEBIE_BUDGET, type GenerationRow } from './rules';

/** The generation row for the build's generation. Settings are validated before they are stored. */
export function limits(build: V20Build): GenerationRow {
  const row = GENERATION_TABLE.find((entry) => entry.generation === build.settings.baseGeneration);
  if (!row) throw new Error(`No generation ${build.settings.baseGeneration} in the table`);
  return row;
}

export function freebieBudget(build: V20Build): number {
  return STANDARD_FREEBIE_BUDGET + build.settings.extraFreebies;
}

/** Hard violations, as sentences naming what to lower. None can arise from settings alone. */
export function violations(_build: V20Build): string[] {
  return [];
}
