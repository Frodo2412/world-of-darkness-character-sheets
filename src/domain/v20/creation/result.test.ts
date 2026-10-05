import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { blankBuild } from './build';
import { applied, commit, refuse } from './result';

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

describe('creation module layers', () => {
  // Each file may import only the creation files named here. Files not yet written
  // are listed so later slices keep to the layering without editing this test.
  const BELOW_UPDATES = ['rules', 'build', 'ratings', 'allotments', 'freebies', 'limits', 'result'];
  const ALLOWED: Record<string, string[]> = {
    rules: [],
    build: ['rules'],
    ratings: ['rules', 'build'],
    allotments: ['rules', 'build', 'ratings'],
    freebies: ['rules', 'build', 'ratings'],
    limits: ['rules', 'build', 'ratings', 'allotments', 'freebies'],
    result: ['rules', 'build', 'limits'],
    updates: BELOW_UPDATES,
    progress: BELOW_UPDATES,
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
      (specifier) => !specifier.startsWith('./') && specifier !== '../traits' && !(name === 'toCharacter' && specifier === '../character'),
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
