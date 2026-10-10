import type { DisciplineEntry } from '../disciplines';
import { NO_COST, NO_ROLL, ONE_BLOOD_POINT } from './phrases';

export const SERPENTIS: DisciplineEntry = {
  name: 'Serpentis',
  powers: [
    {
      name: 'The Eyes of the Serpent',
      note: NO_ROLL,
      cost: NO_COST,
      duration: 'Until the character takes his eyes off his victim',
      prerequisite: 'Serpentis 1',
      difficulty: 'Mortals: no roll; vampires and other supernatural creatures: Willpower roll, difficulty 9',
      summary: 'This power grants the vampire the legendary hypnotic gaze of the serpent.',
      page: 209,
    },
    {
      name: 'The Tongue of the Asp',
      note: 'An attack · Strength aggravated damage',
      cost: NO_COST,
      prerequisite: 'Serpentis 2',
      difficulty: '6',
      summary: 'The vampire may lengthen her tongue at will, splitting it into a fork like that of a serpent.',
      page: 209,
    },
    {
      name: 'The Skin of the Adder',
      note: NO_ROLL,
      cost: '1 blood point and 1 Willpower point',
      prerequisite: 'Serpentis 3',
      summary: 'By calling upon her Blood, the vampire may transform her skin into a mottled, scaly hide.',
      page: 210,
    },
    {
      name: 'The Form of the Cobra',
      note: NO_ROLL,
      cost: ONE_BLOOD_POINT,
      duration: 'Until the next dawn, unless he desires to change back sooner',
      prerequisite: 'Serpentis 4',
      summary: 'The Cainite may change his form into that of a huge black cobra.',
      page: 210,
    },
    {
      name: 'The Heart of Darkness',
      note: NO_ROLL,
      cost: NO_COST,
      prerequisite: 'Serpentis 5',
      summary: 'A Kindred with mastery of Serpentis may pull her heart from her body.',
      page: 210,
    },
  ],
};
