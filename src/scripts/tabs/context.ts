import type { V20Character } from '../../domain/v20/character';
import type { PoolSelection } from '../../domain/v20/resources';
import type { SheetMode } from '../sheet/mode';
import type { PoolRow } from '../sheet/pool';

export type Update = (character: V20Character) => V20Character;

/** The one path an edit takes: update the model, redraw, save. Returns the character as it is now. */
export type Apply = (update: Update) => V20Character;

/** What the shell offers a tab when it mounts it. */
export interface TabContext {
  /** The tab's own panel: a tab only ever queries inside it. */
  readonly root: HTMLElement;
  /** The latest character. */
  current(): V20Character;
  apply: Apply;
  /** What is chosen for the dice pool now; a copy. */
  poolSelection(): PoolSelection;
  /** Chooses the row for the pool, or drops it when it is the chosen one, and redraws. */
  togglePool(row: PoolRow): void;
}

/** What a mounted tab gives back to the shell. */
export interface MountedTab {
  /** Draws the character in the mode. Idempotent, and never rewrites an input the player is typing in. */
  render(character: V20Character, mode: SheetMode): void;
  /** The tab has just been switched to, before its first draw of the visit. */
  enter?(): void;
  /** The tab is about to be switched away from: forget page state. */
  leave?(): void;
  /** An edit was applied and the tab has been redrawn. */
  changed?(before: V20Character, after: V20Character): void;
}

export type MountTab = (ctx: TabContext) => MountedTab;

/** What a tab's `mount.ts` exports. */
export interface TabModule {
  mount: MountTab;
}
