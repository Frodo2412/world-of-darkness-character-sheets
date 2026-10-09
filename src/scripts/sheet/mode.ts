import type { Announce } from '../tabs/services';

export type SheetMode = 'play' | 'edit';

const ANNOUNCEMENT: Record<SheetMode, string> = {
  edit: 'Editing character',
  play: 'Play mode',
};

export interface Mode {
  current(): SheetMode;
  /** Called after the sheet has changed mode, before focus moves. */
  onChange(listener: (mode: SheetMode) => void): void;
}

/**
 * The sheet's play / edit mode. This is the only code that writes
 * `data-sheet-mode` on the sheet root; the stylesheet shows and hides the
 * `data-sheet-mode-only` elements from it. A press on any `data-mode-toggle`
 * button switches mode, moves focus to the `data-mode-focus` element for the
 * new mode, then says what changed through `announce`.
 */
export function createMode(root: HTMLElement, start: SheetMode, announce: Announce): Mode {
  const listeners: ((mode: SheetMode) => void)[] = [];
  let mode = start;
  root.dataset.sheetMode = mode;

  function switchTo(next: SheetMode): void {
    mode = next;
    root.dataset.sheetMode = mode;
    for (const listener of listeners) listener(mode);
    root.querySelector<HTMLElement>(`[data-mode-focus="${mode}"]`)?.focus();
    announce(ANNOUNCEMENT[mode]);
  }

  root.addEventListener('click', (event) => {
    if ((event.target as Element).closest('[data-mode-toggle]')) {
      switchTo(mode === 'edit' ? 'play' : 'edit');
    }
  });

  return {
    current: () => mode,
    onChange: (listener) => void listeners.push(listener),
  };
}
