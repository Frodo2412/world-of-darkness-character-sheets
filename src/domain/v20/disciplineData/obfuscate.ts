import type { DisciplineEntry } from '../disciplines';
import { NO_ROLL } from './phrases';

export const OBFUSCATE: DisciplineEntry = {
  name: 'Obfuscate',
  powers: [
    { name: 'Cloak of Shadows', note: NO_ROLL },
    { name: 'Unseen Presence', note: NO_ROLL },
    { name: 'Mask of a Thousand Faces', roll: ['manipulation', 'performance'] },
    { name: "Vanish from the Mind's Eye", roll: ['charisma', 'stealth'] },
    { name: 'Cloak the Gathering', note: NO_ROLL },
  ],
};
