import type { DisciplineEntry } from '../disciplines';
import { NO_COST, NO_ROLL, ONE_BLOOD_POINT, ONE_SCENE, ONE_WILLPOWER_POINT } from './phrases';

export const PRESENCE: DisciplineEntry = {
  name: 'Presence',
  powers: [
    {
      name: 'Awe',
      roll: ['charisma', 'performance'],
      cost: ONE_BLOOD_POINT,
      duration: 'Remainder of the scene or until the character chooses to drop it',
      prerequisite: 'Presence 1',
      difficulty: '7',
      summary: 'Those near the vampire suddenly desire to be closer to her and become receptive to her point of view.',
      page: 193,
    },
    {
      name: 'Dread Gaze',
      roll: ['charisma', 'intimidation'],
      cost: NO_COST,
      prerequisite: 'Presence 2',
      difficulty: "Victim's Wits + Courage",
      summary: 'Dread Gaze engenders unbearable terror in its victim, stupefying him into madness, immobility, or reckless flight.',
      page: 194,
    },
    {
      name: 'Entrancement',
      roll: ['appearance', 'empathy'],
      cost: ONE_BLOOD_POINT,
      duration: 'By successes: one hour to one year',
      prerequisite: 'Presence 3',
      difficulty: "Target's current Willpower points",
      summary: "This power bends others' emotions, making them the vampire's willing servants.",
      page: 195,
    },
    {
      name: 'Summon',
      roll: ['charisma', 'subterfuge'],
      cost: ONE_BLOOD_POINT,
      duration: 'Until dawn',
      prerequisite: 'Presence 4',
      difficulty: '5 base; 7 if met only briefly; 4 after an earlier success; 8 after an earlier failure',
      summary: 'This impressive power enables the vampire to call to herself any person whom she has ever met.',
      page: 195,
    },
    {
      name: 'Majesty',
      note: NO_ROLL,
      cost: ONE_WILLPOWER_POINT,
      duration: ONE_SCENE,
      prerequisite: 'Presence 5',
      difficulty: "Subject's Courage roll, difficulty Charisma + Intimidation (maximum 10)",
      summary: 'Majesty inspires universal respect, devotion, fear — or all those emotions at once — in those around the vampire.',
      page: 196,
    },
  ],
};
