// "a 4th generation build of clan "Brujah" with Physical ranked primary and
// Strength rated 5": one Given for every build stated as a list of facts.
// Each fact becomes a real update, so the seeded build is one the rules allow.

import type { BuildTraitRef } from '../../src/domain/v20/creation/build';
import { rankedGroupOf } from '../../src/domain/v20/creation/allotments';
import { BACKGROUNDS, BUILD_VIRTUES, CLAN_NAMES } from '../../src/domain/v20/creation/rules';
import {
  addCreationDiscipline,
  clan,
  creation,
  generation,
  rank,
  type Step,
} from '../../src/domain/v20/creation/testing/play';
import { ABILITY_GROUPS, ATTRIBUTE_GROUPS } from '../../src/domain/v20/traits';
import { Given } from './fixtures';
import { openPlayed } from './support/builder';

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

interface Seed {
  first: Step[];
  ranks: Step[];
  rest: Step[];
  clan?: string;
  ranked: Set<string>;
}

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
  [/^the (?:write-in )?Discipline "([^"]+)"$/, (seed, name) => seed.rest.push(addCreationDiscipline(name))],
  [
    /^(?:the (?:write-in )?Discipline "([^"]+)"|the (Generation) background|([A-Z][\w-]*(?: [A-Z][\w-]*)*)) rated (\d+)$/,
    (seed, discipline, background, trait, value) => {
      const name = discipline ?? background ?? trait;
      const ref = refFor(name);
      if (discipline) seed.rest.push(addCreationDiscipline(name));
      else if (seed.clan === 'Caitiff' && ref.startsWith('discipline:')) seed.rest.push(addCreationDiscipline(name));
      // A rated Attribute or Ability needs its group ranked; primary unless the scenario says.
      const group = rankedGroupOf(ref)?.group.key;
      if (group && !seed.ranked.has(group)) {
        seed.ranked.add(group);
        seed.ranks.push(rank(group, 'primary'));
      }
      seed.rest.push(creation(ref, Number(value)));
    },
  ],
];

// Inside the whole sentence the facts' own groups must not capture.
const FACT_SOURCES = FACTS.map(([pattern]) => pattern.source.slice(1, -1).replace(/\((?!\?)/g, '(?:'));
const FACT = `(?:${FACT_SOURCES.join('|')})`;
const CLANS = CLAN_NAMES.join('|');

const BUILD = new RegExp(
  `^an? (?:(\\d+)th generation )?(?:(${CLANS}) )?build(?: of clan "([^"]+)")?(?: with (${FACT}(?:(?:, | and )${FACT})*))?$`,
);

/** Splits "A, B and C" into facts, keeping commas inside a quoted name. */
function facts(text: string): string[] {
  return text.split(/, | and (?=[A-Z]|the |base )/);
}

export function seedSteps(base?: string, clanBefore?: string, clanOf?: string, list?: string): Step[] {
  const seed: Seed = { first: [], ranks: [], rest: [], ranked: new Set(), clan: clanOf ?? clanBefore };
  if (base) seed.first.push(generation(Number(base)));
  if (seed.clan) seed.first.push(clan(seed.clan));
  for (const fact of list ? facts(list) : []) {
    const match = FACTS.find(([pattern]) => pattern.test(fact));
    if (!match) throw new Error(`No way to arrange "${fact}"`);
    match[1](seed, ...match[0].exec(fact)!.slice(1));
  }
  return [...seed.first, ...seed.ranks, ...seed.rest];
}

Given(BUILD, async ({ page }, base?: string, clanBefore?: string, clanOf?: string, list?: string) => {
  await openPlayed(page, ...seedSteps(base ?? undefined, clanBefore ?? undefined, clanOf ?? undefined, list ?? undefined));
});
