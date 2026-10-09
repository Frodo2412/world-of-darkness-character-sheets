// The ten seconds after a removal in which it can be taken back. One removal is held at a time: a
// second one replaces the first, which can no longer be undone. Nothing here touches the page.

/** How long a removal can be undone, in milliseconds. */
export const UNDO_MS = 10_000;

/** What the player reads and hears after a removal: "Removed Allies. Undo". */
export const removedText = (name: string): string => `Removed ${name}. Undo`;

export interface UndoWindow {
  /** Holds the removal of `name`; `restore` puts it back. Replaces any removal already held. */
  hold(name: string, restore: () => void): void;
  /** Puts the held removal back, once. False when nothing is held, because it expired or was already undone. */
  undo(): boolean;
}

/**
 * `onChange` is told the name of the removal that can be undone, or undefined once there is none
 * (it expired, or was undone), so the notice can be drawn and cleared.
 */
export function createUndoWindow(onChange: (held: string | undefined) => void, ms: number = UNDO_MS): UndoWindow {
  let held: { name: string; restore: () => void } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function release(): void {
    clearTimeout(timer);
    timer = undefined;
    held = undefined;
    onChange(undefined);
  }

  return {
    hold(name, restore) {
      clearTimeout(timer);
      held = { name, restore };
      timer = setTimeout(release, ms);
      onChange(name);
    },
    undo() {
      if (held === undefined) return false;
      const { restore } = held;
      release();
      restore();
      return true;
    },
  };
}
