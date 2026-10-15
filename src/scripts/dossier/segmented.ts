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

/** Marks the button holding `value` as the pressed one and the rest as not, changing only what differs. */
export function setPressed(group: ParentNode, value: string): void {
  for (const button of group.querySelectorAll<HTMLButtonElement>('button[data-value]')) {
    const pressed = String(button.dataset.value === value);
    if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
  }
}

/** Rewrites the visible words of the button holding `value`, keeping its mark. */
export function setSegmentLabel(group: ParentNode, value: string, text: string): void {
  const label = [...group.querySelectorAll<HTMLButtonElement>('button[data-value]')]
    .find((button) => button.dataset.value === value)
    ?.querySelector('.dossier-segment-label');
  if (label !== null && label !== undefined && label.textContent !== text) label.textContent = text;
}

/** Keyboard support, plus: pressing a segment presses it and tells `onPress` which value. */
export function wireSegmentedPress(group: HTMLElement, onPress: (value: string) => void): void {
  wireSegmented(group);
  group.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-value]');
    if (button === null || !group.contains(button)) return;
    setPressed(group, button.dataset.value!);
    onPress(button.dataset.value!);
  });
}
