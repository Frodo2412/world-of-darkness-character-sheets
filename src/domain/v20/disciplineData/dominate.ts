import type { DisciplineEntry } from '../disciplines';
import { NO_COST, ONE_WILLPOWER_POINT } from './phrases';

const TARGET_WILLPOWER = "Target's current Willpower points";

export const DOMINATE: DisciplineEntry = {
  name: 'Dominate',
  powers: [
    {
      name: 'Command',
      roll: ['manipulation', 'intimidation'],
      cost: NO_COST,
      prerequisite: 'Dominate 1',
      difficulty: TARGET_WILLPOWER,
      summary: 'The vampire locks eyes with the subject and speaks a one-word command that the subject must obey instantly.',
      page: 152,
    },
    {
      name: 'Mesmerize',
      roll: ['manipulation', 'leadership'],
      cost: NO_COST,
      prerequisite: 'Dominate 2',
      difficulty: TARGET_WILLPOWER,
      summary: "With this power, a vampire can verbally implant a false thought or hypnotic suggestion in the subject's subconscious mind.",
      page: 152,
    },
    {
      name: 'The Forgetful Mind',
      roll: ['wits', 'subterfuge'],
      cost: NO_COST,
      prerequisite: 'Dominate 3',
      difficulty: TARGET_WILLPOWER,
      summary: "After capturing the subject's gaze, the vampire delves into the subject's memories, stealing or re-creating them at his whim.",
      page: 153,
    },
    {
      name: 'Conditioning',
      roll: ['charisma', 'leadership'],
      cost: NO_COST,
      prerequisite: 'Dominate 4',
      difficulty: TARGET_WILLPOWER,
      summary: "Through sustained manipulation, the vampire can make a subject more pliant to the Kindred's will.",
      page: 154,
    },
    {
      name: 'Possession',
      roll: ['charisma', 'intimidation'],
      cost: ONE_WILLPOWER_POINT,
      prerequisite: 'Dominate 5',
      difficulty: '7',
      summary: "The force of the Kindred's psyche is such that it can utterly supplant the mind of a mortal subject.",
      page: 155,
    },
  ],
};
