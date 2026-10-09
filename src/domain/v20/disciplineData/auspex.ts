import type { DisciplineEntry } from '../disciplines';
import { NO_ROLL } from './phrases';

export const AUSPEX: DisciplineEntry = {
  name: 'Auspex',
  powers: [
    { name: 'Heightened Senses', note: NO_ROLL },
    { name: 'Aura Perception', roll: ['perception', 'empathy'] },
    { name: "The Spirit's Touch", roll: ['perception', 'empathy'] },
    { name: 'Telepathy', roll: ['intelligence', 'subterfuge'] },
    { name: 'Psychic Projection', roll: ['perception', 'awareness'] },
  ],
};
