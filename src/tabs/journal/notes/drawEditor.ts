import { mentionsOf, type Mention } from '../../../domain/v20/journal/notes/notes';
import { renderNote } from '../../../domain/v20/journal/notes/markdown';
import type { Note } from '../../../domain/v20/journal/types';
import { el, reconcile, setAttribute, setText } from '../../../scripts/dossier/dom';
import { showText } from '../../../scripts/tabs/showText';

/** What the preview last drew, so a redraw that changes nothing leaves it (and a ticked box's focus) alone. */
const drawn = new WeakMap<HTMLElement, string>();

/**
 * Shows the rendered body. The HTML is `renderNote`'s, which escapes everything it does not recognise, and
 * is the one place in the tabs that takes HTML. A ticked box is a new element, so focus is put back on it.
 */
export function setPreview(preview: HTMLElement, body: string): void {
  const html = renderNote(body);
  if (drawn.get(preview) === html) return;
  drawn.set(preview, html);
  const line = (document.activeElement as HTMLElement | null)?.closest('[data-line]') ? (document.activeElement as HTMLElement).dataset.line : undefined;
  preview.innerHTML = html;
  preview.toggleAttribute('data-empty', html === '');
  if (line !== undefined) preview.querySelector<HTMLElement>(`[data-line="${line}"]`)?.focus();
}

/** A chip with its text, and a remove button when `removeKey` (the dataset key its press is read by) is given. */
function chip(removeKey?: 'removeTag' | 'removeMention'): HTMLElement {
  const item = el('li', 'journal-chip');
  item.append(el('span', 'journal-chip-text'));
  if (removeKey !== undefined) {
    const remove = el('button', 'journal-chip-remove', '×');
    remove.type = 'button';
    remove.dataset[removeKey] = '';
    item.append(remove);
  }
  return item;
}

function drawTags(list: Element, tags: readonly string[]): void {
  reconcile(
    list,
    tags,
    (tag) => tag,
    () => chip('removeTag'),
    (item, tag) => {
      setText(item.querySelector('.journal-chip-text')!, tag);
      const remove = item.querySelector<HTMLElement>('.journal-chip-remove')!;
      remove.dataset.removeTag = tag;
      setAttribute(remove, 'aria-label', `Remove tag ${tag}`);
    },
  );
}

/** The names the note mentions: those its body gives and those added by hand, which can be removed. */
export function drawMentions(list: Element, mentions: readonly Mention[]): void {
  reconcile(
    list,
    mentions,
    (mention) => `${mention.manual ? 'added' : 'body'}:${mention.name}`,
    (mention) => chip(mention.manual ? 'removeMention' : undefined),
    (item, mention) => {
      setText(item.querySelector('.journal-chip-text')!, mention.name);
      const remove = item.querySelector<HTMLElement>('.journal-chip-remove');
      if (remove !== null) {
        remove.dataset.removeMention = mention.name;
        setAttribute(remove, 'aria-label', `Remove ${mention.name}`);
      }
    },
  );
}

/**
 * Draws the chosen note into the editor. A field the player is in is left alone, so a redraw while typing
 * does not move the caret; every other field shows what is stored.
 */
export function drawEditor(form: HTMLElement, note: Note, sessionTitle: string, status: string): void {
  const find = <T extends HTMLElement>(selector: string): T => form.querySelector<T>(selector)!;
  const typing = document.activeElement;
  for (const field of ['title', 'body'] as const) {
    const input = find<HTMLInputElement | HTMLTextAreaElement>(`[data-field="${field}"]`);
    if (input !== typing) showText(input, note[field]);
  }
  const category = find<HTMLSelectElement>('[data-field="category"]');
  if (category !== typing) showText(category, note.category);

  setText(find('[data-editor-context]'), `${sessionTitle} / Editing note`);
  const pin = find('[data-editor-pin]');
  setAttribute(pin, 'aria-pressed', String(note.pinned));
  setAttribute(pin, 'aria-label', 'Pin this note');
  find('[data-pinned-text]').hidden = !note.pinned;

  drawTags(find('[data-tags]'), note.tags);
  drawMentions(find('[data-mentions]'), mentionsOf({ body: find<HTMLTextAreaElement>('[data-field="body"]').value, mentions: note.mentions }));
  setPreview(find('[data-preview]'), find<HTMLTextAreaElement>('[data-field="body"]').value);
  setText(find('[data-save-status]'), status);
}
