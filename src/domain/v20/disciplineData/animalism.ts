import type { DisciplineEntry } from '../disciplines';
import { NO_COST } from './phrases';

export const ANIMALISM: DisciplineEntry = {
  name: 'Animalism',
  powers: [
    {
      name: 'Feral Whispers',
      roll: ['manipulation', 'animalKen'],
      cost: NO_COST,
      prerequisite: 'Animalism 1',
      difficulty: '6 for predatory mammals, 7 for other mammals and predatory birds, 8 for other birds and reptiles',
      summary: 'The vampire creates an empathic connection with a beast, thereby allowing him to communicate or issue simple commands.',
      page: 129,
    },
    {
      name: 'Beckoning',
      roll: ['charisma', 'survival'],
      cost: NO_COST,
      prerequisite: 'Animalism 2',
      difficulty: '6',
      summary: 'The vampire calls out in the voice of one type of animal, mystically summoning those within earshot.',
      page: 130,
    },
    {
      name: 'Quell the Beast',
      roll: ['manipulation', 'intimidation'],
      note: 'or Manipulation + Empathy',
      cost: NO_COST,
      prerequisite: 'Animalism 3',
      difficulty: '7',
      summary: 'A vampire who develops this power may assert his will over a mortal (animal or human) subject, subduing the Beast within her.',
      page: 130,
    },
    {
      name: 'Subsume the Spirit',
      roll: ['manipulation', 'animalKen'],
      cost: NO_COST,
      duration: "Until the Kindred's consciousness returns",
      prerequisite: 'Animalism 4',
      difficulty: '8',
      summary: 'By locking his gaze with that of an animal, the vampire may mentally possess the creature.',
      page: 131,
    },
    {
      name: 'Drawing Out the Beast',
      note: 'Manipulation + Self-Control/Instinct',
      cost: NO_COST,
      prerequisite: 'Animalism 5',
      difficulty: '8',
      summary: 'The vampire releases his Beast upon another mortal or vampire, who is instantly overcome by frenzy.',
      page: 132,
    },
  ],
};
