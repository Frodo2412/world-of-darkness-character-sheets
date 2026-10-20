// What each of the builder's nine screens knows about the build: whether it is
// done, and what stops Continue. Everything is derived from the build alone, so
// there is no "visited" state to keep.

import { allotmentStates, type AllotmentState } from './allotments';
import type { V20Build } from './build';
import { outstanding } from './progress';
import { PHASES, SCREENS, type ScreenId } from './rules';
import { plural } from './wording';

/** The word the sidebar shows beside a screen. */
export type ScreenStatus = 'Done' | 'To do' | 'Optional';

/** The line above a screen's heading: its phase, numbered, as in "Phase 02 / Attributes". */
export function phaseEyebrow(screen: ScreenId): string {
  const { phase } = SCREENS.find((entry) => entry.id === screen)!;
  return `Phase ${String(PHASES.indexOf(phase) + 1).padStart(2, '0')} / ${phase}`;
}

const blank = (text: string): boolean => text.trim() === '';

/** A pool is placed when it has a rank (if it takes one) and no dots left over or missing. */
const isPlaced = (state: AllotmentState): boolean =>
  (state.kind === 'flat' || state.rank !== '') && state.remaining === 0;

const poolsOn = (build: V20Build, screen: ScreenId): AllotmentState[] =>
  allotmentStates(build).filter((state) => state.step === screen);

/** Whether the screen's own rule is met. The Character sheet is never complete: a finished build is no longer a build. */
export function isComplete(build: V20Build, screen: ScreenId): boolean {
  switch (screen) {
    case 'concept':
      return !blank(build.concept.name);
    case 'clan':
      return build.clan !== '';
    case 'natureDemeanor':
      return !blank(build.concept.nature) || !blank(build.concept.demeanor);
    case 'attributes':
    case 'abilities':
    case 'advantages':
      return poolsOn(build, screen).every(isPlaced);
    case 'finishing':
      return build.bloodPool !== null;
    case 'review':
      return outstanding(build).length === 0;
    case 'summary':
      return false;
  }
}

export function screenStatus(build: V20Build, screen: ScreenId): ScreenStatus {
  if (isComplete(build, screen)) return 'Done';
  return screen === 'natureDemeanor' ? 'Optional' : 'To do';
}

export function screenStatuses(build: V20Build): Record<ScreenId, ScreenStatus> {
  return Object.fromEntries(SCREENS.map(({ id }) => [id, screenStatus(build, id)])) as Record<ScreenId, ScreenStatus>;
}

/** Why Continue is disabled, and the screen that can put it right when it is not this one. */
export interface GateReason {
  text: string;
  goTo?: ScreenId;
}

/** "Physical", "Physical and Social", "Physical, Social and Mental". */
export const list = (items: string[]): string =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** A Skills group's dots are Skill dots; a Physical group's are Physical dots. */
export const dotNoun = (state: AllotmentState): string => (state.kind === 'ranked' ? state.label.replace(/s$/, '') : state.noun);

const overBy = (state: AllotmentState): string =>
  `${state.label} ${state.label.endsWith('s') ? 'are' : 'is'} ${plural(-state.remaining, 'dot')} over`;

/** What stops Continue on a pool screen: unranked groups, then overspent pools, then dots still to place. */
function poolReason(pools: AllotmentState[]): GateReason | undefined {
  const unranked = pools.filter((state) => state.kind === 'ranked' && state.rank === '');
  if (unranked.length > 0) return { text: `Rank ${list(unranked.map((state) => state.label))} to continue` };

  const over = pools.filter((state) => state.remaining < 0);
  if (over.length > 0) return { text: `${list(over.map(overBy))} · Lower ${over.length === 1 ? 'it' : 'them'} to continue` };

  const left = pools.filter((state) => state.remaining > 0);
  if (left.length === 0) return undefined;
  const one = left.length === 1 && left[0].remaining === 1;
  const dots = list(left.map((state) => plural(state.remaining, `${dotNoun(state)} dot`)));
  return { text: `${dots} ${one ? 'remains' : 'remain'} · Allocate ${one ? 'it' : 'them'} to continue` };
}

/** Why no Discipline dots can be placed before a clan is chosen: Continue's reason and the Disciplines card's. */
export const DISCIPLINES_NEED_CLAN = 'Choose a clan to place Discipline dots';

/** The reason Continue is disabled on `screen`, or undefined when the screen does not gate. */
export function gateReason(build: V20Build, screen: ScreenId): GateReason | undefined {
  switch (screen) {
    case 'clan':
      return build.clan === '' ? { text: 'Choose a clan to continue' } : undefined;
    case 'advantages':
      if (build.clan === '') return { text: DISCIPLINES_NEED_CLAN, goTo: 'clan' };
      return poolReason(poolsOn(build, screen));
    case 'attributes':
    case 'abilities':
      return poolReason(poolsOn(build, screen));
    default:
      return undefined;
  }
}

/** "1 item left", "3 items left": how many outstanding items stand between a build and Finish. */
export const itemsLeft = (count: number): string => `${plural(count, 'item')} left`;

/** The line beside Continue where it is not gated but something is left: "1 item left · Review it next". */
export function hint(build: V20Build, screen: ScreenId): string | undefined {
  if (screen !== 'finishing') return undefined;
  const count = outstanding(build).length;
  return count === 0 ? undefined : `${itemsLeft(count)} · Review ${count === 1 ? 'it' : 'them'} next`;
}
