import type { HealthTrack } from '../../components/controls/health-track';
import type { RatingControl } from '../../components/controls/rating-control';
import type { V20Character } from '../../domain/v20/character';
import { diceLabel } from '../../domain/v20/identity';
import {
  bloodPerTurn,
  resourceReading,
  woundState,
  type Resource,
  type ResourceReading,
  type WoundState,
} from '../../domain/v20/resources';
import { MINUS_SIGN, lookup, lookupAll, setAttr, show, showBlock, showOptional } from './draw';

/** More segments than this and a pool is drawn as one proportional bar. */
export const BLOOD_SEGMENT_LIMIT = 20;

export type TrackerForm = 'segments' | 'bar';

/** How a pool of this size is drawn: a segment each while there are few, else one bar. */
export const trackerForm = (maximum: number): TrackerForm => (maximum <= BLOOD_SEGMENT_LIMIT ? 'segments' : 'bar');

const NAMES: Record<Resource, string> = { blood: 'Blood Pool', willpower: 'Willpower' };

/** What a stepper press says to assistive technology, e.g. "Blood Pool 7 of 13". */
function announcement(character: V20Character, resource: Resource): string {
  const { current, maximum } = resourceReading(character, resource);
  return `${NAMES[resource]} ${current} of ${maximum}`;
}

/** Writes a resource card's live region. Only a stepper press calls this: redraws stay silent. */
export function announce(root: ParentNode, character: V20Character, resource: Resource): void {
  lookup(root, `[data-live="${resource}"]`).textContent = announcement(character, resource);
}

/** A stepper at its bound stays focusable and says so; its button is never replaced. */
function drawStepper(root: ParentNode, resource: Resource, { current, maximum, canSpend, canGain, over }: ResourceReading): void {
  for (const button of lookupAll<HTMLButtonElement>(root, `[data-resource="${resource}"][data-step]`)) {
    const available = Number(button.dataset.step) < 0 ? canSpend : canGain;
    if (available) button.removeAttribute('aria-disabled');
    else setAttr(button, 'aria-disabled', 'true');
  }
  show(root, `${resource}.total`, `${current} / ${maximum}`);
  showBlock(root, `${resource}.over`, over);
}

// A tracker holds only its own segments (or its one bar), so its children are what is drawn.
function drawSegments(tracker: HTMLElement, { current, maximum }: ResourceReading): void {
  if (tracker.dataset.form !== 'segments' || tracker.children.length !== maximum) {
    tracker.dataset.form = 'segments';
    tracker.replaceChildren(
      ...Array.from({ length: maximum }, () => {
        const segment = document.createElement('span');
        segment.className = 'blood-segment';
        return segment;
      }),
    );
  }
  [...tracker.children].forEach((segment, index) => {
    segment.classList.toggle('is-filled', index < current);
  });
}

function drawBar(tracker: HTMLElement, { current, maximum }: ResourceReading): void {
  if (tracker.dataset.form !== 'bar') {
    tracker.dataset.form = 'bar';
    const bar = document.createElement('span');
    bar.className = 'blood-bar';
    const fill = document.createElement('span');
    fill.className = 'blood-bar-fill';
    bar.append(fill);
    tracker.replaceChildren(bar);
  }
  const fill = tracker.firstElementChild!.firstElementChild as HTMLElement;
  fill.style.inlineSize = `${Math.min(1, current / maximum) * 100}%`;
}

function drawBlood(root: ParentNode, character: V20Character): void {
  const reading = resourceReading(character, 'blood');
  const perTurn = bloodPerTurn(character);

  drawStepper(root, 'blood', reading);
  showOptional(root, 'blood.perTurn', perTurn === undefined ? '' : `${perTurn} blood / turn`);
  show(root, 'blood.assumed', `Generation not recognised · maximum assumed ${reading.maximum}`);
  showBlock(root, 'blood.assumed', reading.assumed);

  const tracker = lookup(root, '[data-blood-tracker]');
  if (trackerForm(reading.maximum) === 'segments') drawSegments(tracker, reading);
  else drawBar(tracker, reading);
}

function drawWillpower(root: ParentNode, character: V20Character): void {
  const reading = resourceReading(character, 'willpower');
  drawStepper(root, 'willpower', reading);

  const dots = lookup<RatingControl>(root, '[data-willpower-dots]');
  // With no permanent Willpower there is nothing to draw: the "0 / 0" total says it.
  dots.hidden = reading.maximum === 0;
  setAttr(dots, 'max', String(reading.maximum));
  setAttr(dots, 'value', String(reading.current));
}

/** The wound beside the Health heading, e.g. "Hurt · −1 die"; nothing when unwounded. */
function woundReadout(wound: WoundState): string {
  if (wound === undefined) return '';
  if (wound === 'incapacitated') return 'Incapacitated';
  return `${wound.label} · ${MINUS_SIGN}${diceLabel(wound.penalty)}`;
}

/** What changing a health box says to assistive technology, e.g. "Wounded, minus 2 dice". */
function woundAnnouncement(wound: WoundState): string {
  if (wound === undefined) return 'No wound penalty';
  if (wound === 'incapacitated') return 'Incapacitated';
  return `${wound.label}, minus ${diceLabel(wound.penalty)}`;
}

/** What a change to a health box says, or nothing when the wound it announces is the one it already did. */
export function woundChange(before: V20Character, after: V20Character): string | undefined {
  const text = woundAnnouncement(woundState(after));
  return text === woundAnnouncement(woundState(before)) ? undefined : text;
}

/** Writes the Health card's live region. Only a change to a health box calls this: redraws stay silent. */
export function announceWound(root: ParentNode, before: V20Character, after: V20Character): void {
  const text = woundChange(before, after);
  if (text !== undefined) lookup(root, '[data-live="health"]').textContent = text;
}

function drawHealth(root: ParentNode, character: V20Character): void {
  lookup<HealthTrack>(root, 'health-track').damage = character.health;
  showOptional(root, 'health.wound', woundReadout(woundState(character)));
}

function drawHumanity(root: ParentNode, character: V20Character): void {
  const { rating, pathName } = character.humanity;
  show(root, 'humanity.number', String(rating));
  setAttr(lookup<RatingControl>(root, '[data-humanity-dots]'), 'value', String(rating));
  showOptional(root, 'humanity.path', pathName.trim());
}

/** Draws the four live-resource cards from the character; the same in play and edit mode. */
export function drawResourceCards(root: ParentNode, character: V20Character): void {
  drawBlood(root, character);
  drawWillpower(root, character);
  drawHealth(root, character);
  drawHumanity(root, character);
}
