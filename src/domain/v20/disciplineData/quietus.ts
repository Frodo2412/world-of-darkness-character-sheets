import type { DisciplineEntry } from '../disciplines';
import { NO_ROLL, ONE_BLOOD_POINT, ONE_WILLPOWER_POINT } from './phrases';

export const QUIETUS: DisciplineEntry = {
  name: 'Quietus',
  powers: [
    {
      name: 'Silence of Death',
      note: NO_ROLL,
      cost: ONE_BLOOD_POINT,
      duration: 'One hour',
      prerequisite: 'Quietus 1',
      summary: 'Silence of Death imbues the vampire with a mystical silence that radiates from her body, muting all noise within a certain vicinity.',
      page: 203,
    },
    {
      name: "Scorpion's Touch",
      note: 'Willpower',
      cost: 'At least 1 blood point',
      duration: 'By successes: one turn to permanent',
      prerequisite: 'Quietus 2',
      difficulty: '6',
      summary: 'By changing the properties of her blood, a vampire may create powerful venom that strips her prey of his resilience.',
      page: 203,
    },
    {
      name: "Dagon's Call",
      note: 'Stamina',
      cost: ONE_WILLPOWER_POINT,
      prerequisite: 'Quietus 3',
      difficulty: "Opponent's permanent Willpower rating",
      summary: 'This terrible power allows a vampire to drown her target in his own blood.',
      page: 204,
    },
    {
      name: "Baal's Caress",
      note: NO_ROLL,
      cost: '1 blood point per hit',
      prerequisite: 'Quietus 4',
      summary: "Baal's Caress allows the Kindred to transmute her blood into a virulent ichor that destroys any living or undead flesh it touches.",
      page: 204,
    },
    {
      name: 'Taste of Death',
      roll: ['stamina', 'athletics'],
      cost: 'Blood points spat at the target, two dice of aggravated damage each',
      prerequisite: 'Quietus 5',
      difficulty: '6',
      summary: 'Taste of Death allows the Cainite to spit caustic blood at her target.',
      page: 205,
    },
  ],
};
