import { describe, expect, it } from 'vitest';
import type { TraitReport } from '../../../domain/v20/creation/progress';
import { stepperView } from './ratingStepper';

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
    expect(stepperView(trait(), settings, 'Brujah')).toEqual({ dots: 5, canLower: true, canRaise: true, limit: null });
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
    expect(view).toEqual({ dots: 5, canLower: false, canRaise: false, limit: 'Fixed for Nosferatu' });
  });

  it('cannot lower a rating when its floor is 0 and it is 0', () => {
    expect(stepperView(trait({ rating: 0, floor: 0 }), settings, 'Brujah').canLower).toBe(false);
  });
});
