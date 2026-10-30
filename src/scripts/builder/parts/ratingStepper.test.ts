import { describe, expect, it } from 'vitest';
import type { TraitReport } from '../../../domain/v20/creation/progress';
import { freebieLimitsOf } from '../../../domain/v20/creation/poolViews';
import { stepperFor, stepperView, type RowOverride } from './ratingStepper';

const trait = (overrides: Partial<TraitReport> = {}): TraitReport => ({
  ref: 'attribute:strength',
  label: 'Strength',
  rating: 3,
  creationRating: 2,
  freebieDots: 0,
  max: 5,
  floor: 1,
  locked: false,
  valueText: '3 of 5',
  ...overrides,
});

const settings = { maxTrait: 5 };

/** What the page-wide draw shows for a trait no screen owns: the domain's limits for it, through the stepper. */
const freebieView = (t: TraitReport, s: { maxTrait: number }, clan: string) => stepperView(t, s, freebieLimitsOf(t, clan));

describe('stepperView', () => {
  it('lets a rating between its floor and maximum go either way, with nothing to explain', () => {
    expect(freebieView(trait(), settings, 'Brujah')).toEqual({
      dots: 5,
      min: 1,
      max: 5,
      canLower: true,
      canRaise: true,
      limit: null,
      lowerReason: null,
      lowerShown: false,
    });
  });

  it('cannot lower a rating at its floor, and still lets it rise', () => {
    const view = freebieView(trait({ rating: 1 }), settings, 'Brujah');
    expect(view).toMatchObject({ canLower: false, canRaise: true, limit: null });
  });

  it('cannot raise a rating at its maximum, and says "Maximum N" for the plus', () => {
    const view = freebieView(trait({ rating: 5 }), settings, 'Brujah');
    expect(view).toMatchObject({ canLower: true, canRaise: false, limit: 'Maximum 5' });
  });

  it('names the maximum of a higher generation', () => {
    expect(freebieView(trait({ rating: 10, max: 10 }), { maxTrait: 10 }, 'Brujah')).toMatchObject({ dots: 10, limit: 'Maximum 10' });
  });

  it('keeps both buttons unavailable on a locked trait and draws it to the generation scale', () => {
    const view = freebieView(trait({ rating: 0, floor: 0, max: 0, locked: true }), settings, 'Nosferatu');
    expect(view).toEqual({
      dots: 5,
      min: 0,
      max: 0,
      canLower: false,
      canRaise: false,
      limit: 'Fixed for Nosferatu',
      lowerReason: 'Fixed for Nosferatu',
      lowerShown: false,
    });
  });

  it('cannot lower a rating when its floor is 0 and it is 0', () => {
    expect(freebieView(trait({ rating: 0, floor: 0 }), settings, 'Brujah').canLower).toBe(false);
  });

  it('names the free dot that holds an Attribute or Virtue at its floor', () => {
    expect(freebieView(trait({ rating: 1 }), settings, 'Brujah').lowerReason).toBe('Minimum 1, free dot');
    const virtue = trait({ ref: 'virtue:courage', label: 'Courage', rating: 1 });
    expect(freebieView(virtue, settings, 'Brujah').lowerReason).toBe('Minimum 1, free dot');
  });

  it('names the Virtues as what holds Humanity and Willpower at their floor', () => {
    const humanity = trait({ ref: 'humanity', label: 'Humanity', rating: 4, floor: 4 });
    expect(freebieView(humanity, settings, 'Brujah').lowerReason).toBe('Minimum 4, from Virtues');
    const willpower = trait({ ref: 'willpower', label: 'Willpower', rating: 2, floor: 2 });
    expect(freebieView(willpower, settings, 'Brujah').lowerReason).toBe('Minimum 2, from Virtues');
  });

  it('says the minimum of a trait with no free dots plainly', () => {
    expect(freebieView(trait({ rating: 0, floor: 0 }), settings, 'Brujah').lowerReason).toBe('Minimum 0');
  });

  it('gives a lowerable rating no reason', () => {
    expect(freebieView(trait({ rating: 3 }), settings, 'Brujah')).toMatchObject({ lowerReason: null, lowerShown: false });
  });

  it('shows the minus its reason beside it, as the plus is shown its own', () => {
    expect(freebieView(trait({ rating: 1 }), settings, 'Brujah')).toMatchObject({ lowerReason: 'Minimum 1, free dot', lowerShown: true });
    const both = freebieView(trait({ rating: 5, floor: 5 }), settings, 'Brujah');
    expect(both).toMatchObject({ limit: 'Maximum 5', lowerReason: 'Minimum 5, free dots', lowerShown: true });
  });

  it('shows a reason both buttons share once, and still describes both buttons with it', () => {
    const view = freebieView(trait({ rating: 0, floor: 0, max: 0, locked: true }), settings, 'Nosferatu');
    expect(view).toMatchObject({ limit: 'Fixed for Nosferatu', lowerReason: 'Fixed for Nosferatu', lowerShown: false });
  });
});

describe('stepperView with a screen\'s row', () => {
  const row = (overrides: Partial<RowOverride> = {}): RowOverride => ({
    max: 5,
    min: 1,
    canRaise: true,
    limit: null,
    canLower: true,
    lowerLimit: null,
    ...overrides,
  });

  it('shows the row as given, not what the trait alone would allow', () => {
    // The trait could rise (3 of 5), but the group has no dots left: the screen said so.
    const view = stepperView(trait(), settings, row({ canRaise: false, limit: 'No dots left in Physical' }));
    expect(view).toEqual({
      dots: 5,
      min: 1,
      max: 5,
      canLower: true,
      canRaise: false,
      limit: 'No dots left in Physical',
      lowerReason: null,
      lowerShown: false,
    });
  });

  it('gives the minus the row\'s own reason', () => {
    const view = stepperView(trait({ rating: 1 }), settings, row({ canLower: false, lowerLimit: 'Minimum 1, free dot' }));
    expect(view).toMatchObject({ canLower: false, lowerReason: 'Minimum 1, free dot', lowerShown: true });
  });

  it('reports the row\'s own floor and top, not the trait\'s: freebie dots raise a row\'s floor above the free dots', () => {
    // The trait's floor is its free dots (1); the row's is what creation dots can reach (2, with a freebie dot held).
    const view = stepperView(trait({ rating: 2, floor: 1, max: 5 }), settings, row({ min: 2, max: 3 }));
    expect(view).toMatchObject({ min: 2, max: 3 });
  });

  it('draws as many dots as the row\'s top, not the trait\'s', () => {
    expect(stepperView(trait({ rating: 2, max: 5 }), settings, row({ max: 3 })).dots).toBe(3);
  });

  it('still shows the dots of a rating above the row\'s top, as freebie dots make', () => {
    expect(stepperView(trait({ rating: 4, max: 5 }), settings, row({ max: 3, canRaise: false, limit: 'Maximum 3' })).dots).toBe(4);
  });

  it('keeps a locked trait drawn to the generation\'s scale', () => {
    const locked = trait({ rating: 0, floor: 0, max: 0, locked: true });
    const view = stepperView(locked, settings, row({ min: 0, max: 0, canRaise: false, limit: 'Fixed for Nosferatu', canLower: false, lowerLimit: 'Fixed for Nosferatu' }));
    expect(view).toEqual({
      dots: 5,
      min: 0,
      max: 0,
      canLower: false,
      canRaise: false,
      limit: 'Fixed for Nosferatu',
      lowerReason: 'Fixed for Nosferatu',
      lowerShown: false,
    });
  });
});

describe('stepperFor', () => {
  /** A scope holding steppers for `refs`, as far as the lookup touches them. */
  const holding = (...refs: string[]) => {
    const steppers = refs.map((ref) => ({ dataset: { buildTrait: ref } }));
    return { steppers, scope: { querySelectorAll: () => steppers } as unknown as ParentNode };
  };

  it('finds the stepper of a trait', () => {
    const { steppers, scope } = holding('discipline:Auspex', 'discipline:Celerity');
    expect(stepperFor(scope, 'discipline:Celerity')).toBe(steppers[1]);
  });

  it.each([`discipline:Say "Hi"`, 'discipline:Back\\slash', `discipline:It's`, 'discipline:a]b', 'discipline:"\\"'])(
    'finds a written-in Discipline named %s, which no selector could be built from',
    (ref) => {
      const { steppers, scope } = holding('discipline:Auspex', ref);
      expect(stepperFor(scope, ref)).toBe(steppers[1]);
    },
  );

  it('finds nothing for a trait with no stepper', () => {
    expect(stepperFor(holding('discipline:Auspex').scope, 'discipline:Celerity')).toBeUndefined();
  });
});
