import type { DisciplineEntry } from '../disciplines';
import { NO_COST, NO_ROLL } from './phrases';

export const AUSPEX: DisciplineEntry = {
  name: 'Auspex',
  powers: [
    {
      name: 'Heightened Senses',
      note: NO_ROLL,
      cost: NO_COST,
      prerequisite: 'Auspex 1',
      summary: "This power increases the acuity of all of the vampire's senses, effectively doubling the clarity and range of sight, hearing, and smell.",
      page: 134,
    },
    {
      name: 'Aura Perception',
      roll: ['perception', 'empathy'],
      cost: NO_COST,
      prerequisite: 'Auspex 2',
      difficulty: '8',
      summary: 'Using this power, the vampire can perceive the psychic “auras” that radiate from mortals and supernatural beings alike.',
      page: 135,
    },
    {
      name: "The Spirit's Touch",
      roll: ['perception', 'empathy'],
      cost: NO_COST,
      prerequisite: 'Auspex 3',
      difficulty: 'Set by the age of the impressions and the strength of the person or event that left them',
      summary: 'The vampire can “read” the psychic impressions people leave on objects they have handled.',
      page: 136,
    },
    {
      name: 'Telepathy',
      roll: ['intelligence', 'subterfuge'],
      cost: 'None for mortals; 1 Willpower point to read vampires and other supernatural creatures',
      prerequisite: 'Auspex 4',
      difficulty: "Subject's current Willpower points",
      summary: "The vampire projects her consciousness into a nearby mortal's mind to communicate wordlessly or read the target's thoughts.",
      page: 137,
    },
    {
      name: 'Psychic Projection',
      roll: ['perception', 'awareness'],
      cost: '1 Willpower point, and 1 more for each further scene',
      prerequisite: 'Auspex 5',
      difficulty: '5 within sight, 7 nearby or to a familiar location, 9 far from familiar territory',
      summary: 'The Kindred projects her senses out of her physical shell, stepping from her body as an entity of pure thought.',
      page: 138,
    },
  ],
};
