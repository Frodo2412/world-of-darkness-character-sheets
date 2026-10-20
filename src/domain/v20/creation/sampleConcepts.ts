// The sample concepts the Character concept screen offers as prompts. The names are rules data
// (CONCEPT_KINDS); the one-line descriptions here are original, written for this builder.

import { CONCEPT_KINDS, type ConceptKind } from './rules';

export interface SampleConcept {
  name: ConceptKind;
  /** A short original line for the screen to show beneath the chips once this one is chosen. */
  line: string;
}

// A Record, so a concept added to CONCEPT_KINDS cannot be left without its line.
const LINES: Record<ConceptKind, string> = {
  Criminal: 'Works outside the law, for profit or for survival.',
  Drifter: 'Never stays anywhere long enough to be missed.',
  Entertainer: 'Lives for the stage, the crowd and the applause.',
  Intellectual: 'Pursues knowledge, theory and the long argument.',
  Investigator: 'Follows evidence until a hidden truth gives way.',
  Kid: 'Young, overlooked and underestimated by the adults around.',
  Outsider: 'Belongs to no circle and sees every circle clearly.',
  Politician: 'Trades favours, secrets and promises for influence.',
  Professional: 'Skilled, steady and established in a respectable trade.',
  Reporter: 'Chases stories buried by the powerful.',
  Scenester: 'Knows every club, scene and rumour worth knowing.',
  Socialite: 'Moves through wealth, parties and polite rivalries.',
  Soldier: 'Trained to obey, endure and fight when ordered.',
  Worker: 'Earns a living with hands, hours and stubborn pride.',
};

/** The sample concepts in the order the screen offers them. */
export const SAMPLE_CONCEPTS: readonly SampleConcept[] = CONCEPT_KINDS.map((name) => ({ name, line: LINES[name] }));

/** The line for a sample concept by name; undefined for no sample concept or a name that is not one. */
export function sampleConceptLine(kind: string): string | undefined {
  return SAMPLE_CONCEPTS.find((sample) => sample.name === kind)?.line;
}
