import type { DisciplineEntry } from '../disciplines';
import { ANIMALISM } from './animalism';
import { AUSPEX } from './auspex';
import { CELERITY } from './celerity';
import { CHIMERSTRY } from './chimerstry';
import { DEMENTATION } from './dementation';
import { DOMINATE } from './dominate';
import { FORTITUDE } from './fortitude';
import { NECROMANCY } from './necromancy';
import { OBFUSCATE } from './obfuscate';
import { OBTENEBRATION } from './obtenebration';
import { POTENCE } from './potence';
import { PRESENCE } from './presence';
import { PROTEAN } from './protean';
import { QUIETUS } from './quietus';
import { SERPENTIS } from './serpentis';
import { THAUMATURGY } from './thaumaturgy';
import { VICISSITUDE } from './vicissitude';

/** The Disciplines of the thirteen clans. Thaumaturgy and Necromancy are learned by path, so they list no powers. */
export const DISCIPLINE_CATALOGUE: readonly DisciplineEntry[] = [
  ANIMALISM,
  AUSPEX,
  CELERITY,
  CHIMERSTRY,
  DEMENTATION,
  DOMINATE,
  FORTITUDE,
  NECROMANCY,
  OBFUSCATE,
  OBTENEBRATION,
  POTENCE,
  PRESENCE,
  PROTEAN,
  QUIETUS,
  SERPENTIS,
  THAUMATURGY,
  VICISSITUDE,
];
