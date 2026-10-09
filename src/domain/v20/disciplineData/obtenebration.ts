import type { DisciplineEntry } from '../disciplines';
import { NO_ROLL } from './phrases';

export const OBTENEBRATION: DisciplineEntry = {
  name: 'Obtenebration',
  powers: [
    { name: 'Shadow Play', note: NO_ROLL },
    { name: 'Shroud of Night', roll: ['manipulation', 'occult'] },
    { name: 'Arms of the Abyss', roll: ['manipulation', 'occult'] },
    { name: 'Black Metamorphosis', note: 'Manipulation + Courage' },
    { name: 'Tenebrous Form', note: NO_ROLL },
  ],
};
