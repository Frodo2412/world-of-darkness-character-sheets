// "a 4th generation build of clan "Brujah" with Physical ranked primary and
// Strength rated 5": one Given for every build stated as a list of facts.
// Each fact becomes a real update, so the seeded build is one the rules allow.

import { rankedGroupOf } from '../../src/domain/v20/creation/allotments';
import type { BuildTraitRef } from '../../src/domain/v20/creation/build';
import { freebiesRemaining } from '../../src/domain/v20/creation/freebies';
import { maximumFor } from '../../src/domain/v20/creation/limits';
import { rating } from '../../src/domain/v20/creation/ratings';
import { BACKGROUNDS, BUILD_VIRTUES, CLAN_NAMES } from '../../src/domain/v20/creation/rules';
import {
  addCreationDiscipline,
  bloodPool,
  buyDiscipline,
  clan,
  completeBuild,
  creation,
  extra,
  fresh,
  generation,
  play,
  rank,
  type Step,
} from '../../src/domain/v20/creation/testing/play';
import { setExtraFreebies, setRating } from '../../src/domain/v20/creation/updates';
import { ABILITY_GROUPS, ATTRIBUTE_GROUPS } from '../../src/domain/v20/traits';
import { Given } from './fixtures';
import { openPlayedFrom } from './support/builder';

/** A trait's build address from the name a scenario uses. */
export function refFor(name: string): BuildTraitRef {
  for (const group of ATTRIBUTE_GROUPS) {
    const trait = group.traits.find((entry) => entry.label === name);
    if (trait) return `attribute:${trait.key}`;
  }
  for (const group of ABILITY_GROUPS) {
    const trait = group.traits.find((entry) => entry.label === name);
    if (trait) return `ability:${trait.key}`;
  }
  const virtue = BUILD_VIRTUES.find((entry) => entry.label === name);
  if (virtue) return `virtue:${virtue.key}`;
  if ((BACKGROUNDS as readonly string[]).includes(name)) return `background:${name}` as BuildTraitRef;
  if (name === 'Humanity' || name === 'Willpower') return name.toLowerCase() as BuildTraitRef;
  return `discipline:${name}`;
}

const COUNTS: Record<string, number> = { one: 1, two: 2, three: 3 };
const count = (word: string): number => COUNTS[word] ?? Number(word);

/** Adds `n` freebie dots to whatever the trait has when the step runs. */
const buyDots = (ref: BuildTraitRef, n: number): Step => (build) =>
  setRating(build, ref, rating(build, ref) + n, 'freebie');

/** Spends exactly `points`: Attribute dots at 5 while they fit, then Willpower at 1. */
const spend = (points: number): Step => (build) => {
  let next = build;
  let left = points;
  for (const ref of ['attribute:strength', 'attribute:dexterity', 'attribute:stamina'] as BuildTraitRef[]) {
    while (left >= 5 && rating(next, ref) < maximumFor(next, ref)) {
      next = play(next, buyDots(ref, 1));
      left -= 5;
    }
  }
  next = play(next, buyDots('willpower', left));
  return { status: 'applied', build: next, notices: [] };
};

/** Leaves exactly `points` unspent: more extra points, or fewer, or Willpower and Humanity bought. */
const leave = (points: number): Step => (build) => {
  let next = build;
  const over = freebiesRemaining(next) - points;
  if (over < 0) next = play(next, extra(next.settings.extraFreebies - over));
  else if (over > 0) {
    const cut = Math.min(over, next.settings.extraFreebies);
    if (cut > 0) next = play(next, (b) => setExtraFreebies(b, String(b.settings.extraFreebies - cut)));
    // Burn what is left a point at a time: Herd and Fame dots, then Willpower.
    for (const ref of ['background:Herd', 'background:Fame', 'willpower'] as BuildTraitRef[]) {
      const burn = freebiesRemaining(next) - points;
      const room = Math.min(burn, maximumFor(next, ref) - rating(next, ref));
      if (room > 0) next = play(next, buyDots(ref, room));
    }
  }
  return { status: 'applied', build: next, notices: [] };
};

/** Humanity and Willpower come from the Virtues; reach `value` with them, then freebie dots. */
function moralityTo(ref: 'humanity' | 'willpower', value: number): Step[] {
  if (ref === 'willpower') {
    const courage = Math.min(5, value);
    return [creation('virtue:courage', courage), buyDots('willpower', value - courage)];
  }
  const conscience = Math.min(5, value - 1);
  const selfControl = Math.min(4, value - conscience);
  return [
    creation('virtue:conscience', conscience),
    creation('virtue:selfControl', selfControl),
    buyDots('humanity', value - conscience - selfControl),
  ];
}

/**
 * In a complete build, rates a trait while keeping its group complete: the
 * group's other traits give up their creation dots, then take back what is left.
 */
const rebalanced = (ref: BuildTraitRef, value: number): Step => (build) => {
  const group = rankedGroupOf(ref);
  if (!group) return setRating(build, ref, value, 'creation');
  const prefix = ref.slice(0, ref.indexOf(':'));
  const others = group.group.traits.map((trait) => `${prefix}:${trait}` as BuildTraitRef).filter((each) => each !== ref);
  const floor = (each: BuildTraitRef) => rating(build, each) - build.traits[each as keyof typeof build.traits].creation;
  let next = play(build, ...others.map((each) => creation(each, floor(each))), creation(ref, value));
  const cap = prefix === 'ability' ? 3 : 5;
  for (const each of others) {
    for (let target = rating(next, each) + 1; target <= cap; target += 1) {
      const result = setRating(next, each, target, 'creation');
      if (result.status === 'refused') break;
      next = result.build;
    }
  }
  return { status: 'applied', build: next, notices: [] };
};

interface Seed {
  /** A complete build is kept complete when a fact rates one of its traits. */
  complete?: boolean;
  first: Step[];
  ranks: Step[];
  rest: Step[];
  last: Step[];
  clan?: string;
  ranked: Set<string>;
}

const TRAIT = '([A-Z][\\w-]*(?: [A-Z][\\w-]*)*)';
const KIND = '(?:the (?:Attribute|Ability|Discipline|Background|Virtue) )?';

/** Facts a scenario can state, each turned into updates. */
const FACTS: [RegExp, (seed: Seed, ...groups: string[]) => void][] = [
  [/^base generation "(\d+)th"$/, (seed, base) => seed.first.push(generation(Number(base)))],
  [
    /^(Physical|Social|Mental|Talents|Skills|Knowledges) ranked (primary|secondary|tertiary)$/,
    (seed, group, value) => {
      seed.ranked.add(group.toLowerCase());
      seed.ranks.push(rank(group.toLowerCase(), value));
    },
  ],
  [/^no Attribute ranks$/, () => {}],
  [/^nothing spent$/, () => {}],
  [/^a freebie budget of (\d+)$/, (seed, budget) => seed.first.push(extra(Number(budget) - 15))],
  [/^(\d+) extra freebie points$/, (seed, points) => seed.first.push(extra(Number(points)))],
  [/^(\d+) freebie points spent$/, (seed, points) => seed.last.push(spend(Number(points)))],
  [/^(\d+) freebie points? (?:remaining|remain)$/, (seed, points) => seed.last.push(leave(Number(points)))],
  [/^a starting blood pool of (\d+)$/, (seed, value) => seed.rest.push(bloodPool(Number(value)))],
  [/^the (?:write-in )?Discipline "([^"]+)"$/, (seed, name) => seed.rest.push(addCreationDiscipline(name))],
  [
    /^the freebie Discipline "([^"]+)" rated (\d+)$/,
    (seed, name, value) => seed.rest.push(buyDiscipline(name), (b) => setRating(b, `discipline:${name}`, Number(value), 'freebie')),
  ],
  [
    new RegExp(`^(one|two|three|\\d+) freebie dots? of ${KIND}${TRAIT}$`),
    (seed, n, name) => seed.rest.push(buyDots(refFor(name), count(n))),
  ],
  [
    new RegExp(`^(?:the (?:write-in )?Discipline "([^"]+)"|the (Generation) background|${TRAIT}) rated (\\d+)$`),
    (seed, discipline, background, trait, value) => {
      const name = discipline ?? background ?? trait;
      const ref = refFor(name);
      if (ref === 'humanity' || ref === 'willpower') {
        seed.rest.push(...moralityTo(ref, Number(value)));
        return;
      }
      if (discipline) seed.rest.push(addCreationDiscipline(name));
      else if (seed.clan === 'Caitiff' && ref.startsWith('discipline:')) seed.rest.push(addCreationDiscipline(name));
      // A rated Attribute or Ability needs its group ranked; primary unless the scenario says.
      const group = rankedGroupOf(ref)?.group.key;
      if (group && !seed.ranked.has(group)) {
        seed.ranked.add(group);
        seed.ranks.push(rank(group, 'primary'));
      }
      seed.rest.push(seed.complete ? rebalanced(ref, Number(value)) : creation(ref, Number(value)));
    },
  ],
];

// Inside the whole sentence the facts' own groups must not capture.
const FACT_SOURCES = FACTS.map(([pattern]) => pattern.source.slice(1, -1).replace(/\((?!\?)/g, '(?:'));
const FACT = `(?:${FACT_SOURCES.join('|')})`;
const FACTS_LIST = `(${FACT}(?:(?:, | and )${FACT})*)`;
const CLANS = CLAN_NAMES.join('|');
const PREFIX = `(?:(\\d+)th generation )?(?:(${CLANS}) )?build(?: of clan "([^"]+)")?`;

const BUILD = new RegExp(`^an? ${PREFIX}(?: with ${FACTS_LIST})?$`);
const COMPLETE = new RegExp(`^a complete ${PREFIX}(?: with ${FACTS_LIST})?$`);

/** Splits "A, B and C" into facts. */
function facts(text: string): string[] {
  return text.split(/, | and (?=[A-Z]|the |base |a |one |two |three |no |nothing|\d)/);
}

export function seedSteps(base?: string, clanBefore?: string, clanOf?: string, list?: string, complete = false): Step[] {
  const seed: Seed = {
    complete,
    first: [],
    ranks: [],
    rest: [],
    last: [],
    // A complete build has every group ranked already.
    ranked: new Set(complete ? ['physical', 'social', 'mental', 'talents', 'skills', 'knowledges'] : []),
    clan: clanOf ?? clanBefore,
  };
  if (base) seed.first.push(generation(Number(base)));
  if (seed.clan) seed.first.push(clan(seed.clan));
  for (const fact of list ? facts(list) : []) {
    const match = FACTS.find(([pattern]) => pattern.test(fact));
    if (!match) throw new Error(`No way to arrange "${fact}"`);
    match[1](seed, ...match[0].exec(fact)!.slice(1));
  }
  return [...seed.first, ...seed.ranks, ...seed.rest, ...seed.last];
}

const orUndefined = (value?: string | null) => value ?? undefined;

Given(BUILD, async ({ page, memory }, base?: string, clanBefore?: string, clanOf?: string, list?: string) => {
  const steps = seedSteps(orUndefined(base), orUndefined(clanBefore), orUndefined(clanOf), orUndefined(list));
  memory.build = await openPlayedFrom(page, fresh(), ...steps);
});

export { buyDots, leave as leaveFreebies };

Given(COMPLETE, async ({ page, memory }, base?: string, clanBefore?: string, clanOf?: string, list?: string) => {
  const name = orUndefined(clanOf) ?? orUndefined(clanBefore) ?? 'Brujah';
  const steps = seedSteps(orUndefined(base), undefined, undefined, orUndefined(list), true);
  memory.build = await openPlayedFrom(page, completeBuild(name), ...steps);
});
