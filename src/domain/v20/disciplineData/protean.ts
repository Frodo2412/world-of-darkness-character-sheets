import type { DisciplineEntry } from '../disciplines';
import { NO_COST, NO_ROLL, ONE_BLOOD_POINT, ONE_SCENE } from './phrases';

export const PROTEAN: DisciplineEntry = {
  name: 'Protean',
  powers: [
    {
      name: 'Eyes of the Beast',
      note: NO_ROLL,
      cost: NO_COST,
      prerequisite: 'Protean 1',
      summary: 'The vampire sees perfectly well in pitch darkness, not requiring a light source to notice details in even the darkest basement or cave.',
      page: 199,
    },
    {
      name: 'Feral Claws',
      note: NO_ROLL,
      cost: ONE_BLOOD_POINT,
      duration: ONE_SCENE,
      prerequisite: 'Protean 2',
      summary: "The vampire's nails transform into long, bestial claws.",
      page: 199,
    },
    {
      name: 'Earth Meld',
      note: NO_ROLL,
      cost: ONE_BLOOD_POINT,
      prerequisite: 'Protean 3',
      summary: 'Earth Meld enables the vampire to become one with the earth.',
      page: 199,
    },
    {
      name: 'Shape of the Beast',
      note: NO_ROLL,
      cost: ONE_BLOOD_POINT,
      duration: 'Until the next dawn, unless he wishes to change back sooner',
      prerequisite: 'Protean 4',
      summary: 'This endows the vampire with the legendary ability to transform into a wolf or bat.',
      page: 200,
    },
    {
      name: 'Mist Form',
      note: NO_ROLL,
      cost: ONE_BLOOD_POINT,
      prerequisite: 'Protean 5',
      summary: 'This truly unsettling power enables the vampire to turn into mist.',
      page: 200,
    },
  ],
};
