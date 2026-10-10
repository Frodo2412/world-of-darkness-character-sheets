import type { DisciplineEntry } from '../disciplines';
import { NO_ROLL, ONE_BLOOD_POINT, ONE_SCENE, ONE_WILLPOWER_POINT } from './phrases';

export const CHIMERSTRY: DisciplineEntry = {
  name: 'Chimerstry',
  powers: [
    {
      name: 'Ignis Fatuus',
      note: NO_ROLL,
      cost: ONE_WILLPOWER_POINT,
      duration: 'Until the vampire leaves its vicinity or another person sees through it',
      prerequisite: 'Chimerstry 1',
      summary: 'The vampire may conjure a minor, static mirage that confounds one sense.',
      page: 144,
    },
    {
      name: 'Fata Morgana',
      note: NO_ROLL,
      cost: '1 Willpower point and 1 blood point',
      duration: 'Until dispelled',
      prerequisite: 'Chimerstry 2',
      summary: 'The Cainite can now create illusions that appeal to all the senses, though they remain static.',
      page: 144,
    },
    {
      name: 'Apparition',
      note: NO_ROLL,
      cost: ONE_BLOOD_POINT,
      prerequisite: 'Chimerstry 3',
      summary: 'Apparition allows a vampire to give motion to an illusion created with Ignis Fatuus or Fata Morgana.',
      page: 144,
    },
    {
      name: 'Permanency',
      note: NO_ROLL,
      cost: ONE_BLOOD_POINT,
      duration: 'Until dissolved',
      prerequisite: 'Chimerstry 4',
      summary: 'Permanency allows a mirage to persist even when the vampire cannot see it.',
      page: 145,
    },
    {
      name: 'Horrid Reality',
      roll: ['manipulation', 'subterfuge'],
      cost: '2 Willpower points',
      duration: ONE_SCENE,
      prerequisite: 'Chimerstry 5',
      difficulty: "Victim's Perception + Self-Control/Instinct",
      summary: "Rather than create simple illusions, the vampire can now project hallucinations directly into a victim's mind.",
      page: 145,
    },
  ],
};
