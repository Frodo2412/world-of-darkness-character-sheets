import type { DisciplineEntry } from '../disciplines';
import { NO_ROLL } from './phrases';

export const PRESENCE: DisciplineEntry = {
  name: 'Presence',
  powers: [
    { name: 'Awe', roll: ['charisma', 'performance'] },
    { name: 'Dread Gaze', roll: ['charisma', 'intimidation'] },
    { name: 'Entrancement', roll: ['appearance', 'empathy'] },
    { name: 'Summon', roll: ['charisma', 'subterfuge'] },
    { name: 'Majesty', note: NO_ROLL },
  ],
};
