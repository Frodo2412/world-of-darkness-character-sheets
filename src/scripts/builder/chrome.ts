// The shell's chrome: the top bar, the identity bar and the "Your character" panel. They are the same on
// every screen and drawn from the build alone; the page decides nothing here. The autosave status lives
// in `messages` (channel 1), which this wires the buttons beside.

import type { V20Build } from '../../domain/v20/creation/build';
import type { ScreenId } from '../../domain/v20/creation/rules';
import { characterRows, identityOf, type CharacterRow } from '../../domain/v20/creation/shellView';
import { showReadout } from './messages';

const part = (root: HTMLElement, name: string): HTMLElement => root.querySelector<HTMLElement>(`[${name}]`)!;

/** Humanity and Willpower as dots, filled then empty; the number beside them says the same in words. */
const dotsText = ({ filled, max }: NonNullable<CharacterRow['dots']>): string =>
  '●'.repeat(filled) + '○'.repeat(Math.max(0, max - filled));

function renderTopAndIdentity(root: HTMLElement, build: V20Build): void {
  const identity = identityOf(build);
  const chronicle = part(root, 'data-top-chronicle');
  showReadout(chronicle, identity.chronicle === '' ? '' : `${identity.chronicle} / `);
  chronicle.hidden = identity.chronicle === '';

  showReadout(part(root, 'data-identity-initials'), identity.initials);
  showReadout(part(root, 'data-identity-name'), identity.name);
  const subtitle = part(root, 'data-identity-subtitle');
  showReadout(subtitle, identity.subtitle);
  subtitle.hidden = identity.subtitle === '';
  showReadout(part(root, 'data-identity-natdem'), identity.natureDemeanor);
}

function renderPanel(root: HTMLElement, build: V20Build, screen: ScreenId): void {
  const rows = characterRows(build, screen);
  for (const element of root.querySelectorAll<HTMLElement>('[data-panel-row]')) {
    const row = rows.find((entry) => entry.key === element.dataset.panelRow);
    element.hidden = row === undefined;
    if (row === undefined) continue;
    showReadout(element.querySelector<HTMLElement>('[data-panel-value]')!, row.value);
    const dots = element.querySelector<HTMLElement>('[data-panel-dots]');
    if (dots && row.dots) showReadout(dots, dotsText(row.dots));
  }
}

/** Draws the top bar, the identity bar and the panel for the build as seen from `screen`. */
export function renderChrome(root: HTMLElement, build: V20Build, screen: ScreenId): void {
  renderTopAndIdentity(root, build);
  renderPanel(root, build, screen);
}

export interface ChromeActions {
  /** Tries the save again, for the button the failure alert offers. */
  retrySave(): void;
  /** Saves and goes to the roster, or stays and says why not. */
  saveAndExit(): void;
}

export function wireChrome(root: HTMLElement, actions: ChromeActions): void {
  part(root, 'data-autosave-retry').addEventListener('click', () => actions.retrySave());
  part(root, 'data-save-exit').addEventListener('click', () => actions.saveAndExit());
}
