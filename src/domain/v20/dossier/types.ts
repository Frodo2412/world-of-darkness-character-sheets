// The stored shapes behind the Backgrounds tab. Every field is additive: a
// record saved without it reads as that field's blank default.

import type { NamedRating } from '../namedRating';

export const MERIT_CATEGORIES = ['Physical', 'Mental', 'Social', 'Supernatural'] as const;
export type MeritCategory = (typeof MERIT_CATEGORIES)[number];

export const HAVEN_KINDS = ['Primary', 'Secondary', 'Other'] as const;
export type HavenKind = (typeof HAVEN_KINDS)[number];

/** A named person attached to a background, with the role they play for the character. */
export interface Person {
  name: string;
  role: string;
}

/** A background row. The details live on the row so reordering or removing it cannot detach them. */
export interface BackgroundRow extends NamedRating {
  summary?: string;
  note?: string;
  people?: Person[];
}

export interface Merit {
  name: string;
  category: MeritCategory;
  points: number;
  note: string;
}

/** A Flaw has the same shape as a Merit; its points are what it is worth, not a cost. */
export type Flaw = Merit;

export interface OtherTrait {
  name: string;
  rating?: number;
  kind: string;
  note: string;
}

export interface Haven {
  name: string;
  kind: HavenKind;
  description: string;
  location: string;
  access: string;
  security: string;
}
