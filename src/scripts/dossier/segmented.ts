// The keyboard side of a segmented control. The keys are the tab bar's: arrows, Home and End move
// focus, and Enter and Space press the button, which a <button> does by itself. Nothing here touches
// the page when imported.

import { tabKeyAction } from '../tabs/tabBar';

/** The segment (of `count`) that `key` moves focus to from the one at `index`; nothing for a key that does not move it. */
export function segmentFocusTarget(key: string, index: number, count: number): number | undefined {
  const action = tabKeyAction(key, index, count);
  return action?.kind === 'focus' ? action.index : undefined;
}

/** Lets arrow keys, Home and End move focus between the buttons of a segmented control the server drew. */
export function wireSegmented(group: HTMLElement): void {
  group.addEventListener('keydown', (event) => {
    const buttons = [...group.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    const target = segmentFocusTarget(event.key, index, buttons.length);
    if (target === undefined) return;
    event.preventDefault();
    buttons[target].focus();
  });
}
