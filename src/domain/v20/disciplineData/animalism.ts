import type { DisciplineEntry } from '../disciplines';

export const ANIMALISM: DisciplineEntry = {
  name: 'Animalism',
  powers: [
    { name: 'Feral Whispers', roll: ['manipulation', 'animalKen'] },
    { name: 'Beckoning', roll: ['charisma', 'survival'] },
    { name: 'Quell the Beast', roll: ['manipulation', 'intimidation'], note: 'or Manipulation + Empathy' },
    { name: 'Subsume the Spirit', roll: ['manipulation', 'animalKen'] },
    { name: 'Drawing Out the Beast', note: 'Manipulation + Self-Control/Instinct' },
  ],
};
