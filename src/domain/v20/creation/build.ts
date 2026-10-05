// A character in the middle of creation. Imports nothing from the other
// creation files, so its defaults are declared here.

import { HEADER_FIELDS, type HeaderField } from '../traits';

/** The sheet's header fields the concept step fills as free text: all but Clan and Generation. */
export type ConceptField = Exclude<HeaderField, 'clan' | 'generation'>;

export const CONCEPT_FIELDS: readonly ConceptField[] = HEADER_FIELDS.map((field) => field.key).filter(
  (key): key is ConceptField => key !== 'clan' && key !== 'generation',
);

/** The Storyteller's house settings for a build. */
export interface BuildSettings {
  baseGeneration: number;
  extraFreebies: number;
}

export interface V20Build {
  id: string;
  system: 'v20';
  kind: 'build';
  schemaVersion: 1;
  settings: BuildSettings;
  concept: Record<ConceptField, string>;
  /** A clan name, or '' until one is chosen. */
  clan: string;
}

const DEFAULT_BASE_GENERATION = 13;
const DEFAULT_EXTRA_FREEBIES = 0;

export function blankBuild(id: string): V20Build {
  return {
    id,
    system: 'v20',
    kind: 'build',
    schemaVersion: 1,
    settings: {
      baseGeneration: DEFAULT_BASE_GENERATION,
      extraFreebies: DEFAULT_EXTRA_FREEBIES,
    },
    concept: Object.fromEntries(CONCEPT_FIELDS.map((field) => [field, ''])) as Record<
      ConceptField,
      string
    >,
    clan: '',
  };
}
