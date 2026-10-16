import { backgroundCards } from '../../domain/v20/backgrounds/cards';
import {
  POINTS_MESSAGE,
  addBackground,
  addHaven,
  addOtherTrait,
  addPerson,
  addPointed,
  clampPoints,
  removeEntry,
  removePerson,
  restoreEntry,
  setBackground,
  setHaven,
  setOtherTrait,
  setPerson,
  setPointed,
  type Family,
  type PointedFamily,
  type Removal,
} from '../../domain/v20/backgrounds/edit';
import type { Haven, OtherTrait } from '../../domain/v20/dossier/types';
import { setText } from '../../scripts/dossier/dom';
import { createUndoWindow, removedText } from '../../scripts/dossier/undoWindow';
import type { MountedTab, TabContext, Update } from '../../scripts/tabs/context';
import { backgroundLabel, drawBackgrounds } from './drawBackgrounds';
import { drawHavens, havenLabel } from './drawHavens';
import { countsOf, drawIndex } from './drawIndex';
import { drawPointed, pointedLabel } from './drawMeritsFlaws';
import { drawOther, otherLabel } from './drawOther';

/** What the player is told when an Other trait's rating is put right. */
const RATING_MESSAGE = 'Rating kept between 0 and 10.';

const FAMILIES: readonly Family[] = ['backgrounds', 'havens', 'merits', 'flaws', 'otherTraits'];

/** "Éloïse's": the first name with the possessive, or "this character's". */
function possessive(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  return first === '' ? "this character's" : `${first}’s`;
}

/** The Backgrounds tab: Backgrounds, Havens, Merits, Flaws and Other Traits. Read-only in play; edited in edit mode. */
export function mount(ctx: TabContext): MountedTab {
  const { root } = ctx;
  const list = (family: Family): HTMLElement => root.querySelector<HTMLElement>(`[data-list="${family}"]`)!;
  /** The "kept at 0 or more" notes shown beside a field, by entry: they outlive a redraw. */
  const hints = new Map<string, string>();

  const notice = root.querySelector<HTMLElement>('[data-undo-notice]')!;
  const undo = createUndoWindow((held) => {
    notice.hidden = held === undefined;
    if (held !== undefined) setText(notice.querySelector('[data-undo-name]')!, held);
  });
  notice.querySelector('[data-undo-button]')!.addEventListener('click', () => undo.undo());

  const focusEntry = (family: Family, index: number): void => {
    root.querySelector<HTMLElement>(`[data-focus-key="${family}:${index}::name"]`)?.focus();
  };

  function labelOf(family: Family, index: number): string {
    const character = ctx.current();
    switch (family) {
      case 'backgrounds':
        return backgroundLabel(backgroundCards(character, 'edit').find((card) => card.index === index)!);
      case 'havens':
        return havenLabel(character.havens[index], index);
      case 'otherTraits':
        return otherLabel(character.otherTraits[index], index);
      default:
        return pointedLabel(family, character[family][index], index);
    }
  }

  function remove(family: Family, index: number): void {
    const label = labelOf(family, index);
    let removal: Removal | undefined;
    ctx.apply((character) => {
      const result = removeEntry(character, family, index);
      removal = result?.removal;
      return result?.character ?? character;
    });
    if (removal === undefined) return;
    const taken = removal;
    undo.hold(label, () => {
      const restored = ctx.apply((character) => restoreEntry(character, taken));
      // A blanked row filled in since is not overwritten: the entry went to the end of the list.
      const placed = (restored[family] as unknown[])[taken.index] === taken.entry ? taken.index : restored[family].length - 1;
      focusEntry(family, placed);
    });
    ctx.announce(removedText(label));
    notice.querySelector<HTMLElement>('[data-undo-button]')!.focus();
  }

  function add(family: Family): void {
    const updates: Record<Family, Update> = {
      backgrounds: (character) => addBackground(character),
      havens: addHaven,
      merits: (character) => addPointed(character, 'merits'),
      flaws: (character) => addPointed(character, 'flaws'),
      otherTraits: addOtherTrait,
    };
    const character = ctx.apply(updates[family]);
    focusEntry(family, character[family].length - 1);
  }

  const hintFor = (family: string, index: number): HTMLElement | null => root.querySelector<HTMLElement>(`#bg-hint-${family}-${index}`);

  /** Shows or clears the note beside an entry's points, now and across redraws. */
  function showHint(family: string, index: number, text: string | undefined): void {
    const key = `${family}:${index}`;
    if (text === undefined) hints.delete(key);
    else hints.set(key, text);
    const element = hintFor(family, index);
    if (element === null) return;
    setText(element, text ?? '');
    element.hidden = text === undefined;
  }

  /** Whether the typed text is a whole number of at least `min`. */
  const isWhole = (text: string, min: number): boolean => text.trim() !== '' && Number.isInteger(Number(text)) && Number(text) >= min;

  /** The update an edit to a control makes, once `commit` says the player has finished with it. */
  function updateFor(target: HTMLElement, commit: boolean): Update | undefined {
    const { family, field } = target.dataset;
    if (family === undefined || field === undefined) return undefined;
    const index = Number(target.dataset.index);
    const person = target.dataset.person === undefined ? undefined : Number(target.dataset.person);
    const value = (target as HTMLInputElement).value;

    if (family === 'backgrounds') {
      if (person !== undefined) return (character) => setPerson(character, index, person, { [field]: value });
      return (character) => setBackground(character, index, { [field]: value });
    }
    if (family === 'merits' || family === 'flaws') {
      const which = family as PointedFamily;
      if (field !== 'points') return (character) => setPointed(character, which, index, { [field]: value });
      if (!commit && !isWhole(value, 0)) {
        if (value.trim() !== '') showHint(family, index, POINTS_MESSAGE);
        return value.trim() === '' ? (character) => setPointed(character, which, index, { points: 0 }) : undefined;
      }
      const { points, corrected } = clampPoints(value.trim() === '' ? 0 : Number(value));
      if (commit) {
        (target as HTMLInputElement).value = String(points);
        showHint(family, index, corrected ? POINTS_MESSAGE : undefined);
        if (corrected) ctx.announce(POINTS_MESSAGE);
      } else {
        showHint(family, index, undefined);
      }
      return (character) => setPointed(character, which, index, { points });
    }
    if (family === 'havens') return (character) => setHaven(character, index, { [field]: value } as Partial<Haven>);
    if (field === 'rating') {
      if (value.trim() === '') return (character) => setOtherTrait(character, index, { rating: undefined });
      const rating = Number(value);
      if (commit && !(rating >= 0 && rating <= 10 && Number.isInteger(rating))) {
        const kept = Number.isNaN(rating) ? 0 : Math.min(10, Math.max(0, Math.trunc(rating)));
        (target as HTMLInputElement).value = String(kept);
        ctx.announce(RATING_MESSAGE);
      }
      return Number.isNaN(rating) ? undefined : (character) => setOtherTrait(character, index, { rating });
    }
    return (character) => setOtherTrait(character, index, { [field]: value } as Partial<OtherTrait>);
  }

  // Text is saved as it is typed; a choice from a list when it is made.
  root.addEventListener('input', (event) => {
    const target = event.target as HTMLElement;
    if (target instanceof HTMLSelectElement || target.dataset.field === undefined) return;
    const update = updateFor(target, false);
    if (update !== undefined) ctx.apply(update);
  });

  root.addEventListener('change', (event) => {
    const target = event.target as HTMLElement;
    if (target.dataset.field === undefined) return;
    if (event instanceof CustomEvent) {
      // A rating of dots.
      const { value } = event.detail as { value: number };
      if (target.dataset.family === 'backgrounds') {
        ctx.apply((character) => setBackground(character, Number(target.dataset.index), { rating: value }));
      }
      return;
    }
    if (target instanceof HTMLSelectElement) {
      const update = updateFor(target, true);
      if (update !== undefined) ctx.apply(update);
      return;
    }
    // Finishing with a number: put it right, and say so.
    if (target.dataset.field === 'points' || (target.dataset.family === 'otherTraits' && target.dataset.field === 'rating')) {
      const update = updateFor(target, true);
      if (update !== undefined) ctx.apply(update);
    }
  });

  root.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (button === null) return;
    const { add: addFamily, remove: removeKey, addPerson: addPersonAt, removePerson: removePersonKey } = button.dataset;
    if (addFamily !== undefined && FAMILIES.includes(addFamily as Family)) {
      add(addFamily as Family);
    } else if (removeKey !== undefined) {
      const [family, index] = removeKey.split(':');
      remove(family as Family, Number(index));
    } else if (addPersonAt !== undefined) {
      const index = Number(addPersonAt);
      const character = ctx.apply((current) => addPerson(current, index));
      root.querySelector<HTMLElement>(`[data-focus-key="backgrounds:${index}:${(character.backgrounds[index].people?.length ?? 1) - 1}:name"]`)?.focus();
    } else if (removePersonKey !== undefined) {
      const [index, person] = removePersonKey.split(':').map(Number);
      ctx.apply((current) => removePerson(current, index, person));
    }
  });

  return {
    render(character, mode) {
      const cards = backgroundCards(character, mode);
      const counts = countsOf(character);
      setText(root.querySelector('[data-lead]')!, `Connections, places and the qualities that shape ${possessive(character.header.name)} unlife.`);
      drawBackgrounds(list('backgrounds'), cards);
      drawHavens(list('havens'), character.havens);
      drawPointed(list('merits'), 'merits', character.merits, hints);
      drawPointed(list('flaws'), 'flaws', character.flaws, hints);
      drawOther(list('otherTraits'), character.otherTraits);
      drawIndex(root, character);
      const shown: Record<Family, number> = { ...counts, backgrounds: cards.length };
      for (const family of FAMILIES) {
        root.querySelector<HTMLElement>(`[data-empty="${family}"]`)!.hidden = shown[family] > 0;
        list(family).hidden = shown[family] === 0;
      }
    },
  };
}
