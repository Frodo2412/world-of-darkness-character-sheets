// The creation rules played through the real updates: ranks, creation dots,
// freebie points, clan changes, generation and the hard limits.

import { describe, expect, test } from 'vitest';
import { allotmentStates } from './allotments';
import type { BuildTraitRef, V20Build } from './build';
import { freebiesRemaining, freebiesSpent } from './freebies';
import { effectiveGeneration, limits, maximumFor, violations } from './limits';
import { outstanding, report, stepStatuses, unspentFreebies } from './progress';
import { rating } from './ratings';
import type { UpdateResult } from './result';
import {
  abilitiesRanked,
  addCreationDiscipline,
  attributesRanked,
  buyDiscipline,
  clan,
  completeBrujah,
  completeBuild,
  creation,
  extra,
  freebie,
  fresh,
  generation,
  play,
  rank,
  type Step,
} from './testing/play';
import {
  addDiscipline,
  clanChangeEffects,
  removeDiscipline,
  setBaseGeneration,
  setBloodPool,
  setClan,
  setExtraFreebies,
  setRank,
  setRating,
} from './updates';

const remaining = (build: V20Build, key: string) =>
  allotmentStates(build).find((state) => state.key === key)!.remaining;

function refused(result: UpdateResult, before: V20Build) {
  expect(result.status).toBe('refused');
  expect(result.build).toBe(before);
  return result as Extract<UpdateResult, { status: 'refused' }>;
}

function appliedBuild(result: UpdateResult): V20Build {
  if (result.status !== 'applied') throw new Error(`refused: ${result.reason}`);
  return result.build;
}

describe('ranked groups', () => {
  test('ranks give Attributes 7/5/3 and Abilities 13/9/5', () => {
    const build = play(fresh(), ...attributesRanked, ...abilitiesRanked);
    expect(['physical', 'social', 'mental', 'talents', 'skills', 'knowledges'].map((key) => remaining(build, key))).toEqual([
      7, 5, 3, 13, 9, 5,
    ]);
  });

  test('an unranked group refuses creation dots', () => {
    const build = fresh();
    const result = refused(setRating(build, 'attribute:strength', 2, 'creation'), build);
    expect(result.reason).toBe('Rank the Physical group before placing dots in it.');
  });

  test('taking a held rank swaps the two groups and names both', () => {
    const build = play(fresh(), ...attributesRanked);
    const result = setRank(build, 'mental', 'primary');
    expect(result).toMatchObject({ status: 'applied', notices: ['Mental is now primary and Physical is now tertiary.'] });
    expect(result.build.ranks).toMatchObject({ mental: 'primary', physical: 'tertiary', social: 'secondary' });
  });

  test('an unranked group taking a held rank leaves the holder unranked and overspent', () => {
    const build = play(fresh(), rank('physical', 'primary'), creation('attribute:strength', 4));
    const result = setRank(build, 'social', 'primary');
    expect(result).toMatchObject({
      status: 'applied',
      notices: ['Social is now primary and Physical now has no rank, so its 3 dots are overspent until it is ranked.'],
    });
    expect(result.build.ranks.physical).toBe('');
    expect(remaining(result.build, 'physical')).toBe(-3);
    expect(rating(result.build, 'attribute:strength')).toBe(4);
  });

  test('ranking a free rank gives no notice and leaves other groups alone', () => {
    const result = setRank(fresh(), 'social', 'primary');
    expect(result).toMatchObject({ status: 'applied', notices: [] });
    expect(result.build.ranks).toMatchObject({ social: 'primary', physical: '', mental: '' });
  });

  test.each(['', 'none', 'first'])('refuses the rank %j', (value) => {
    const build = fresh();
    refused(setRank(build, 'physical', value), build);
  });

  test('re-ranking keeps dots that fit and reports a group that no longer fits as overspent', () => {
    let build = play(fresh(), rank('physical', 'primary'), creation('attribute:strength', 4));
    build = play(build, rank('physical', 'secondary'));
    expect(remaining(build, 'physical')).toBe(2);
    build = play(build, creation('attribute:dexterity', 3), rank('physical', 'tertiary'));
    expect(remaining(build, 'physical')).toBe(-2);
    expect(rating(build, 'attribute:strength')).toBe(4);
    expect(stepStatuses(build).attributes).toBe('overspent');
  });

  test('lowering an overspent group is allowed', () => {
    const build = play(fresh(), rank('physical', 'primary'), creation('attribute:strength', 5), rank('physical', 'tertiary'));
    expect(appliedBuild(setRating(build, 'attribute:strength', 4, 'creation')).traits['attribute:strength'].creation).toBe(3);
  });
});

describe('creation dots', () => {
  test('a group cannot exceed its allotment', () => {
    const build = play(fresh(), rank('mental', 'tertiary'), creation('attribute:perception', 3), creation('attribute:intelligence', 2));
    const result = refused(setRating(build, 'attribute:wits', 2, 'creation'), build);
    expect(result.reason).toBe('Mental has no dots remaining. More can be bought with freebie points on Finishing touches.');
    expect(result.step).toBe('finishing');
  });

  test('asking for more dots than remain is refused, naming what is left', () => {
    const build = play(fresh(), rank('mental', 'tertiary'), creation('attribute:perception', 2));
    expect(refused(setRating(build, 'attribute:wits', 4, 'creation'), build).reason).toBe(
      'Mental has only 2 dots remaining. More can be bought with freebie points on Finishing touches.',
    );
  });

  test.each([
    [13, 5],
    [7, 6],
    [4, 9],
  ])('at %ith generation an Attribute reaches %i and no higher', (base, max) => {
    const build = play(fresh(), generation(base), rank('physical', 'primary'));
    expect(maximumFor(build, 'attribute:strength')).toBe(max);
    expect(rating(play(build, creation('attribute:strength', Math.min(max, 8))), 'attribute:strength')).toBe(Math.min(max, 8));
    refused(setRating(build, 'attribute:strength', max + 1, 'creation'), build);
  });

  test('the free dot cannot be removed', () => {
    const build = play(fresh(), rank('physical', 'primary'));
    expect(refused(setRating(build, 'attribute:stamina', 0, 'creation'), build).reason).toBe('Stamina cannot go below 1.');
  });

  test.each([13, 4])('at %ith generation no Ability goes above 3 with creation dots', (base) => {
    const build = play(fresh(), generation(base), ...abilitiesRanked, creation('ability:brawl', 3));
    expect(refused(setRating(build, 'ability:brawl', 4, 'creation'), build).reason).toBe(
      'Abilities cannot go above 3 before freebie points, which are spent on Finishing touches.',
    );
  });

  test('an Ability can be lowered back to 0', () => {
    const build = play(fresh(), rank('skills', 'secondary'), creation('ability:stealth', 2), creation('ability:stealth', 0));
    expect(remaining(build, 'skills')).toBe(9);
  });

  test('Virtues hold seven creation dots over their free dots, up to 5 at any generation', () => {
    let build = play(fresh(), generation(4), creation('virtue:conscience', 4), creation('virtue:selfControl', 3), creation('virtue:courage', 3));
    expect(remaining(build, 'virtues')).toBe(0);
    expect(refused(setRating(build, 'virtue:courage', 4, 'creation'), build).reason).toBe(
      'There are no Virtue dots remaining. More can be bought with freebie points on Finishing touches.',
    );
    build = play(fresh(), generation(4));
    expect(maximumFor(build, 'virtue:courage')).toBe(5);
    expect(maximumFor(build, 'background:Resources')).toBe(9);
    refused(setRating(build, 'virtue:conscience', 0, 'creation'), build);
  });

  test('Backgrounds hold five creation dots', () => {
    const build = play(fresh(), creation('background:Resources', 3), creation('background:Herd', 2));
    expect(refused(setRating(build, 'background:Fame', 1, 'creation'), build).reason).toBe(
      'There are no Background dots remaining. More can be bought with freebie points on Finishing touches.',
    );
  });

  test('freebie dots are removed on Finishing touches, not the creation step', () => {
    const build = play(fresh(), freebie('attribute:strength', 2));
    const result = refused(setRating(build, 'attribute:strength', 1, 'creation'), build);
    expect(result).toMatchObject({ reason: 'Freebie dots are removed on Finishing touches.', step: 'finishing' });
  });

  test('lowering creation dots keeps the freebie dots', () => {
    const build = play(fresh(), rank('physical', 'primary'), creation('attribute:strength', 3), freebie('attribute:strength', 4));
    const lowered = play(build, creation('attribute:strength', 3));
    expect(lowered.traits['attribute:strength']).toEqual({ creation: 1, freebie: 1 });
    expect(remaining(lowered, 'physical')).toBe(remaining(build, 'physical') + 1);
    expect(freebiesRemaining(lowered)).toBe(10);
  });
});

describe('Disciplines', () => {
  test('wait for a clan', () => {
    const build = fresh();
    expect(refused(setRating(build, 'discipline:Celerity', 1, 'creation'), build)).toMatchObject({
      reason: 'Choose a clan on the Concept step before placing Discipline dots.',
      step: 'concept',
    });
  });

  test('take three creation dots on the clan Disciplines only', () => {
    let build = play(fresh(), clan('Brujah'), creation('discipline:Celerity', 2), creation('discipline:Potence', 1));
    expect(remaining(build, 'disciplines')).toBe(0);
    build = play(fresh(), clan('Brujah'), creation('discipline:Celerity', 3));
    expect(refused(setRating(build, 'discipline:Potence', 1, 'creation'), build).reason).toBe(
      'There are no Discipline dots remaining. More can be bought with freebie points on Finishing touches.',
    );
    build = play(fresh(), clan('Brujah'));
    refused(setRating(build, 'discipline:Auspex', 1, 'creation'), build);
  });

  test('lowering a clan Discipline to 0 removes its entry', () => {
    const build = play(fresh(), clan('Brujah'), creation('discipline:Celerity', 2), creation('discipline:Celerity', 0));
    expect(build.disciplines).toEqual([]);
  });

  test('a Caitiff adds any catalogue or write-in Discipline', () => {
    const build = play(
      fresh(),
      clan('Caitiff'),
      addCreationDiscipline('protean'),
      creation('discipline:Protean', 2),
      addCreationDiscipline('  Flight '),
      creation('discipline:Flight', 1),
    );
    expect(build.disciplines).toEqual([
      { name: 'Protean', writeIn: false, creation: 2, freebie: 0 },
      { name: 'Flight', writeIn: true, creation: 1, freebie: 0 },
    ]);
    expect(remaining(build, 'disciplines')).toBe(0);
  });

  test.each([
    ['', 'A Discipline needs a name.'],
    ['   ', 'A Discipline needs a name.'],
    ['protean', 'The build already has Protean.'],
    [' PROTEAN ', 'The build already has Protean.'],
  ])('a Discipline named %j is refused', (name, reason) => {
    const build = play(fresh(), clan('Caitiff'), addCreationDiscipline('Protean'));
    expect(refused(addDiscipline(build, name, 'creation'), build).reason).toBe(reason);
  });

  test('only a Caitiff adds Disciplines with creation dots', () => {
    const build = play(fresh(), clan('Brujah'));
    refused(addDiscipline(build, 'Auspex', 'creation'), build);
  });

  test('a Caitiff keeps an emptied row and can remove it', () => {
    let build = play(fresh(), clan('Caitiff'), addCreationDiscipline('Protean'), creation('discipline:Protean', 2), creation('discipline:Protean', 0));
    expect(build.disciplines).toHaveLength(1);
    build = appliedBuild(removeDiscipline(build, 'Protean'));
    expect(build.disciplines).toEqual([]);
  });
});

describe('clan changes', () => {
  const brujah = () => play(fresh(), clan('Brujah'), creation('discipline:Celerity', 2), creation('discipline:Potence', 1));

  test('to a clan lacking a Discipline removes its creation dots and says so', () => {
    const build = brujah();
    expect(clanChangeEffects(build, 'Toreador')).toEqual(['The Potence dot will be removed because Toreador does not have it.']);
    const result = setClan(build, 'Toreador');
    expect(result).toMatchObject({ status: 'applied', notices: ['The Potence dot was removed because Toreador does not have it.'] });
    expect(rating(result.build, 'discipline:Celerity')).toBe(2);
    expect(remaining(result.build, 'disciplines')).toBe(1);
  });

  test('that removes nothing has no effects', () => {
    const build = play(fresh(), clan('Brujah'), creation('discipline:Celerity', 2));
    expect(clanChangeEffects(build, 'Toreador')).toEqual([]);
    expect(setClan(build, 'Toreador')).toMatchObject({ status: 'applied', notices: [] });
  });

  test('to Caitiff keeps every Discipline', () => {
    const build = play(brujah(), clan('Caitiff'));
    expect(rating(build, 'discipline:Celerity')).toBe(2);
    expect(rating(build, 'discipline:Potence')).toBe(1);
  });

  test('from Caitiff names every Discipline it removes', () => {
    const build = play(
      fresh(),
      clan('Caitiff'),
      addCreationDiscipline('Protean'),
      creation('discipline:Protean', 2),
      addCreationDiscipline('Flight'),
      creation('discipline:Flight', 1),
    );
    const result = setClan(build, 'Brujah');
    expect(result).toMatchObject({ notices: ['The Protean and Flight dots were removed because Brujah does not have them.'] });
    expect(remaining(result.build, 'disciplines')).toBe(3);
    expect(result.build.disciplines).toEqual([]);
  });

  test('keeps Discipline dots bought with freebie points', () => {
    const build = play(brujah(), freebie('discipline:Potence', 2));
    const after = appliedBuild(setClan(build, 'Toreador'));
    expect(after.disciplines.find((entry) => entry.name === 'Potence')).toEqual({ name: 'Potence', writeIn: false, creation: 0, freebie: 1 });
  });

  test('to Nosferatu returns Appearance creation dots and refunds its freebie dots', () => {
    const build = play(fresh(), clan('Toreador'), rank('social', 'primary'), creation('attribute:appearance', 4));
    expect(clanChangeEffects(build, 'Nosferatu')).toEqual(['Appearance will be set to 0 and 3 dots returned to Social.']);
    const result = setClan(build, 'Nosferatu');
    expect(result).toMatchObject({ notices: ['Appearance was set to 0 and 3 dots were returned to Social.'] });
    expect(remaining(result.build, 'social')).toBe(7);

    const bought = play(fresh(), clan('Toreador'), freebie('attribute:appearance', 2));
    expect(setClan(bought, 'Nosferatu')).toMatchObject({ notices: ['Appearance was set to 0 and 5 freebie points were refunded.'] });
    expect(freebiesRemaining(appliedBuild(setClan(bought, 'Nosferatu')))).toBe(15);
  });

  test('from Nosferatu has no effects and restores the free dot', () => {
    const build = play(fresh(), clan('Nosferatu'));
    expect(clanChangeEffects(build, 'Brujah')).toEqual([]);
    expect(rating(play(build, clan('Brujah')), 'attribute:appearance')).toBe(1);
  });

  test('a Nosferatu cannot put dots of any kind on Appearance', () => {
    const build = play(fresh(), clan('Nosferatu'), rank('social', 'primary'));
    expect(refused(setRating(build, 'attribute:appearance', 1, 'creation'), build).reason).toBe('Appearance is fixed at 0 for Nosferatu.');
    refused(setRating(build, 'attribute:appearance', 1, 'freebie'), build);
  });
});

describe('Generation', () => {
  test('dots improve the effective generation and say so', () => {
    const build = play(fresh(), generation(11));
    const result = setRating(build, 'background:Generation', 2, 'creation');
    expect(result).toMatchObject({ status: 'applied', notices: ['The effective generation is now 9th, with a blood pool maximum of 14.'] });
    expect(effectiveGeneration(result.build)).toBe(9);
    expect(limits(result.build).bloodPerTurn).toBe(2);
  });

  test.each([
    [6, 2, 3],
    [5, 1, 2],
    [4, 0, 1],
  ])('at base %ith, %i dots are allowed and %i is refused', (base, allowed, refusedDots) => {
    const build = play(fresh(), generation(base), ...(allowed > 0 ? [creation('background:Generation', allowed)] : []));
    expect(effectiveGeneration(build)).toBe(4);
    expect(refused(setRating(build, 'background:Generation', refusedDots, 'creation'), build).reason).toBe(
      'The effective generation cannot be better than 4th.',
    );
  });

  test('freebie Generation dots cannot pass 4th either', () => {
    const build = play(fresh(), generation(5), extra(100), creation('background:Generation', 1));
    refused(setRating(build, 'background:Generation', 2, 'freebie'), build);
  });

  test('the Generation background stops at 5 while other traits go higher', () => {
    const build = play(fresh(), generation(11), extra(100), creation('background:Generation', 5));
    expect(effectiveGeneration(build)).toBe(6);
    expect(maximumFor(build, 'background:Generation')).toBe(5);
    expect(maximumFor(build, 'background:Resources')).toBe(7);
  });

  test('removing Generation dots is refused while a trait depends on them', () => {
    const build = play(fresh(), generation(8), creation('background:Generation', 1), rank('physical', 'primary'), creation('attribute:strength', 6));
    expect(refused(setRating(build, 'background:Generation', 0, 'creation'), build)).toMatchObject({
      reason: 'Lower Strength to 5 first.',
      step: 'attributes',
    });
  });

  test('a less potent base generation is refused while a trait depends on it', () => {
    const build = play(fresh(), generation(7), rank('physical', 'primary'), creation('attribute:strength', 6));
    expect(refused(setBaseGeneration(build, 8), build)).toMatchObject({ reason: 'Lower Strength to 5 first.', step: 'attributes' });
  });

  test('a more potent base generation is refused when Generation dots would pass 4th', () => {
    const build = play(fresh(), generation(6), creation('background:Generation', 2));
    expect(refused(setBaseGeneration(build, 5), build)).toMatchObject({
      reason: 'Lower the Generation background to 1 first.',
      step: 'advantages',
    });
  });

  test('settings can change when nothing is invalidated', () => {
    const build = play(fresh(), rank('physical', 'primary'), creation('attribute:strength', 4), creation('background:Resources', 3), generation(10), extra(30));
    expect(rating(build, 'attribute:strength')).toBe(4);
  });
});

describe('freebie points', () => {
  test.each<[BuildTraitRef, number]>([
    ['attribute:strength', 10],
    ['ability:brawl', 13],
    ['discipline:Celerity', 8],
    ['background:Resources', 14],
    ['virtue:courage', 13],
    ['humanity', 13],
    ['willpower', 14],
  ])('one dot of %s leaves %i of 15', (ref, left) => {
    const build = completeBrujah();
    const bought = play(build, freebie(ref, rating(build, ref) + 1));
    expect(freebiesRemaining(bought)).toBe(left);
  });

  test('an unaffordable purchase is refused with its cost and what remains', () => {
    const build = play(completeBrujah(), freebie('ability:brawl', 5));
    expect(freebiesRemaining(build)).toBe(9);
    const poorer = play(build, freebie('willpower', 6));
    expect(refused(setRating(poorer, 'discipline:Celerity', 2, 'freebie'), poorer).reason).toBe(
      'A Discipline dot costs 7 freebie points and only 6 remain.',
    );
    const exact = play(build, freebie('willpower', 5));
    expect(freebiesRemaining(play(exact, freebie('discipline:Celerity', 2)))).toBe(0);
  });

  test('several dots at once are costed together', () => {
    const build = fresh();
    expect(refused(setRating(build, 'attribute:strength', 5, 'freebie'), build).reason).toBe(
      '4 Attribute dots cost 20 freebie points and only 15 remain.',
    );
    expect(freebiesRemaining(play(build, freebie('attribute:strength', 4)))).toBe(0);
  });

  test('removing a freebie dot refunds it', () => {
    const build = play(fresh(), freebie('attribute:strength', 2), freebie('attribute:strength', 1));
    expect(freebiesRemaining(build)).toBe(15);
  });

  test('cannot remove creation or free dots', () => {
    const build = play(fresh(), rank('physical', 'primary'), creation('attribute:strength', 3));
    expect(refused(setRating(build, 'attribute:strength', 2, 'freebie'), build)).toMatchObject({
      reason: 'Creation dots are changed on the Attributes step.',
      step: 'attributes',
    });
    expect(refused(setRating(build, 'attribute:stamina', 0, 'freebie'), build).reason).toBe('Stamina cannot go below 1.');
  });

  test('can be spent in an unranked group and take an Ability above 3', () => {
    expect(rating(play(fresh(), freebie('attribute:strength', 2)), 'attribute:strength')).toBe(2);
    const build = play(fresh(), rank('talents', 'primary'), creation('ability:brawl', 3), freebie('ability:brawl', 4));
    expect(rating(build, 'ability:brawl')).toBe(4);
  });

  test('reach the generation maximum and no further', () => {
    const build = play(fresh(), generation(7), extra(100), creation('background:Resources', 5), freebie('background:Resources', 6));
    expect(rating(build, 'background:Resources')).toBe(6);
    refused(setRating(build, 'background:Resources', 7, 'freebie'), build);
  });

  test('buy a Discipline outside the clan or a write-in, and dropping it frees its place', () => {
    let build = play(completeBrujah(), buyDiscipline('Auspex'));
    expect(rating(build, 'discipline:Auspex')).toBe(1);
    expect(freebiesRemaining(build)).toBe(8);
    build = play(build, freebie('discipline:Auspex', 0));
    expect(build.disciplines.some((entry) => entry.name === 'Auspex')).toBe(false);
    expect(freebiesRemaining(build)).toBe(15);
    expect(rating(play(completeBrujah(), buyDiscipline('Melpominee')), 'discipline:Melpominee')).toBe(1);
  });

  test('a bought Discipline cannot repeat one the build has', () => {
    const build = completeBrujah();
    expect(refused(addDiscipline(build, 'celerity ', 'freebie'), build).reason).toBe('The build already has Celerity.');
  });

  test.each(['disciplines', 'backgrounds'])('a character holds at most six %s', (kind) => {
    const names =
      kind === 'disciplines'
        ? ['Auspex', 'Dominate', 'Fortitude', 'Obfuscate', 'Protean', 'Quietus', 'Serpentis']
        : ['Allies', 'Contacts', 'Domain', 'Fame', 'Herd', 'Influence', 'Mentor'];
    let build = play(fresh(), extra(100));
    const buy = (name: string): Step =>
      kind === 'disciplines' ? buyDiscipline(name) : freebie(`background:${name}` as BuildTraitRef, 1);
    build = play(build, ...names.slice(0, 6).map(buy));
    const before = freebiesRemaining(build);
    const result = refused(buy(names[6])(build), build);
    expect(result.reason).toBe(`A character holds at most six ${kind === 'disciplines' ? 'Disciplines' : 'Backgrounds'}.`);
    expect(freebiesRemaining(build)).toBe(before);
  });

  test('Humanity and Willpower stop at 10', () => {
    const build = play(fresh(), extra(100), creation('virtue:conscience', 5), creation('virtue:selfControl', 4), freebie('humanity', 10));
    expect(maximumFor(build, 'humanity')).toBe(10);
    refused(setRating(build, 'humanity', 11, 'freebie'), build);
    const will = play(fresh(), extra(100), creation('virtue:courage', 5), freebie('willpower', 10));
    refused(setRating(will, 'willpower', 11, 'freebie'), will);
  });

  test('a Virtue raise that would push Humanity above 10 is refused', () => {
    const build = play(fresh(), creation('virtue:conscience', 5), creation('virtue:selfControl', 3), freebie('humanity', 10));
    expect(refused(setRating(build, 'virtue:selfControl', 4, 'creation'), build)).toMatchObject({
      reason: 'Remove a freebie dot of Humanity first.',
      step: 'finishing',
    });
  });

  test('a Virtue raise that would push Willpower above 10 is refused', () => {
    const build = play(fresh(), extra(100), creation('virtue:courage', 4), freebie('willpower', 10));
    refused(setRating(build, 'virtue:courage', 5, 'creation'), build);
  });

  test('extra freebie points cannot be cut below what is spent', () => {
    const build = play(fresh(), extra(75), freebie('attribute:strength', 5), freebie('attribute:dexterity', 5));
    expect(freebiesSpent(build)).toBe(40);
    expect(refused(setExtraFreebies(build, '20'), build)).toMatchObject({
      reason: '40 freebie points are spent, so at least 5 points of purchases must be removed first.',
      step: 'finishing',
    });
    expect(freebiesRemaining(play(build, extra(25)))).toBe(0);
  });
});

describe('blood pool', () => {
  test.each([
    [13, 10],
    [8, 15],
    [4, 50],
  ])('at %ith generation it runs from 0 to %i', (base, max) => {
    const build = play(fresh(), generation(base));
    expect(appliedBuild(setBloodPool(build, String(max))).bloodPool).toBe(max);
    expect(appliedBuild(setBloodPool(build, ' 0 ')).bloodPool).toBe(0);
    expect(refused(setBloodPool(build, String(max + 1)), build).reason).toBe(`The blood pool must be a whole number from 0 to ${max}.`);
  });

  test.each(['-1', '2.5', 'lots', ''])('refuses %j', (text) => {
    const build = fresh();
    refused(setBloodPool(build, text), build);
  });

  test('a generation change that would put it out of range is refused', () => {
    const build = appliedBuild(setBloodPool(play(fresh(), generation(8)), '15'));
    expect(refused(setBaseGeneration(build, 13), build)).toMatchObject({
      reason: 'Lower the starting blood pool to 10 first.',
      step: 'finishing',
    });
  });
});

describe('violations of a stored build', () => {
  test('a trait above its maximum is reported', () => {
    const build = fresh();
    build.traits['attribute:strength'] = { creation: 5, freebie: 0 };
    expect(violations(build)).toEqual([{ message: 'Lower Strength to 5 first.', step: 'attributes' }]);
  });

  test('an update that keeps an existing violation is not refused for it', () => {
    const build = fresh();
    build.traits['attribute:strength'] = { creation: 5, freebie: 0 };
    expect(setExtraFreebies(build, '5').status).toBe('applied');
  });
});

describe('outstanding', () => {
  test('a new build lists everything, in step order', () => {
    expect(outstanding(fresh())).toEqual([
      { step: 'concept', message: 'Choose a clan' },
      { step: 'attributes', message: 'Rank the Attribute groups' },
      { step: 'abilities', message: 'Rank the Ability groups' },
      { step: 'advantages', message: 'Place 3 Discipline dots' },
      { step: 'advantages', message: 'Place 5 Background dots' },
      { step: 'advantages', message: 'Place 7 Virtue dots' },
    ]);
  });

  test.each(['Brujah', 'Nosferatu', 'Caitiff', 'Ventrue', 'Tremere'])('a complete %s build has nothing outstanding', (name) => {
    expect(outstanding(completeBuild(name))).toEqual([]);
  });

  test('a complete build has nothing outstanding', () => {
    expect(outstanding(completeBrujah())).toEqual([]);
    expect(unspentFreebies(completeBrujah())).toBe(15);
  });

  test.each<[string, Step, string, string]>([
    ['Mental', creation('attribute:wits', 1), 'attributes', 'Place 1 Mental dot'],
    ['Knowledges', creation('ability:computer', 1), 'abilities', 'Place 1 Knowledges dot'],
    ['Discipline', creation('discipline:Presence', 0), 'advantages', 'Place 1 Discipline dot'],
    ['Background', creation('background:Resources', 0), 'advantages', 'Place 1 Background dot'],
    ['Virtue', creation('virtue:courage', 2), 'advantages', 'Place 1 Virtue dot'],
  ])('one unplaced %s dot', (_name, step, where, message) => {
    expect(outstanding(play(completeBrujah(), step))).toEqual([{ step: where, message }]);
  });

  test('an overspent group is listed with what to lower', () => {
    const build = play(completeBrujah(), rank('physical', 'tertiary'));
    expect(outstanding(build)).toEqual([
      { step: 'attributes', message: 'Lower Physical traits by 4 dots' },
      { step: 'attributes', message: 'Place 4 Mental dots' },
    ]);
  });

  test('a stored violation is listed for its step', () => {
    const build = completeBrujah();
    build.traits['attribute:strength'] = { creation: 5, freebie: 0 };
    expect(outstanding(build)).toContainEqual({ step: 'attributes', message: 'Lower Strength to 5 first.' });
  });
});

describe('report', () => {
  test('carries provenance in the value text', () => {
    const build = play(fresh(), rank('physical', 'primary'), creation('attribute:strength', 3), freebie('attribute:strength', 4));
    expect(report(build).traits['attribute:strength']).toMatchObject({
      rating: 4,
      floor: 1,
      max: 5,
      valueText: '4 of 5: 3 from creation, 1 from freebie points',
    });
    expect(report(play(fresh(), clan('Nosferatu'))).traits['attribute:appearance']).toMatchObject({
      rating: 0,
      locked: true,
      valueText: '0, fixed for Nosferatu',
    });
  });

  test('describes each allotment', () => {
    const build = play(fresh(), rank('physical', 'primary'), creation('attribute:strength', 3));
    const { allotments } = report(build);
    expect(allotments.physical.status).toBe('5 dots remaining');
    expect(allotments.social.status).toBe('Rank this group to place dots');
    const overspent = play(build, creation('attribute:dexterity', 4), rank('physical', 'tertiary'));
    expect(report(overspent).allotments.physical.status).toBe('Overspent by 2 — lower Physical traits by 2');
  });
});
