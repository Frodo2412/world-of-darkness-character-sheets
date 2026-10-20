import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { blankBuild, type V20Build } from './build';
import { freebieBudget, freebiesSpent } from './freebies';
import { rating } from './ratings';
import { applied, commit, refuse } from './result';
import { creation, extra, freebie, fresh, play } from './testing/play';
import { setRating } from './updates';

const before = blankBuild('abc');
const candidate = { ...before, settings: { ...before.settings, baseGeneration: 10 } };

describe('applied', () => {
  test('carries the new build and no notices by default', () => {
    expect(applied(candidate)).toEqual({ status: 'applied', build: candidate, notices: [] });
  });

  test('carries every notice in order', () => {
    expect(applied(candidate, 'first', 'second')).toEqual({
      status: 'applied',
      build: candidate,
      notices: ['first', 'second'],
    });
  });
});

describe('refuse', () => {
  test('returns the identical build reference with the reason', () => {
    const result = refuse(before, 'Nope.');
    expect(result).toEqual({ status: 'refused', build: before, reason: 'Nope.' });
    expect(result.build).toBe(before);
  });
});

describe('commit', () => {
  test('applies a candidate that breaks no rule, with its notices', () => {
    expect(commit(before, candidate, ['Changed.'])).toEqual({
      status: 'applied',
      build: candidate,
      notices: ['Changed.'],
    });
  });
});

describe('commit on a stored build that already breaks a rule', () => {
  /** 20 freebie points spent against a budget of 15: two Abilities bought up to 5. */
  const overBudget: V20Build = {
    ...fresh(),
    traits: { ...fresh().traits, 'ability:crafts': { creation: 0, freebie: 5 }, 'ability:drive': { creation: 0, freebie: 5 } },
  };

  /** Humanity at 12 against a maximum of 10: Conscience 5 and Self-Control 4 give 9, and 3 bought dots take it to 12. */
  const overHumanity: V20Build = (() => {
    const built = play(fresh(), extra(100), creation('virtue:conscience', 5), creation('virtue:selfControl', 4), freebie('humanity', 10));
    return { ...built, traits: { ...built.traits, humanity: { ...built.traits.humanity, freebie: built.traits.humanity.freebie + 2 } } };
  })();

  const withDots = (build: V20Build, ref: 'ability:crafts' | 'humanity', freebieDots: number): V20Build => ({
    ...build,
    traits: { ...build.traits, [ref]: { ...build.traits[ref], freebie: freebieDots } },
  });

  test('the stored builds break the rules they are meant to', () => {
    expect([freebiesSpent(overBudget), freebieBudget(overBudget)]).toEqual([20, 15]);
    expect(rating(overHumanity, 'humanity')).toBe(12);
  });

  test('accepts removing one purchase, though the overspend is still there and its wording changes', () => {
    expect(setRating(overBudget, 'ability:crafts', 4, 'freebie')).toMatchObject({ status: 'applied' });
    expect(commit(overBudget, withDots(overBudget, 'ability:crafts', 4), [])).toMatchObject({ status: 'applied' });
  });

  test('refuses buying more while over budget, naming the new excess', () => {
    const worse = { ...overBudget, traits: { ...overBudget.traits, 'ability:occult': { creation: 0, freebie: 1 } } };
    expect(commit(overBudget, worse, [])).toEqual({
      status: 'refused',
      build: overBudget,
      reason: '22 freebie points are spent, so at least 7 points of purchases must be removed first.',
      step: 'finishing',
    });
  });

  test('accepts lowering Humanity from 12 to 11', () => {
    expect(commit(overHumanity, withDots(overHumanity, 'humanity', overHumanity.traits.humanity.freebie - 1), [])).toMatchObject({
      status: 'applied',
    });
  });

  test('refuses raising Humanity from 12 to 13', () => {
    expect(commit(overHumanity, withDots(overHumanity, 'humanity', overHumanity.traits.humanity.freebie + 1), [])).toMatchObject({
      status: 'refused',
      reason: 'Remove 3 freebie dots of Humanity first.',
    });
  });

  test('still refuses a violation the stored build did not have', () => {
    const strength = { ...overBudget, traits: { ...overBudget.traits, 'attribute:strength': { creation: 5, freebie: 0 } } };
    expect(commit(overBudget, strength, [])).toMatchObject({ status: 'refused', reason: 'Lower Strength to 5 first.', step: 'attributes' });
  });
});

describe('creation module layers', () => {
  // Each file may import only the creation files named here. Files not yet written
  // are listed so later slices keep to the layering without editing this test.
  const BELOW_UPDATES = ['rules', 'build', 'ratings', 'allotments', 'freebies', 'limits', 'result', 'wording'];
  const ALLOWED: Record<string, string[]> = {
    rules: [],
    wording: [],
    catalogue: [],
    sampleConcepts: ['rules'],
    clanCards: ['rules', 'ratings', 'catalogue'],
    archetypes: ['rules', 'build', 'catalogue', 'wording'],
    build: ['rules'],
    ratings: ['rules', 'build'],
    allotments: ['rules', 'build', 'ratings'],
    freebies: ['rules', 'build', 'ratings'],
    limits: ['rules', 'build', 'ratings', 'allotments', 'freebies'],
    result: ['rules', 'build', 'limits'],
    updates: BELOW_UPDATES,
    progress: BELOW_UPDATES,
    screens: [...BELOW_UPDATES, 'progress'],
    shellView: [...BELOW_UPDATES, 'progress'],
    poolViews: [...BELOW_UPDATES, 'progress', 'screens'],
    advantageViews: [...BELOW_UPDATES, 'catalogue', 'progress', 'screens', 'poolViews'],
    toCharacter: BELOW_UPDATES,
  };

  const directory = fileURLToPath(new URL('.', import.meta.url));
  const sources = readdirSync(directory)
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .map((file) => ({ name: file.slice(0, -3), text: readFileSync(directory + file, 'utf8') }));

  const importsOf = (text: string) => [...text.matchAll(/^import\b[^;]*?from\s+'([^']+)'/gms)].map((match) => match[1]);

  test('every creation file is covered by the layer map', () => {
    expect(sources.map((source) => source.name).filter((name) => !(name in ALLOWED))).toEqual([]);
  });

  test.each(sources.map((source) => [source.name, source.text]))('%s imports only files below it', (name, text) => {
    const siblings = importsOf(text)
      .filter((specifier) => specifier.startsWith('./'))
      .map((specifier) => specifier.slice(2));
    expect(siblings.filter((sibling) => !ALLOWED[name].includes(sibling))).toEqual([]);
  });

  test.each(sources.map((source) => [source.name, source.text]))('%s imports nothing outside the domain', (name, text) => {
    const outside = importsOf(text).filter(
      (specifier) =>
        !specifier.startsWith('./') &&
        specifier !== '../traits' &&
        !(name === 'toCharacter' && specifier === '../character') &&
        !(name === 'limits' && specifier === '../identity'),
    );
    expect(outside).toEqual([]);
  });

  test('refuse is called only from result.ts and updates.ts', () => {
    const callers = sources.filter((source) => /\brefuse\(/.test(source.text)).map((source) => source.name);
    expect(callers.sort()).toEqual(['result', 'updates']);
  });

  test('only result.ts builds an UpdateResult', () => {
    const builders = sources.filter((source) => /status:\s*'(applied|refused)'/.test(source.text)).map((source) => source.name);
    expect(builders).toEqual(['result']);
  });

  test('commit is defined in result.ts and called only from updates.ts', () => {
    const callers = sources.filter((source) => /\bcommit\(/.test(source.text)).map((source) => source.name);
    expect(callers.sort()).toEqual(['result', 'updates']);
  });
});
