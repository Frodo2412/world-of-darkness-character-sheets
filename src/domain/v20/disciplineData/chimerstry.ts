import type { DisciplineEntry } from '../disciplines';
import { NO_ROLL } from './phrases';

export const CHIMERSTRY: DisciplineEntry = {
  name: 'Chimerstry',
  powers: [
    { name: 'Ignis Fatuus', note: NO_ROLL },
    { name: 'Fata Morgana', note: NO_ROLL },
    { name: 'Apparition', note: NO_ROLL },
    { name: 'Permanency', note: NO_ROLL },
    { name: 'Horrid Reality', roll: ['manipulation', 'subterfuge'] },
  ],
};
