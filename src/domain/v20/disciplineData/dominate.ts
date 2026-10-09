import type { DisciplineEntry } from '../disciplines';

export const DOMINATE: DisciplineEntry = {
  name: 'Dominate',
  powers: [
    { name: 'Command', roll: ['manipulation', 'intimidation'] },
    { name: 'Mesmerize', roll: ['manipulation', 'leadership'] },
    { name: 'The Forgetful Mind', roll: ['wits', 'subterfuge'] },
    { name: 'Conditioning', roll: ['charisma', 'leadership'] },
    { name: 'Possession', roll: ['charisma', 'intimidation'] },
  ],
};
