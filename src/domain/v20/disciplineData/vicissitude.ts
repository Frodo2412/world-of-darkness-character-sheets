import type { DisciplineEntry } from '../disciplines';
import { NO_ROLL } from './phrases';

export const VICISSITUDE: DisciplineEntry = {
  name: 'Vicissitude',
  powers: [
    { name: 'Malleable Visage', roll: ['intelligence', 'medicine'] },
    { name: 'Fleshcraft', roll: ['dexterity', 'medicine'] },
    { name: 'Bonecraft', roll: ['strength', 'medicine'] },
    { name: 'Horrid Form', note: NO_ROLL },
    { name: 'Bloodform', note: NO_ROLL },
  ],
};
