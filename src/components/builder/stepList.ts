import type { BuildStep } from '../../domain/v20/creation/progress';

/** The builder's steps in order, with the title each is shown under. */
export const STEP_LIST: readonly { step: BuildStep; title: string }[] = [
  { step: 'settings', title: 'Settings' },
  { step: 'concept', title: 'Concept' },
  { step: 'attributes', title: 'Attributes' },
  { step: 'abilities', title: 'Abilities' },
  { step: 'advantages', title: 'Advantages' },
  { step: 'finishing', title: 'Finishing touches' },
];
