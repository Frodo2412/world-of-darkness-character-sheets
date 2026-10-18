import type { V20Character } from '../../../domain/v20/character';
import { addEntry, clampRating, RATING_MESSAGE, removeEntry, restoreEntry, setDescription, setEntry, type ListKey, type Removal } from '../../../domain/v20/journal/record/edit';
import { activeDerangements, entryCount, entryName } from '../../../domain/v20/journal/record/view';
import type { CharacterRecord, Description } from '../../../domain/v20/journal/types';
import { setText } from '../../../scripts/dossier/dom';
import { createUndoWindow, removedText } from '../../../scripts/dossier/undoWindow';
import type { SheetMode } from '../../../scripts/sheet/mode';
import type { MountedTab, TabContext } from '../../../scripts/tabs/context';
import { drawRecord } from './drawRecord';

const LISTS: readonly ListKey[] = ['gear', 'equipment', 'bloodBonds', 'derangements', 'goals'];

/** The words an entry is named by, from the fields it holds, for a message about removing it. */
function wordsOf(record: CharacterRecord, key: ListKey, index: number): string {
  const entry = record[key][index] as unknown as Record<string, string>;
  return entry?.item ?? entry?.name ?? entry?.text ?? '';
}

/** The Character Record section of the Journal: read-only in play mode, editable in edit mode. */
export function mount(ctx: TabContext, root: HTMLElement): MountedTab {
  /** The notes beside a bond's rating, by place: they outlive a redraw. */
  const hints = new Map<number, string>();
  let mode: SheetMode = 'play';

  const notice = root.querySelector<HTMLElement>('[data-undo-notice]')!;
  const undo = createUndoWindow((held) => {
    notice.hidden = held === undefined;
    if (held !== undefined) setText(notice.querySelector('[data-undo-name]')!, held);
  });
  notice.querySelector('[data-undo-button]')!.addEventListener('click', () => undo.undo());

  /** Changes the record through `apply`, the one path an edit takes. */
  const updateRecord = (change: (record: CharacterRecord) => CharacterRecord): V20Character =>
    ctx.apply((character) => ({ ...character, journal: { ...character.journal, record: change(character.journal.record) } }));

  const focusEntry = (key: ListKey, index: number): void => {
    const first = key === 'gear' || key === 'equipment' ? 'item' : key === 'goals' ? 'text' : 'name';
    root.querySelector<HTMLElement>(`[data-focus-key="${key}:${index}:${first}"]`)?.focus();
  };

  function remove(key: ListKey, index: number): void {
    const name = entryName(key, index, wordsOf(ctx.current().journal.record, key, index));
    let removal: Removal | undefined;
    updateRecord((record) => {
      const result = removeEntry(record, key, index);
      if (result === undefined) return record;
      removal = result.removal;
      return result.record;
    });
    if (removal === undefined) return;
    const taken = removal;
    // Rating notes belong to places; the list has shifted under them.
    hints.clear();
    undo.hold(name, () => {
      hints.clear();
      updateRecord((record) => restoreEntry(record, taken));
      focusEntry(key, taken.index);
    });
    ctx.announce(removedText(name));
    notice.querySelector<HTMLElement>('[data-undo-button]')!.focus();
  }

  /** What a control's edit changes: text is stored as it is typed, a bond's rating once it is a number in range. */
  function edit(target: HTMLInputElement | HTMLTextAreaElement, commit: boolean): void {
    const { key, field } = target.dataset;
    if (key === undefined || field === undefined) return;
    const index = Number(target.dataset.index);
    if (key === 'bloodBonds' && field === 'rating') {
      const typed = target.value.trim();
      const parsed = Number(typed);
      const whole = typed !== '' && Number.isInteger(parsed);
      if (!commit && !(whole && parsed >= 0 && parsed <= 10)) {
        // A half-typed or out-of-range number waits for the commit, which puts it right and says so.
        if (typed !== '' && whole) hints.set(index, RATING_MESSAGE);
        return;
      }
      const { rating, corrected } = clampRating(typed === '' ? 0 : parsed);
      if (commit) {
        target.value = String(rating);
        if (corrected) {
          hints.set(index, RATING_MESSAGE);
          ctx.announce(RATING_MESSAGE);
        } else {
          hints.delete(index);
        }
      } else {
        hints.delete(index);
      }
      updateRecord((record) => setEntry(record, 'bloodBonds', index, { rating }));
      return;
    }
    updateRecord((record) => setEntry(record, key as ListKey, index, { [field]: target.value } as never));
  }

  root.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement;
    if (target.dataset.description !== undefined) {
      updateRecord((record) => setDescription(record, target.dataset.description as keyof Description, target.value));
    } else if (target.dataset.field !== undefined) {
      edit(target, false);
    }
  });

  root.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement;
    if (target.dataset.key === 'bloodBonds' && target.dataset.field === 'rating') edit(target, true);
  });

  root.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (button === null) return;
    const { add, remove: removeKey } = button.dataset;
    if (add !== undefined && LISTS.includes(add as ListKey)) {
      const key = add as ListKey;
      const character = updateRecord((record) => addEntry(record, key));
      focusEntry(key, character.journal.record[key].length - 1);
    } else if (removeKey !== undefined) {
      const [key, index] = removeKey.split(':');
      remove(key as ListKey, Number(index));
    }
  });

  return {
    render(character: V20Character, shown: SheetMode) {
      mode = shown;
      const { record } = character.journal;
      drawRecord(root, record, mode, hints);
      setText(root.querySelector('[data-count="derangements"]')!, activeDerangements(record));
      setText(root.querySelector('[data-count="goals"]')!, entryCount(record.goals.length));
    },
    leave() {
      hints.clear();
    },
  };
}
