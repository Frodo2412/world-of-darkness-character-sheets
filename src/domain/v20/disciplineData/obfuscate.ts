import type { DisciplineEntry } from '../disciplines';
import { NO_COST, NO_ROLL } from './phrases';

export const OBFUSCATE: DisciplineEntry = {
  name: 'Obfuscate',
  powers: [
    {
      name: 'Cloak of Shadows',
      note: NO_ROLL,
      cost: NO_COST,
      duration: 'While the vampire stays silent, still and under some cover',
      prerequisite: 'Obfuscate 1',
      summary: 'The vampire hides in nearby shadows and cover, unnoticed so long as he stays silent and still.',
      page: 184,
    },
    {
      name: 'Unseen Presence',
      note: NO_ROLL,
      cost: NO_COST,
      prerequisite: 'Obfuscate 2',
      difficulty: 'Only when he draws attention to himself: Wits + Stealth, difficulty set by the situation',
      summary: 'With experience, the vampire can move around without being seen.',
      page: 185,
    },
    {
      name: 'Mask of a Thousand Faces',
      roll: ['manipulation', 'performance'],
      cost: "None, or blood points equal to how much the mask's Appearance exceeds the vampire's",
      prerequisite: 'Obfuscate 3',
      difficulty: '7',
      summary: 'The vampire can influence the perception of others, causing them to see a face different from his.',
      page: 185,
    },
    {
      name: "Vanish from the Mind's Eye",
      roll: ['charisma', 'stealth'],
      cost: NO_COST,
      prerequisite: 'Obfuscate 4',
      difficulty: "Target's Wits + Alertness (the highest in a group)",
      summary: 'This potent expression of Obfuscate enables the vampire to disappear from plain view.',
      page: 186,
    },
    {
      name: 'Cloak the Gathering',
      note: NO_ROLL,
      cost: NO_COST,
      prerequisite: 'Obfuscate 5',
      summary: 'The vampire extends his concealing abilities to cover an area, using any Obfuscate power on those nearby.',
      page: 186,
    },
  ],
};
