import { describe, expect, it } from 'vitest';
import type { TraitReport } from '../../../domain/v20/creation/progress';
import { stepperView, type RowOverride } from './ratingStepper';

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

describe('stepperView', () => {
  it('lets a rating between its floor and maximum go either way, with nothing to explain', () => {
    expect(stepperView(trait(), settings, 'Brujah')).toEqual({ dots: 5, canLower: true, canRaise: true, limit: null, lowerReason: null });
  });

  it('cannot lower a rating at its floor, and still lets it rise', () => {
    const view = stepperView(trait({ rating: 1 }), settings, 'Brujah');
    expect(view).toMatchObject({ canLower: false, canRaise: true, limit: null });
  });

  it('cannot raise a rating at its maximum, and says "Maximum N" for the plus', () => {
    const view = stepperView(trait({ rating: 5 }), settings, 'Brujah');
    expect(view).toMatchObject({ canLower: true, canRaise: false, limit: 'Maximum 5' });
  });

  it('names the maximum of a higher generation', () => {
    expect(stepperView(trait({ rating: 10, max: 10 }), { maxTrait: 10 }, 'Brujah')).toMatchObject({ dots: 10, limit: 'Maximum 10' });
  });

  it('keeps both buttons unavailable on a locked trait and draws it to the generation scale', () => {
    const view = stepperView(trait({ rating: 0, floor: 0, max: 0, locked: true }), settings, 'Nosferatu');
    expect(view).toEqual({ dots: 5, canLower: false, canRaise: false, limit: 'Fixed for Nosferatu', lowerReason: 'Fixed for Nosferatu' });
  });

  it('cannot lower a rating when its floor is 0 and it is 0', () => {
    expect(stepperView(trait({ rating: 0, floor: 0 }), settings, 'Brujah').canLower).toBe(false);
  });

  it('names the free dot that holds an Attribute or Virtue at its floor', () => {
    expect(stepperView(trait({ rating: 1 }), settings, 'Brujah').lowerReason).toBe('Minimum 1, free dot');
    const virtue = trait({ ref: 'virtue:courage', label: 'Courage', rating: 1 });
    expect(stepperView(virtue, settings, 'Brujah').lowerReason).toBe('Minimum 1, free dot');
  });

  it('names the Virtues as what holds Humanity and Willpower at their floor', () => {
    const humanity = trait({ ref: 'humanity', label: 'Humanity', rating: 4, floor: 4 });
    expect(stepperView(humanity, settings, 'Brujah').lowerReason).toBe('Minimum 4, from Virtues');
    const willpower = trait({ ref: 'willpower', label: 'Willpower', rating: 2, floor: 2 });
    expect(stepperView(willpower, settings, 'Brujah').lowerReason).toBe('Minimum 2, from Virtues');
  });

  it('says the minimum of a trait with no free dots plainly', () => {
    expect(stepperView(trait({ rating: 0, floor: 0 }), settings, 'Brujah').lowerReason).toBe('Minimum 0');
  });

  it('gives a lowerable rating no reason', () => {
    expect(stepperView(trait({ rating: 3 }), settings, 'Brujah').lowerReason).toBeNull();
  });
});

describe('stepperView with a screen\'s row', () => {
  const row = (overrides: Partial<RowOverride> = {}): RowOverride => ({
    max: 5,
    canRaise: true,
    limit: null,
    canLower: true,
    lowerLimit: null,
    ...overrides,
  });

  it('shows the row as given, not what the trait alone would allow', () => {
    // The trait could rise (3 of 5), but the group has no dots left: the screen said so.
    const view = stepperView(trait(), settings, 'Brujah', row({ canRaise: false, limit: 'No dots left in Physical' }));
    expect(view).toEqual({ dots: 5, canLower: true, canRaise: false, limit: 'No dots left in Physical', lowerReason: null });
  });

  it('gives the minus the row\'s own reason', () => {
    const view = stepperView(trait({ rating: 1 }), settings, 'Brujah', row({ canLower: false, lowerLimit: 'Minimum 1, free dot' }));
    expect(view).toMatchObject({ canLower: false, lowerReason: 'Minimum 1, free dot' });
  });

  it('draws as many dots as the row\'s top, not the trait\'s', () => {
    expect(stepperView(trait({ rating: 2, max: 5 }), settings, 'Brujah', row({ max: 3 })).dots).toBe(3);
  });

  it('still shows the dots of a rating above the row\'s top, as freebie dots make', () => {
    expect(stepperView(trait({ rating: 4, max: 5 }), settings, 'Brujah', row({ max: 3, canRaise: false, limit: 'Maximum 3' })).dots).toBe(4);
  });

  it('keeps a locked trait drawn to the generation\'s scale', () => {
    const locked = trait({ rating: 0, floor: 0, max: 0, locked: true });
    const view = stepperView(locked, settings, 'Nosferatu', row({ max: 0, canRaise: false, limit: 'Fixed for Nosferatu', canLower: false, lowerLimit: 'Fixed for Nosferatu' }));
    expect(view).toEqual({ dots: 5, canLower: false, canRaise: false, limit: 'Fixed for Nosferatu', lowerReason: 'Fixed for Nosferatu' });
  });
});
