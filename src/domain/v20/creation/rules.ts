// The creation rules as data: names and numbers only. Functions that read
// them live in the other creation files, so this file has no behavior to test
// beyond its values.

import type { Range } from '../traits';

/** What a generation fixes for a character: trait ceiling and blood. */
export interface GenerationRow {
  readonly generation: number;
  readonly maxTrait: number;
  readonly bloodPoolMax: number;
  readonly bloodPerTurn: number;
}

/** Ordered from the most potent generation (4th) to the least (13th). */
export const GENERATION_TABLE: readonly GenerationRow[] = [
  { generation: 4, maxTrait: 9, bloodPoolMax: 50, bloodPerTurn: 10 },
  { generation: 5, maxTrait: 8, bloodPoolMax: 40, bloodPerTurn: 8 },
  { generation: 6, maxTrait: 7, bloodPoolMax: 30, bloodPerTurn: 6 },
  { generation: 7, maxTrait: 6, bloodPoolMax: 20, bloodPerTurn: 4 },
  { generation: 8, maxTrait: 5, bloodPoolMax: 15, bloodPerTurn: 3 },
  { generation: 9, maxTrait: 5, bloodPoolMax: 14, bloodPerTurn: 2 },
  { generation: 10, maxTrait: 5, bloodPoolMax: 13, bloodPerTurn: 1 },
  { generation: 11, maxTrait: 5, bloodPoolMax: 12, bloodPerTurn: 1 },
  { generation: 12, maxTrait: 5, bloodPoolMax: 11, bloodPerTurn: 1 },
  { generation: 13, maxTrait: 5, bloodPoolMax: 10, bloodPerTurn: 1 },
];

/** Freebie points every build has before the Storyteller's extra points. */
export const STANDARD_FREEBIE_BUDGET = 15;

/** The extra freebie points a Storyteller may grant. */
export const EXTRA_FREEBIES_RANGE: Range = { min: 0, max: 999 };

/** The thirteen clans with their three clan Disciplines, then Caitiff, who have none. */
export const CLANS = [
  { name: 'Assamite', disciplines: ['Celerity', 'Obfuscate', 'Quietus'] },
  { name: 'Brujah', disciplines: ['Celerity', 'Potence', 'Presence'] },
  { name: 'Follower of Set', disciplines: ['Obfuscate', 'Presence', 'Serpentis'] },
  { name: 'Gangrel', disciplines: ['Animalism', 'Fortitude', 'Protean'] },
  { name: 'Giovanni', disciplines: ['Dominate', 'Necromancy', 'Potence'] },
  { name: 'Lasombra', disciplines: ['Dominate', 'Obtenebration', 'Potence'] },
  { name: 'Malkavian', disciplines: ['Auspex', 'Dementation', 'Obfuscate'] },
  { name: 'Nosferatu', disciplines: ['Animalism', 'Obfuscate', 'Potence'] },
  { name: 'Ravnos', disciplines: ['Animalism', 'Chimerstry', 'Fortitude'] },
  { name: 'Toreador', disciplines: ['Auspex', 'Celerity', 'Presence'] },
  { name: 'Tremere', disciplines: ['Auspex', 'Dominate', 'Thaumaturgy'] },
  { name: 'Tzimisce', disciplines: ['Animalism', 'Auspex', 'Vicissitude'] },
  { name: 'Ventrue', disciplines: ['Dominate', 'Fortitude', 'Presence'] },
  { name: 'Caitiff', disciplines: [] },
] as const satisfies readonly { name: string; disciplines: readonly string[] }[];

export type ClanName = (typeof CLANS)[number]['name'];

export const CLAN_NAMES: readonly ClanName[] = CLANS.map((clan) => clan.name);

/** Suggestions for Nature and Demeanor; any other text is accepted too. */
export const ARCHETYPES = [
  'Architect',
  'Autocrat',
  'Bon Vivant',
  'Bravo',
  'Capitalist',
  'Caregiver',
  'Celebrant',
  'Chameleon',
  'Child',
  'Competitor',
  'Conformist',
  'Conniver',
  'Creep Show',
  'Curmudgeon',
  'Dabbler',
  'Deviant',
  'Director',
  'Enigma',
  'Eye of the Storm',
  'Fanatic',
  'Gallant',
  'Guru',
  'Idealist',
  'Judge',
  'Loner',
  'Martyr',
  'Masochist',
  'Monster',
  'Pedagogue',
  'Penitent',
  'Perfectionist',
  'Rebel',
  'Rogue',
  'Sadist',
  'Scientist',
  'Sociopath',
  'Soldier',
  'Survivor',
  'Thrill-Seeker',
  'Traditionalist',
  'Trickster',
  'Visionary',
] as const;
