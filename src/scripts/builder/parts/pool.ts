// A pool card's parts, drawn from a view: the meter, the words beside it and the status region that says what
// a press changed. The ranked groups of Attributes and Abilities and the cards of Advantages share them.

import type { Callout, PoolView, Segment } from '../../../domain/v20/creation/poolViews';
import { showReadout } from '../messages';

/** The part of `scope` marked `data-<name>`. */
export const part = <T extends HTMLElement>(scope: ParentNode, name: string): T => scope.querySelector<T>(`[data-${name}]`)!;

/** Keeps the meter's segments in step with the pool, adding or dropping only the ones that differ. */
function drawMeter(meter: HTMLElement, segments: Segment[]): void {
  while (meter.childElementCount < segments.length) {
    const segment = document.createElement('span');
    segment.className = 'builder-meter-segment';
    meter.append(segment);
  }
  while (meter.childElementCount > segments.length) meter.lastElementChild!.remove();
  segments.forEach((state, index) => {
    const segment = meter.children[index];
    if (segment.getAttribute('data-segment') !== state) segment.setAttribute('data-segment', state);
    segment.toggleAttribute('data-filled', state === 'placed');
  });
}

/** Draws a pool in `card`: its state, meter, remaining and spent words, and the status `status` says. */
export function drawPool(card: ParentNode, pool: PoolView, status: string): void {
  part(card, 'pool').dataset.state = pool.state;
  drawMeter(part(card, 'pool-meter'), pool.segments);
  showReadout(part(card, 'pool-remaining'), pool.remainingText);
  showReadout(part(card, 'pool-spent'), pool.spentText);
  showReadout(part(card, 'pool-status'), status);
}

/** Shows the callout of a pool not fully placed, or hides it. */
export function drawCallout(card: ParentNode, callout: Callout | null): void {
  const box = part(card, 'callout');
  box.hidden = callout === null;
  if (callout === null) return;
  showReadout(part(box, 'callout-heading'), callout.heading);
  showReadout(part(box, 'callout-summary'), callout.summary);
  const traits = part(box, 'callout-traits');
  showReadout(traits, callout.traitsText);
  traits.hidden = callout.traitsText === '';
}

/** A press on a row's plus or minus, remembered from the click until the draw it causes. */
export interface Press {
  group: string;
  /** What the group's status would have said just before the press. */
  before: string;
}

/**
 * What a group's status region holds after a draw. Only the group a press changed says its pool: the same
 * words, once. A press the build refused changes nothing, so what the region held stays. Any other change (a
 * re-rank, a change elsewhere) leaves the region empty rather than stale, and an emptied region is not read out.
 */
export function statusAfter(press: Press | null, group: string, announcement: string, shown: string): string {
  if (press?.group !== group) return '';
  return announcement === press.before ? shown : announcement;
}
