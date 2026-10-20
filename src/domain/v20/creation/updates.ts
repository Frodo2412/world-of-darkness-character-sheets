// Every change to a build. Each returns an UpdateResult and never mutates its
// input: a refusal hands back the same build, an applied change a new one.

import type { Range } from '../traits';
import { allotmentStateFor, allotmentStates, rankedGroupOf, type AllotmentState } from './allotments';
import type {
  BuildSettings,
  BuildTraitRef,
  ConceptField,
  DisciplineEntry,
  Dots,
  FixedTraitRef,
  V20Build,
} from './build';
import { freebieCost, freebiesRemaining } from './freebies';
import { plural, titleCase } from './wording';
import {
  GENERATION_REF,
  PAST_BEST_GENERATION,
  bloodPoolRangeMessage,
  creationMaximum,
  effectiveGeneration,
  generationBackgroundTop,
  limits,
  maximumFor,
  ordinal,
} from './limits';
import {
  catalogueDiscipline,
  clanDisciplines,
  creationFloor,
  clanDisciplinesOf,
  creationStepOf,
  dotsOf,
  findDiscipline,
  freeDots,
  freebieFloor,
  isCaitiff,
  isClanDiscipline,
  isClanName,
  isConceptKind,
  isLocked,
  keyOf,
  kindOf,
  rating,
  sameName,
  traitLabel,
} from './ratings';
import { applied, commit, refuse, type UpdateResult } from './result';
import {
  CLAN_FIXED_TRAITS,
  EXTRA_FREEBIES_RANGE,
  FIXED_MAXIMUMS,
  FLAT_ALLOTMENTS,
  GENERATION_TABLE,
  MAX_HELD,
  RANKED_ALLOTMENTS,
  RANKS,
  type BuildStep,
  type ClanName,
  type Rank,
  SCREENS,
} from './rules';

/** How a rating change is paid for: the creation steps' dots, or freebie points. */
export type DotSource = 'creation' | 'freebie';

const FIRST_GENERATION = GENERATION_TABLE[0].generation;
const LAST_GENERATION = GENERATION_TABLE[GENERATION_TABLE.length - 1].generation;

/** Why a change is refused, and the screen that can put it right when it is not this one. */
interface Refusal {
  reason: string;
  step?: BuildStep;
}

const because = (reason: string, step?: BuildStep): Refusal => ({ reason, step });

const MORE_WITH_FREEBIES = 'More can be bought with freebie points on Finishing touches.';

/** A whole number from the player's text, or undefined. Surrounding spaces are ignored. */
function wholeNumber(text: string, range: Range): number | undefined {
  const entry = text.trim();
  const value = /^\d+$/.test(entry) ? Number(entry) : Number.NaN;
  return value >= range.min && value <= range.max ? value : undefined;
}

const stepTitle = (step: string): string =>
  SCREENS.find((entry) => entry.id === step)?.title ?? step;

function joined(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// Settings

function withSettings(build: V20Build, change: Partial<BuildSettings>): V20Build {
  return { ...build, settings: { ...build.settings, ...change } };
}

function withConcept(build: V20Build, change: Partial<V20Build['concept']>): V20Build {
  return { ...build, concept: { ...build.concept, ...change } };
}

export function setBaseGeneration(build: V20Build, generation: number): UpdateResult {
  if (!GENERATION_TABLE.some((row) => row.generation === generation)) {
    return refuse(
      build,
      `Base generation must be a whole number from ${ordinal(FIRST_GENERATION)} to ${ordinal(LAST_GENERATION)}.`,
    );
  }
  return commit(build, withSettings(build, { baseGeneration: generation }), []);
}

/** Takes the player's text: anything but a whole number in range is refused. */
export function setExtraFreebies(build: V20Build, text: string): UpdateResult {
  const value = wholeNumber(text, EXTRA_FREEBIES_RANGE);
  if (value === undefined) {
    return refuse(
      build,
      `Extra freebie points must be a whole number from ${EXTRA_FREEBIES_RANGE.min} to ${EXTRA_FREEBIES_RANGE.max}.`,
    );
  }
  return commit(build, withSettings(build, { extraFreebies: value }), []);
}

/**
 * Takes the player's text: a whole number from 0 to the generation's Blood Pool
 * maximum, or a blank entry, which returns the Blood Pool to not recorded.
 */
export function setBloodPool(build: V20Build, text: string): UpdateResult {
  if (text.trim() === '') return commit(build, { ...build, bloodPool: null }, []);
  const value = wholeNumber(text, { min: 0, max: limits(build).bloodPoolMax });
  if (value === undefined) return refuse(build, bloodPoolRangeMessage(build));
  return commit(build, { ...build, bloodPool: value }, []);
}

// Concept and clan

/** Any text is kept as entered, including none. */
export function setConceptText(build: V20Build, field: ConceptField, text: string): UpdateResult {
  return commit(build, withConcept(build, { [field]: text }), []);
}

/** A sample concept by name, or '' for none. */
export function setConceptKind(build: V20Build, kind: string): UpdateResult {
  if (kind !== '' && !isConceptKind(kind)) {
    return refuse(build, `${kind} is not one of the sample concepts the builder offers.`);
  }
  return commit(build, withConcept(build, { conceptKind: kind }), []);
}

/** Any text is kept as entered, including none. */
export function setDrive(build: V20Build, text: string): UpdateResult {
  return commit(build, withConcept(build, { drive: text }), []);
}

interface ClanChange {
  candidate: V20Build;
  /** What the change will remove, for the player to confirm. */
  pending: string[];
  /** The same, said after it was done. */
  done: string[];
}

function changeClan(build: V20Build, clan: ClanName): ClanChange {
  const pending: string[] = [];
  const done: string[] = [];
  let traits = build.traits;

  // A trait the new clan fixes loses every dot it had, of either kind.
  for (const ref of Object.keys(CLAN_FIXED_TRAITS[clan] ?? {}) as FixedTraitRef[]) {
    const { creation, freebie } = build.traits[ref];
    if (creation === 0 && freebie === 0) continue;
    traits = { ...traits, [ref]: { creation: 0, freebie: 0 } };
    const group = rankedGroupOf(ref)?.group.label ?? '';
    const label = traitLabel(ref);
    const willParts = [`${label} will be set to 0`];
    const wasParts = [`${label} was set to 0`];
    if (creation > 0) {
      willParts.push(`${plural(creation, 'dot')} returned to ${group}`);
      wasParts.push(`${plural(creation, 'dot')} ${creation === 1 ? 'was' : 'were'} returned to ${group}`);
    }
    if (freebie > 0) {
      const points = plural(freebie * freebieCost(ref), 'freebie point');
      willParts.push(`${points} refunded`);
      wasParts.push(`${points} ${freebie * freebieCost(ref) === 1 ? 'was' : 'were'} refunded`);
    }
    pending.push(`${joined(willParts)}.`);
    done.push(`${joined(wasParts)}.`);
  }

  // Creation dots go only on clan Disciplines; a Caitiff may hold any. Bought dots stay.
  const keepsAll = clan === 'Caitiff';
  const offered = (name: string) =>
    keepsAll || clanDisciplinesOf(clan).some((discipline) => sameName(discipline, name));
  const removed = build.disciplines.filter((entry) => entry.creation > 0 && !offered(entry.name));
  const disciplines = build.disciplines
    .map((entry) => (offered(entry.name) ? entry : { ...entry, creation: 0 }))
    .filter((entry) => entry.creation + entry.freebie > 0 || (keepsAll && offered(entry.name)));
  if (removed.length > 0) {
    const dots = removed.reduce((sum, entry) => sum + entry.creation, 0);
    const names = joined(removed.map((entry) => entry.name));
    const subject = `The ${names} ${dots === 1 ? 'dot' : 'dots'}`;
    const reason = `because ${clan} does not have ${removed.length === 1 ? 'it' : 'them'}`;
    pending.push(`${subject} will be removed ${reason}.`);
    done.push(`${subject} ${dots === 1 ? 'was' : 'were'} removed ${reason}.`);
  }

  return { candidate: { ...build, clan, traits, disciplines }, pending, done };
}

/** What choosing `clan` would remove, as sentences for the player to confirm. Empty if nothing. */
export function clanChangeEffects(build: V20Build, clan: string): string[] {
  if (!isClanName(clan) || clan === build.clan) return [];
  return changeClan(build, clan as ClanName).pending;
}

/**
 * A clan from the catalogue. Once one is chosen it can be switched but not
 * cleared. Whatever the new clan does not allow is removed and named in the notices.
 */
export function setClan(build: V20Build, clan: string): UpdateResult {
  if (clan === '') {
    return refuse(build, 'A chosen clan cannot be cleared. Choose another clan instead.');
  }
  if (!isClanName(clan)) {
    return refuse(build, `${clan} is not one of the clans the builder offers.`);
  }
  if (clan === build.clan) return applied(build);
  const { candidate, done } = changeClan(build, clan as ClanName);
  return commit(build, candidate, done);
}

// Ranks

/**
 * Gives a group a rank. A rank another group of the same allotment holds is
 * swapped: that group takes this group's previous rank, or none.
 */
export function setRank(build: V20Build, groupKey: string, rank: string): UpdateResult {
  const allotment = RANKED_ALLOTMENTS.find((entry) => entry.groups.some((group) => group.key === groupKey));
  if (!allotment) return refuse(build, `There is no group called ${groupKey}.`);
  if (!(RANKS as readonly string[]).includes(rank)) {
    return refuse(build, 'Choose primary, secondary or tertiary.');
  }
  const previous = build.ranks[groupKey];
  if (previous === rank) return applied(build);

  const label = (key: string) => allotment.groups.find((group) => group.key === key)!.label;
  // A stored build may hold the rank twice: every holder gives it up, and the first takes this group's previous
  // rank unless another group already holds that, so the order that results is unique.
  const holders = allotment.groups.filter((group) => group.key !== groupKey && build.ranks[group.key] === rank);
  const ranks = { ...build.ranks, [groupKey]: rank as Rank };
  for (const holder of holders) ranks[holder.key] = '';
  if (holders.length > 0 && previous && !allotment.groups.some((group) => group.key !== groupKey && ranks[group.key] === previous)) {
    ranks[holders[0].key] = previous;
  }
  const candidate = { ...build, ranks };

  // A rank nobody held is told by the group alone; a swap names both groups, so the choice is said once either way.
  if (holders.length === 0) return commit(build, candidate, [`${label(groupKey)} is now ${titleCase(rank)}.`]);
  const notices = holders.map((holder, index) => {
    const name = label(holder.key);
    const now = ranks[holder.key];
    const placed = allotmentStates(candidate).find((state) => state.key === holder.key)!.placed;
    const overspent = placed > 0 ? `, so ${plural(placed, `${name} dot`)} ${placed === 1 ? 'is' : 'are'} overspent until ${name} is ranked` : '';
    const outcome = now ? `${name} is now ${titleCase(now)}` : `${name} now has no rank${overspent}`;
    return `${index === 0 ? `${label(groupKey)} is now ${titleCase(rank)} and ` : ''}${outcome}.`;
  });
  return commit(build, candidate, notices);
}

// Ratings

function withDots(build: V20Build, ref: BuildTraitRef, dots: Dots, keepAtZero: boolean): V20Build {
  if (kindOf(ref) !== 'discipline') {
    return { ...build, traits: { ...build.traits, [ref]: dots } };
  }
  const name = keyOf(ref);
  const existing = findDiscipline(build, name);
  const entry: DisciplineEntry = existing
    ? { ...existing, ...dots }
    : { name: catalogueDiscipline(name) ?? name.trim(), writeIn: !catalogueDiscipline(name), ...dots };
  const empty = entry.creation + entry.freebie === 0;
  const disciplines = existing
    ? build.disciplines.flatMap((current) => (current === existing ? (empty && !keepAtZero ? [] : [entry]) : [current]))
    : empty
      ? build.disciplines
      : [...build.disciplines, entry];
  return { ...build, disciplines };
}

/** How many Disciplines or Backgrounds the build holds: those rated above 0. */
function heldCount(build: V20Build, ref: BuildTraitRef): number {
  const allotment = FLAT_ALLOTMENTS.find((entry) => entry.traitKind === kindOf(ref));
  if (!allotment) return 0;
  const traits: BuildTraitRef[] =
    kindOf(ref) === 'discipline'
      ? build.disciplines.map((entry): BuildTraitRef => `discipline:${entry.name}`)
      : (Object.keys(build.traits) as FixedTraitRef[]).filter((key) => kindOf(key) === kindOf(ref));
  return traits.filter((trait) => rating(build, trait) > 0).length;
}

function heldCapRefusal(build: V20Build, ref: BuildTraitRef, target: number): Refusal | undefined {
  const kind = kindOf(ref);
  if (kind !== 'discipline' && kind !== 'background') return undefined;
  if (rating(build, ref) > 0 || target === 0) return undefined;
  if (heldCount(build, ref) < MAX_HELD) return undefined;
  return because(`A character holds at most six ${kind === 'discipline' ? 'Disciplines' : 'Backgrounds'}.`);
}

function generationNotice(before: V20Build, after: V20Build): string[] {
  if (effectiveGeneration(before) === effectiveGeneration(after)) return [];
  return [
    `The effective generation is now ${ordinal(effectiveGeneration(after))}, with a Blood Pool maximum of ${limits(after).bloodPoolMax}.`,
  ];
}

function knownDiscipline(build: V20Build, ref: BuildTraitRef): boolean {
  const name = keyOf(ref);
  return findDiscipline(build, name) !== undefined || isClanDiscipline(build, name);
}

function costRefusal(build: V20Build, ref: BuildTraitRef, added: number): Refusal | undefined {
  if (added <= 0) return undefined;
  const cost = added * freebieCost(ref);
  const left = freebiesRemaining(build);
  if (cost <= left) return undefined;
  const noun = NOUNS[kindOf(ref)];
  const what = added === 1 ? `A ${noun} dot costs` : `${added} ${noun} dots cost`;
  return because(`${what} ${plural(cost, 'freebie point')} and only ${left} ${left === 1 ? 'remains' : 'remain'}.`);
}

const NOUNS: Record<ReturnType<typeof kindOf>, string> = {
  attribute: 'Attribute',
  ability: 'Ability',
  discipline: 'Discipline',
  background: 'Background',
  virtue: 'Virtue',
  humanity: 'Humanity',
  willpower: 'Willpower',
};

/**
 * Sets a trait to `target` in total. The source decides which dots change:
 * creation dots on the creation steps, freebie dots on Finishing touches.
 * Neither source can take away the other's dots or the free ones.
 */
export function setRating(
  build: V20Build,
  ref: BuildTraitRef,
  target: number,
  source: DotSource,
): UpdateResult {
  const label = traitLabel(ref);
  if (isLocked(build, ref)) {
    return refuse(build, `${label} is fixed at ${rating(build, ref)} for ${build.clan}.`);
  }
  if (!Number.isInteger(target)) return refuse(build, `${label} must be a whole number of dots.`);
  if (target === rating(build, ref)) return applied(build);

  return source === 'creation'
    ? setCreationRating(build, ref, target)
    : setFreebieRating(build, ref, target);
}

// The rules both setters share. Each returns why a change is refused, or nothing when the rule allows it.

function ceilingRefusal(build: V20Build, ref: BuildTraitRef, target: number): Refusal | undefined {
  const max = maximumFor(build, ref);
  return target > max ? because(`${traitLabel(ref)} cannot go above ${max}.`) : undefined;
}

function generationRefusal(build: V20Build, ref: BuildTraitRef, target: number): Refusal | undefined {
  return ref === GENERATION_REF && target > generationBackgroundTop(build) ? because(PAST_BEST_GENERATION) : undefined;
}

// The rules creation dots alone are held to.

/** Humanity and Willpower take no creation dots: they follow the Virtues. */
function derivedRefusal(build: V20Build, ref: BuildTraitRef): Refusal | undefined {
  if (ref !== 'humanity' && ref !== 'willpower') return undefined;
  return because(`${traitLabel(ref)} comes from the Virtues. ${MORE_WITH_FREEBIES}`, 'finishing');
}

/** Creation dots go on a chosen clan's Disciplines; a Caitiff may hold any it knows. */
function disciplineRefusal(build: V20Build, ref: BuildTraitRef): Refusal | undefined {
  if (kindOf(ref) !== 'discipline') return undefined;
  if (build.clan === '') return because('Choose a clan on the Clan step before placing Discipline dots.', 'clan');
  if (isCaitiff(build) ? knownDiscipline(build, ref) : isClanDiscipline(build, keyOf(ref))) return undefined;
  return because(`${traitLabel(ref)} is not a ${build.clan} Discipline. ${MORE_WITH_FREEBIES}`, 'finishing');
}

function creationFloorRefusal(build: V20Build, ref: BuildTraitRef, target: number): Refusal | undefined {
  const floor = creationFloor(build, ref);
  if (target >= floor) return undefined;
  if (dotsOf(build, ref).freebie > 0 && target >= freeDots(build, ref)) {
    return because('Freebie dots are removed on Finishing touches.', 'finishing');
  }
  return because(`${traitLabel(ref)} cannot go below ${floor}.`);
}

/** What a pool that cannot take another dot says: how many it has left, or that it has none. */
function poolShortMessage(state: AllotmentState): string {
  if (state.kind === 'ranked') {
    return state.remaining > 0
      ? `${state.label} has only ${plural(state.remaining, 'dot')} remaining.`
      : `${state.label} has no dots remaining.`;
  }
  if (state.remaining > 0) {
    return `There ${state.remaining === 1 ? 'is' : 'are'} only ${plural(state.remaining, `${state.noun} dot`)} remaining.`;
  }
  return `There are no ${state.noun} dots remaining.`;
}

/** Placing `added` more creation dots: the group needs a rank, the Ability a creation ceiling, the pool enough left. */
function poolRefusal(build: V20Build, ref: BuildTraitRef, target: number, added: number): Refusal | undefined {
  if (added <= 0) return undefined;
  const state = allotmentStateFor(build, ref)!;
  if (state.kind === 'ranked' && state.rank === '') {
    return because(`Rank the ${state.label} group before placing dots in it.`);
  }
  if (target > creationMaximum(build, ref)) {
    return because(
      `Abilities cannot go above ${FIXED_MAXIMUMS.abilityCreation} before freebie points, which are spent on Finishing touches.`,
      'finishing',
    );
  }
  if (added > state.remaining) return because(`${poolShortMessage(state)} ${MORE_WITH_FREEBIES}`, 'finishing');
  return undefined;
}

function setCreationRating(build: V20Build, ref: BuildTraitRef, target: number): UpdateResult {
  const dots = dotsOf(build, ref);
  const creation = target - freeDots(build, ref) - dots.freebie;
  const refusal =
    derivedRefusal(build, ref) ??
    disciplineRefusal(build, ref) ??
    creationFloorRefusal(build, ref, target) ??
    ceilingRefusal(build, ref, target) ??
    poolRefusal(build, ref, target, creation - dots.creation) ??
    generationRefusal(build, ref, target) ??
    heldCapRefusal(build, ref, target);
  if (refusal) return refuse(build, refusal.reason, refusal.step);

  // A Caitiff keeps an emptied Discipline as a row to fill again; a clan's rows are always there.
  const candidate = withDots(build, ref, { ...dots, creation }, isCaitiff(build));
  return commit(build, candidate, generationNotice(build, candidate));
}

// The rules freebie points alone are held to.

function freebieFloorRefusal(build: V20Build, ref: BuildTraitRef, target: number): Refusal | undefined {
  const floor = freebieFloor(build, ref);
  if (target >= floor) return undefined;
  if (target >= freeDots(build, ref) && dotsOf(build, ref).creation > 0) {
    return because(`Creation dots are changed on the ${stepTitle(creationStepOf(ref))} step.`, creationStepOf(ref));
  }
  if (ref === 'humanity' || ref === 'willpower') {
    return because(`${traitLabel(ref)} from the Virtues is changed on the Advantages step.`, 'advantages');
  }
  return because(`${traitLabel(ref)} cannot go below ${floor}.`);
}

function setFreebieRating(build: V20Build, ref: BuildTraitRef, target: number): UpdateResult {
  const dots = dotsOf(build, ref);
  const freebie = target - freebieFloor(build, ref);
  const refusal =
    freebieFloorRefusal(build, ref, target) ??
    ceilingRefusal(build, ref, target) ??
    costRefusal(build, ref, freebie - dots.freebie) ??
    generationRefusal(build, ref, target) ??
    heldCapRefusal(build, ref, target);
  if (refusal) return refuse(build, refusal.reason, refusal.step);

  // A bought Discipline whose dots are all removed leaves the list.
  const candidate = withDots(build, ref, { ...dots, freebie }, false);
  return commit(build, candidate, generationNotice(build, candidate));
}

// Disciplines a player names

function nameRefusal(build: V20Build, name: string): string | undefined {
  if (name.trim() === '') return 'A Discipline needs a name.';
  const shown = [...clanDisciplines(build), ...build.disciplines.map((entry) => entry.name)];
  const taken = shown.find((existing) => sameName(existing, name));
  return taken === undefined ? undefined : `The build already has ${taken}.`;
}

/**
 * Adds a Discipline by name, from the catalogue or written in. With creation
 * dots only a Caitiff may, and it starts at 0; with freebie points anyone may,
 * and it starts with one bought dot.
 */
export function addDiscipline(build: V20Build, name: string, source: DotSource): UpdateResult {
  const refused = nameRefusal(build, name);
  if (refused) return refuse(build, refused);
  const canonical = catalogueDiscipline(name) ?? name.trim();
  const entry: DisciplineEntry = {
    name: canonical,
    writeIn: catalogueDiscipline(name) === undefined,
    creation: 0,
    freebie: 0,
  };
  if (source === 'creation') {
    if (build.clan === '') {
      return refuse(build, 'Choose a clan on the Clan step before placing Discipline dots.', 'clan');
    }
    if (!isCaitiff(build)) {
      return refuse(build, `Only Caitiff choose their own Disciplines. ${MORE_WITH_FREEBIES}`, 'finishing');
    }
    return commit(build, { ...build, disciplines: [...build.disciplines, entry] }, []);
  }
  const ref: BuildTraitRef = `discipline:${canonical}`;
  const refusal = costRefusal(build, ref, 1) ?? heldCapRefusal(build, ref, 1);
  if (refusal) return refuse(build, refusal.reason, refusal.step);
  return commit(build, { ...build, disciplines: [...build.disciplines, { ...entry, freebie: 1 }] }, []);
}

/** Removes a Discipline row a Caitiff added; its creation dots return to the allotment. */
export function removeDiscipline(build: V20Build, name: string): UpdateResult {
  const entry = findDiscipline(build, name);
  if (!entry) return refuse(build, `The build has no Discipline named ${name}.`);
  if (entry.freebie > 0) {
    return refuse(build, `Remove the freebie dots of ${entry.name} on Finishing touches first.`, 'finishing');
  }
  return commit(build, { ...build, disciplines: build.disciplines.filter((each) => each !== entry) }, []);
}
