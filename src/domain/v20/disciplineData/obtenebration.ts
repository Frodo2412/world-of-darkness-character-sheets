import type { DisciplineEntry } from '../disciplines';
import { NO_ROLL, ONE_BLOOD_POINT, ONE_SCENE } from './phrases';

export const OBTENEBRATION: DisciplineEntry = {
  name: 'Obtenebration',
  powers: [
    {
      name: 'Shadow Play',
      note: NO_ROLL,
      cost: ONE_BLOOD_POINT,
      duration: ONE_SCENE,
      prerequisite: 'Obtenebration 1',
      summary: 'This power grants the vampire limited control over shadows and other ambient darkness.',
      page: 188,
    },
    {
      name: 'Shroud of Night',
      roll: ['manipulation', 'occult'],
      cost: "None, or 1 blood point to create it outside the vampire's line of sight",
      prerequisite: 'Obtenebration 2',
      difficulty: "7 (9 outside the vampire's line of sight)",
      summary: 'The vampire can create a cloud of inky blackness.',
      page: 189,
    },
    {
      name: 'Arms of the Abyss',
      roll: ['manipulation', 'occult'],
      cost: ONE_BLOOD_POINT,
      prerequisite: 'Obtenebration 3',
      difficulty: '7',
      summary: 'The Kindred can create prehensile tentacles that emerge from patches of dim lighting.',
      page: 189,
    },
    {
      name: 'Black Metamorphosis',
      note: 'Manipulation + Courage',
      cost: '2 blood points',
      prerequisite: 'Obtenebration 4',
      difficulty: '7',
      summary: 'The Cainite calls upon his inner darkness and infuses himself with it, becoming a monstrous hybrid of matter and shadow.',
      page: 189,
    },
    {
      name: 'Tenebrous Form',
      note: NO_ROLL,
      cost: '3 blood points',
      prerequisite: 'Obtenebration 5',
      summary: 'The vampire physically becomes darkness, an inky, amoeboid patch of shadow.',
      page: 190,
    },
  ],
};
