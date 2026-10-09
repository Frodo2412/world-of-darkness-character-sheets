import type { DisciplineEntry } from '../disciplines';
import { NO_COST, ONE_BLOOD_POINT, ONE_SCENE } from './phrases';

export const DEMENTATION: DisciplineEntry = {
  name: 'Dementation',
  powers: [
    {
      name: 'Passion',
      roll: ['charisma', 'empathy'],
      cost: NO_COST,
      duration: 'By successes: one turn to three months',
      prerequisite: 'Dementation 1',
      difficulty: "Victim's Humanity or Path rating",
      summary: "The vampire stirs his victim's emotions, either heightening them to a fevered pitch or blunting them until the target is completely desensitized.",
      page: 148,
    },
    {
      name: 'The Haunting',
      roll: ['manipulation', 'subterfuge'],
      cost: ONE_BLOOD_POINT,
      duration: 'By successes: one night to one year',
      prerequisite: 'Dementation 2',
      difficulty: "Victim's Perception + Self-Control/Instinct",
      summary: "The vampire manipulates the sensory centers of his victim's brain, flooding the victim's senses with visions, sounds, scents, or feelings that aren't really there.",
      page: 148,
    },
    {
      name: 'Eyes of Chaos',
      roll: ['perception', 'occult'],
      cost: NO_COST,
      prerequisite: 'Dementation 3',
      difficulty: "Set by the pattern's intricacy: 9 for a stranger's Nature, 8 for a casual acquaintance, 6 for an established ally",
      summary: 'This peculiar power allows the vampire to take advantage of the fleeting clarity hidden in insanity.',
      page: 148,
    },
    {
      name: 'Voice of Madness',
      roll: ['manipulation', 'empathy'],
      cost: ONE_BLOOD_POINT,
      duration: ONE_SCENE,
      prerequisite: 'Dementation 4',
      difficulty: '7',
      summary: 'By merely addressing his victims aloud, the Kindred can drive targets into fits of blind rage or fear, forcing them to abandon reason and higher thought.',
      page: 149,
    },
    {
      name: 'Total Insanity',
      roll: ['manipulation', 'intimidation'],
      cost: ONE_BLOOD_POINT,
      duration: 'By successes: one turn to one year',
      prerequisite: 'Dementation 5',
      difficulty: "Victim's current Willpower points",
      summary: "The vampire coaxes the madness from the deepest recesses of her target's mind, focusing it into an overwhelming wave of insanity.",
      page: 149,
    },
  ],
};
