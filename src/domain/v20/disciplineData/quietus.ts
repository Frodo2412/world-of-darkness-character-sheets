import type { DisciplineEntry } from '../disciplines';
import { NO_ROLL } from './phrases';

export const QUIETUS: DisciplineEntry = {
  name: 'Quietus',
  powers: [
    { name: 'Silence of Death', note: NO_ROLL },
    { name: "Scorpion's Touch", note: 'Willpower' },
    { name: "Dagon's Call", note: 'Stamina' },
    { name: "Baal's Caress", note: NO_ROLL },
    { name: 'Taste of Death', roll: ['stamina', 'athletics'] },
  ],
};
