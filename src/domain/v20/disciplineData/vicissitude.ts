import type { DisciplineEntry } from '../disciplines';
import { NO_COST, NO_ROLL, ONE_BLOOD_POINT } from './phrases';

export const VICISSITUDE: DisciplineEntry = {
  name: 'Vicissitude',
  powers: [
    {
      name: 'Malleable Visage',
      roll: ['intelligence', 'medicine'],
      cost: '1 blood point for each body part changed',
      prerequisite: 'Vicissitude 1',
      difficulty: '6 (8 to duplicate another person or voice, 9 to increase Appearance)',
      summary: 'A vampire with this power may alter her own bodily parameters: height, build, voice, facial features, and skin tone, among other things.',
      page: 241,
    },
    {
      name: 'Fleshcraft',
      roll: ['dexterity', 'medicine'],
      cost: ONE_BLOOD_POINT,
      prerequisite: 'Vicissitude 2',
      difficulty: '5 for a crude yank-and-tuck, up to 9 for precise transformations',
      summary: 'The vampire performs drastic, grotesque alterations on the flesh of other creatures.',
      page: 241,
    },
    {
      name: 'Bonecraft',
      roll: ['strength', 'medicine'],
      cost: ONE_BLOOD_POINT,
      prerequisite: 'Vicissitude 3',
      difficulty: 'As Fleshcraft (5 to 9); 7 when used as an offensive weapon',
      summary: 'This terrible power allows a vampire to manipulate bone in the same manner that flesh is shaped.',
      page: 241,
    },
    {
      name: 'Horrid Form',
      note: NO_ROLL,
      cost: '2 blood points',
      prerequisite: 'Vicissitude 4',
      summary: 'Kindred use this power to become hideous and deadly monsters.',
      page: 242,
    },
    {
      name: 'Bloodform',
      note: NO_ROLL,
      cost: NO_COST,
      prerequisite: 'Vicissitude 5',
      summary: 'A vampire with this power can physically transform all or part of her body into sentient vitae.',
      page: 242,
    },
  ],
};
