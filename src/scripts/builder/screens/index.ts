// The builder's screens. Each `screens/<id>.ts` default-exports a ScreenModule; this glob is the only
// place that finds them, so a screen is added by adding its file. A screen id with no module, or a
// module with no screen id, fails when the page loads (and the unit test).

import type { V20Build } from '../../../domain/v20/creation/build';
import { SCREENS, type ScreenId } from '../../../domain/v20/creation/rules';
import type { Wiring } from '../wiring';

export interface ScreenModule {
  id: ScreenId;
  /** Attaches the screen's listeners; called once. */
  wire(root: HTMLElement, wiring: Wiring): void;
  /**
   * Draws the screen from `build`; called after every commit. It updates in place and is idempotent: it
   * never rebuilds a focused control, a search field, a roving tabindex or a typed entry kept beside its error.
   */
  render(build: V20Build, root: HTMLElement): void;
}

type ScreenModules = Readonly<Record<string, ScreenModule>>;

const globbed = import.meta.glob<{ default: ScreenModule }>(['./*.ts', '!./index.ts', '!./*.test.ts'], { eager: true });

/** What is wrong with the screen modules, by the path the glob found them at. */
export function screenModuleProblems(modules: ScreenModules): string[] {
  const ids: readonly string[] = SCREENS.map(({ id }) => id);
  const problems: string[] = [];
  for (const [path, screen] of Object.entries(modules)) {
    const file = path.split('/').at(-1)!.replace(/\.ts$/, '');
    if (!ids.includes(screen.id)) problems.push(`${path} has the id "${screen.id}", which is not a screen`);
    else if (screen.id !== file) problems.push(`${path} has the id "${screen.id}", not "${file}"`);
  }
  for (const id of ids) {
    if (!Object.values(modules).some((screen) => screen.id === id)) problems.push(`The screen "${id}" has no module in screens/`);
  }
  return problems;
}

/** The modules in screen order. `modules` is the glob's result, given only by a test. */
function loadScreens(modules: ScreenModules): ScreenModule[] {
  const problems = screenModuleProblems(modules);
  if (problems.length > 0) throw new Error(`The screen modules are inconsistent:\n${problems.join('\n')}`);
  return SCREENS.map(({ id }) => Object.values(modules).find((screen) => screen.id === id)!);
}

export const screenModules: ScreenModule[] = loadScreens(
  Object.fromEntries(Object.entries(globbed).map(([path, loaded]) => [path, loaded.default])),
);
