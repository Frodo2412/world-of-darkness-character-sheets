import type { RatingControl } from '../../components/controls/rating-control';
import type { V20Character } from '../../domain/v20/character';
import { bloodPoolMaximum } from '../../domain/v20/resources';
import { show, showBlock } from './draw';

export type Resource = 'blood' | 'willpower';

/** More segments than this and a pool is drawn as one proportional bar. */
const SEGMENT_LIMIT = 20;

const NAMES: Record<Resource, string> = { blood: 'Blood Pool', willpower: 'Willpower' };

interface Reading {
  current: number;
  /** The most it can be raised to: the generation's maximum, or permanent Willpower. */
  bound: number;
}

function readingOf(character: V20Character, resource: Resource): Reading {
  return resource === 'blood'
    ? { current: character.bloodPool.current, bound: bloodPoolMaximum(character).maximum }
    : { current: character.willpower.temporary, bound: character.willpower.permanent };
}

/** What a stepper press says to assistive technology, e.g. "Blood Pool 7 of 13". */
function announcement(character: V20Character, resource: Resource): string {
  const { current, bound } = readingOf(character, resource);
  return `${NAMES[resource]} ${current} of ${bound}`;
}

/** Writes a resource card's live region. Only a stepper press calls this: redraws stay silent. */
export function announce(root: ParentNode, character: V20Character, resource: Resource): void {
  root.querySelector<HTMLElement>(`[data-live="${resource}"]`)!.textContent = announcement(character, resource);
}

// Leave a matching attribute alone so a redraw does not restart what it drives.
function setAttr(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

/** A stepper at its bound stays focusable and says so; its button is never replaced. */
function drawStepper(root: ParentNode, resource: Resource, { current, bound }: Reading): void {
  const buttons = root.querySelectorAll<HTMLButtonElement>(`[data-resource="${resource}"][data-step]`);
  for (const button of buttons) {
    const spending = Number(button.dataset.step) < 0;
    const atBound = spending ? current <= 0 : current >= bound;
    if (atBound) setAttr(button, 'aria-disabled', 'true');
    else button.removeAttribute('aria-disabled');
  }
  show(root, `${resource}.total`, `${current} / ${bound}`);
  showBlock(root, `${resource}.over`, current > bound);
}

const segmentCount = (tracker: Element): number => tracker.querySelectorAll('.blood-segment').length;

function drawSegments(tracker: HTMLElement, { current, bound }: Reading): void {
  if (tracker.dataset.form !== 'segments' || segmentCount(tracker) !== bound) {
    tracker.dataset.form = 'segments';
    tracker.replaceChildren(
      ...Array.from({ length: bound }, () => {
        const segment = document.createElement('span');
        segment.className = 'blood-segment';
        return segment;
      }),
    );
  }
  tracker.querySelectorAll('.blood-segment').forEach((segment, index) => {
    segment.classList.toggle('is-filled', index < current);
  });
}

function drawBar(tracker: HTMLElement, { current, bound }: Reading): void {
  if (tracker.dataset.form !== 'bar') {
    tracker.dataset.form = 'bar';
    const bar = document.createElement('span');
    bar.className = 'blood-bar';
    const fill = document.createElement('span');
    fill.className = 'blood-bar-fill';
    bar.append(fill);
    tracker.replaceChildren(bar);
  }
  const share = Math.min(1, current / bound);
  tracker.querySelector<HTMLElement>('.blood-bar-fill')!.style.inlineSize = `${share * 100}%`;
}

function drawBlood(root: ParentNode, character: V20Character): void {
  const reading = readingOf(character, 'blood');
  const { assumed, maximum } = bloodPoolMaximum(character);
  const perTurn = character.bloodPool.perTurn.trim();

  drawStepper(root, 'blood', reading);
  show(root, 'blood.perTurn', `${perTurn} blood / turn`);
  showBlock(root, 'blood.perTurn', perTurn !== '');
  show(root, 'blood.assumed', `Generation not recognised · maximum assumed ${maximum}`);
  showBlock(root, 'blood.assumed', assumed);

  const tracker = root.querySelector<HTMLElement>('[data-blood-tracker]')!;
  if (reading.bound <= SEGMENT_LIMIT) drawSegments(tracker, reading);
  else drawBar(tracker, reading);
}

function drawWillpower(root: ParentNode, character: V20Character): void {
  const reading = readingOf(character, 'willpower');
  drawStepper(root, 'willpower', reading);

  const dots = root.querySelector<RatingControl>('[data-willpower-dots]')!;
  setAttr(dots, 'max', String(reading.bound));
  setAttr(dots, 'value', String(reading.current));
}

/** Draws the Blood Pool and Willpower cards from the character; the same in play and edit mode. */
export function drawResourceCards(root: ParentNode, character: V20Character): void {
  drawBlood(root, character);
  drawWillpower(root, character);
}
