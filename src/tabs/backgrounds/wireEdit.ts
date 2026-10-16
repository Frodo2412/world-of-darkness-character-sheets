import {
  addEntry,
  addPerson,
  correctedPoints,
  correctedRating,
  entryAt,
  removeEntry,
  removePerson,
  restoreEntry,
  setPerson,
  updateEntry,
  type EntryOf,
  type Family,
} from '../../domain/v20/backgrounds/edit';
import { createUndoWindow, removedText, type UndoWindow } from '../../scripts/dossier/undoWindow';
import type { TabContext } from '../../scripts/tabs/context';
import { setText } from '../../scripts/dossier/dom';
import type { EditControl } from './drawEdit';

/** What each kind of entry is called when it has no name to be called by. */
const SINGULAR: Record<Family, string> = {
  backgrounds: 'background',
  havens: 'haven',
  merits: 'merit',
  flaws: 'flaw',
  otherTraits: 'other trait',
};

/** What an entry is called to the player: its name, or "unnamed haven". */
export const entryName = (entry: { name: string }, family: Family): string => entry.name.trim() || `unnamed ${SINGULAR[family]}`;

/** What the remove button of the entry is called to assistive technology: "Remove Allies", "Remove background 3". */
export const removeLabel = (entry: { name: string }, family: Family, index: number): string =>
  `Remove ${entry.name.trim() || `${SINGULAR[family]} ${index + 1}`}`;

/** The key a message about one entry is kept under. */
export const messageKey = (family: Family, index: number): string => `${family}:${index}`;

export interface EditParts {
  ctx: TabContext;
  /** The list of cards of each section. */
  lists: Record<Family, HTMLElement>;
  /** What the player was last told about a field of each entry, by `messageKey`; read by the draw. */
  messages: Map<string, string>;
}

/** The parts of the page's undo notice. */
export interface UndoNotice {
  root: HTMLElement;
  name: HTMLElement;
  button: HTMLElement;
}

/** The text of a number as the field shows it: an unrated trait has none. */
const text = (value: number | undefined): string => (value === undefined ? '' : String(value));

/**
 * Sends every change the player makes in a section to the character through `apply`: typing in a field,
 * choosing from a list, adding, removing and putting back. A removed entry can be put back for ten
 * seconds; `undo` is that window, whose notice the tab draws.
 */
export function wireEdit({ ctx, lists, messages }: EditParts, notice: UndoNotice): UndoWindow {
  const { root } = ctx;
  const undo = createUndoWindow((held) => {
    notice.root.hidden = held === undefined;
    if (held !== undefined) setText(notice.name, held);
  });

  /** Where the player is taken after an add or an undo: the name field of the entry at the place. */
  function focusEntry(family: Family, index: number): void {
    lists[family].querySelector<HTMLElement>(`[data-entry][data-key="${index}"] [data-edit="name"]`)?.focus();
  }

  const update = (family: Family, index: number, change: Record<string, unknown>): void => {
    ctx.apply((character) => updateEntry(character, family as 'merits', index, change as Partial<EntryOf['merits']>));
  };

  /** Records, shows and announces what the player was told about the entry's fields, or forgets it. */
  function tell(family: Family, index: number, message: string | undefined): void {
    if (message === undefined) messages.delete(messageKey(family, index));
    else {
      messages.set(messageKey(family, index), message);
      ctx.announce(message);
    }
  }

  /** A number the player has finished entering: corrected into what the entry keeps, and said so. */
  function commitNumber(family: Family, index: number, control: HTMLInputElement): void {
    const field = control.dataset.edit!;
    const entered = control.value.trim();
    const kept = (): number | undefined => (entryAt(ctx.current(), family, index) as { [name: string]: number | undefined } | undefined)?.[field];
    if (entered === '' && field === 'rating' && family === 'otherTraits') {
      tell(family, index, undefined);
      update(family, index, { rating: undefined });
    } else if (entered === '' || !Number.isFinite(Number(entered))) {
      // Nothing usable was entered: the field shows what the entry has.
      control.value = text(kept());
      return;
    } else {
      const corrected = field === 'points' ? correctedPoints(Number(entered)) : correctedRating(Number(entered));
      tell(family, index, corrected.message);
      update(family, index, { [field]: corrected.value });
    }
    // The player may still be in the field, which a redraw leaves alone: it shows what the entry kept.
    control.value = text(kept());
  }

  function remove(family: Family, index: number): void {
    const entry = entryAt(ctx.current(), family, index);
    if (entry === undefined) return;
    const name = entryName(entry, family);
    messages.clear();
    ctx.apply((character) => removeEntry(character, family, index));
    undo.hold(name, () => {
      messages.clear();
      ctx.apply((character) => restoreEntry(character, family, index, entry as EntryOf['merits']));
      // A base row filled in since is not overwritten: the entry went to the end of the list.
      if (entryAt(ctx.current(), family, index) === entry) focusEntry(family, index);
      else lists[family].lastElementChild?.querySelector<HTMLElement>('[data-edit="name"]')?.focus();
    });
    ctx.announce(removedText(name));
    notice.button.focus();
  }

  function add(family: Family): void {
    messages.clear();
    ctx.apply((character) => addEntry(character, family));
    lists[family].lastElementChild?.querySelector<HTMLElement>('[data-edit="name"]')?.focus();
  }

  for (const [key, list] of Object.entries(lists)) {
    const family = key as Family;
    const entryOf = (target: EventTarget | null): { element: HTMLElement; index: number } | undefined => {
      const element = (target as Element | null)?.closest<HTMLElement>('[data-entry]');
      return element === null || element === undefined ? undefined : { element, index: Number(element.dataset.key) };
    };

    // Text and choices are kept as they are typed or chosen; a number waits until the player has finished with it.
    list.addEventListener('input', (event) => {
      const control = (event.target as Element).closest<EditControl>('[data-edit]');
      const entry = entryOf(control);
      if (control === null || entry === undefined || control.type === 'number') return;
      const field = control.dataset.edit!;
      if (field === 'person-name' || field === 'person-role') {
        const person = Number(control.closest<HTMLElement>('[data-person-edit]')!.dataset.key);
        ctx.apply((character) => setPerson(character, entry.index, person, { [field === 'person-name' ? 'name' : 'role']: control.value }));
      } else {
        update(family, entry.index, { [field]: control.value });
      }
    });

    list.addEventListener('change', (event) => {
      const control = (event.target as Element).closest<HTMLInputElement>('[data-edit]');
      const entry = entryOf(control);
      if (control !== null && entry !== undefined && control.type === 'number') commitNumber(family, entry.index, control);
    });

    list.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-action]');
      const entry = entryOf(button);
      if (button === null || entry === undefined) return;
      const action = button.dataset.action;
      if (action === 'remove') remove(family, entry.index);
      else if (action === 'add-person') {
        ctx.apply((character) => addPerson(character, entry.index));
        entry.element.querySelector<HTMLElement>('[data-field="people-edit"]')?.lastElementChild?.querySelector<HTMLElement>('[data-edit="person-name"]')?.focus();
      } else if (action === 'remove-person') {
        const person = Number(button.closest<HTMLElement>('[data-person-edit]')!.dataset.key);
        ctx.apply((character) => removePerson(character, entry.index, person));
        entry.element.querySelector<HTMLElement>('[data-action="add-person"]')?.focus();
      }
    });
  }

  root.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-action="add"]');
    if (button !== null) add(button.dataset.family as Family);
  });
  notice.button.addEventListener('click', () => undo.undo());
  return undo;
}
