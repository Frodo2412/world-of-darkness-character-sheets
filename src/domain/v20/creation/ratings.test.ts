import { describe, expect, test } from 'vitest';
import {
  catalogueDiscipline,
  creationFloor,
  creationRating,
  freeDots,
  freebieFloor,
  isLocked,
  kindOf,
  rating,
  traitLabel,
} from './ratings';
import {
  attributesRanked,
  clan,
  completeBrujah,
  creation,
  freebie,
  fresh,
  play,
  rank,
} from './testing/play';

describe('rating', () => {
  test('Attributes and Virtues start at 1, everything else at 0', () => {
    const build = fresh();
    expect(rating(build, 'attribute:strength')).toBe(1);
    expect(rating(build, 'virtue:courage')).toBe(1);
    expect(rating(build, 'ability:brawl')).toBe(0);
    expect(rating(build, 'background:Resources')).toBe(0);
    expect(rating(build, 'discipline:Celerity')).toBe(0);
  });

  test('adds free, creation and freebie dots', () => {
    const build = play(fresh(), ...attributesRanked, creation('attribute:strength', 3), freebie('attribute:strength', 4));
    expect(freeDots(build, 'attribute:strength')).toBe(1);
    expect(creationRating(build, 'attribute:strength')).toBe(3);
    expect(rating(build, 'attribute:strength')).toBe(4);
  });

  test('Humanity is Conscience + Self-Control and Willpower is Courage, from creation dots only', () => {
    const build = completeBrujah();
    expect(rating(build, 'humanity')).toBe(7);
    expect(rating(build, 'willpower')).toBe(3);
    const bought = play(build, freebie('virtue:courage', 4), freebie('virtue:conscience', 5));
    expect(rating(bought, 'humanity')).toBe(7);
    expect(rating(bought, 'willpower')).toBe(3);
  });

  test.each([
    [1, 1, 1, 2, 1],
    [5, 4, 1, 9, 1],
    [1, 1, 5, 2, 5],
    [3, 4, 2, 7, 2],
  ])('Virtues %i/%i/%i give Humanity %i and Willpower %i', (conscience, selfControl, courage, humanity, willpower) => {
    const build = play(
      fresh(),
      creation('virtue:conscience', conscience),
      creation('virtue:selfControl', selfControl),
      creation('virtue:courage', courage),
    );
    expect(rating(build, 'humanity')).toBe(humanity);
    expect(rating(build, 'willpower')).toBe(willpower);
  });
});

describe('Nosferatu Appearance', () => {
  test('is fixed at 0 and locked', () => {
    const build = play(fresh(), clan('Nosferatu'));
    expect(rating(build, 'attribute:appearance')).toBe(0);
    expect(isLocked(build, 'attribute:appearance')).toBe(true);
    expect(isLocked(build, 'attribute:charisma')).toBe(false);
  });

  test('gets its free dot back when the clan changes', () => {
    const build = play(fresh(), clan('Nosferatu'), clan('Brujah'));
    expect(rating(build, 'attribute:appearance')).toBe(1);
  });
});

describe('floors', () => {
  test('creation steps cannot go below free and freebie dots, freebie points below free and creation dots', () => {
    const build = play(fresh(), rank('physical', 'primary'), creation('attribute:strength', 3), freebie('attribute:strength', 4));
    expect(creationFloor(build, 'attribute:strength')).toBe(2);
    expect(freebieFloor(build, 'attribute:strength')).toBe(3);
  });
});

test('trait kinds and labels', () => {
  expect(kindOf('attribute:strength')).toBe('attribute');
  expect(kindOf('discipline:Flight')).toBe('discipline');
  expect(kindOf('humanity')).toBe('humanity');
  expect(traitLabel('virtue:selfControl')).toBe('Self-Control');
  expect(traitLabel('ability:animalKen')).toBe('Animal Ken');
  expect(traitLabel('background:Black Hand Membership')).toBe('Black Hand Membership');
  expect(traitLabel('discipline:Flight')).toBe('Flight');
});

test('catalogue names are matched ignoring case and surrounding spaces', () => {
  expect(catalogueDiscipline(' celerity ')).toBe('Celerity');
  expect(catalogueDiscipline('Flight')).toBeUndefined();
});
