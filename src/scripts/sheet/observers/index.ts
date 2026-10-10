import type { V20Character } from '../../../domain/v20/character';

/**
 * A module in this folder that reacts to the character after the page has drawn it, whatever tab is
 * shown: the application bar's session label is one. It exports `afterRender` and nothing else
 * registers it: dropping a file here is enough. `root` is the whole page (the body), not the sheet:
 * what an observer fills, the application bar's label, is outside `#sheet`.
 */
export interface Observer {
  afterRender(character: V20Character, root: HTMLElement): void;
}

const modules = import.meta.glob<Observer>(['./*.ts', '!./index.ts', '!./*.test.ts'], { eager: true });

/** Every observer in this folder. */
export const observers: readonly Observer[] = Object.values(modules);
