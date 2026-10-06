// Draws the library's entries: clone the template of the entry's kind, then put text in its slots.
// Stored text only ever reaches the page as `textContent` or an attribute, never as markup.
// Nothing here touches the page when imported: the caller hands over the templates.

import type { LibraryEntry } from '../../domain/v20/library';

export const sheetUrl = (id: string): string => `/sheet/?id=${encodeURIComponent(id)}`;
// A sheet opened to be filled in starts in edit mode.
export const editSheetUrl = (id: string): string => `${sheetUrl(id)}#edit`;
export const builderUrl = (id: string): string => `/build/?id=${encodeURIComponent(id)}`;

type TemplateName = 'character' | 'build' | 'unreadable';

/** Which template draws each kind of entry; a kind added to the model has to be named here. */
const TEMPLATE_OF: Record<LibraryEntry['kind'], TemplateName> = {
  character: 'character',
  build: 'build',
  'unreadable-character': 'unreadable',
  'unreadable-build': 'unreadable',
};

export type EntryTemplates = Record<TemplateName, HTMLTemplateElement>;

/** The templates the page carries, by name; a page that lacks one cannot draw its entries. */
export function findTemplates(root: ParentNode): EntryTemplates {
  const named = (name: TemplateName): HTMLTemplateElement => {
    const template = root.querySelector<HTMLTemplateElement>(`template[data-entry-template="${name}"]`);
    if (template === null) throw new Error(`The page has no "${name}" entry template.`);
    return template;
  };
  return { character: named('character'), build: named('build'), unreadable: named('unreadable') };
}

type SlotName =
  | 'monogram'
  | 'name'
  | 'summary'
  | 'explanation'
  | 'temperament'
  | 'temperament-group'
  | 'chronicle'
  | 'open'
  | 'edit'
  | 'continue';

/** The element of `root` marked as the slot `name`; a template without it is a defect, not a blank. */
export function slot<T extends HTMLElement = HTMLElement>(root: ParentNode, name: SlotName): T {
  const found = root.querySelector<T>(`[data-slot="${name}"]`);
  if (found === null) throw new Error(`The entry template has no "${name}" slot.`);
  return found;
}

/** Puts `text` in a slot; a blank text leaves the slot out of the page. */
function fillOptional(root: ParentNode, name: SlotName, text: string): void {
  const element = slot(root, name);
  element.textContent = text;
  element.hidden = text === '';
}

/** A link named for its entry, "Open sheet for Lucita", so no two actions share a name. */
function fillLink(root: ParentNode, name: SlotName, href: string, entryName: string): void {
  const anchor = slot<HTMLAnchorElement>(root, name);
  const visible = (anchor.textContent ?? '').replace(/\s+/g, ' ').trim();
  anchor.href = href;
  anchor.setAttribute('aria-label', `${visible} for ${entryName}`);
}

type Readable = Extract<LibraryEntry, { name: string }>;

function fillReadable(item: ParentNode, entry: Readable): void {
  slot(item, 'name').textContent = entry.name;
  slot(item, 'monogram').textContent = entry.monogram;
  fillOptional(item, 'summary', entry.summary);
  slot(item, 'temperament').textContent = entry.temperament;
  slot(item, 'temperament-group').hidden = entry.temperament === '';
  slot(item, 'chronicle').textContent = entry.chronicle === '' ? 'Unassigned' : entry.chronicle;
}

function fillUnreadable(item: ParentNode, kind: 'character' | 'build', id: string): void {
  slot(item, 'name').textContent = `Unreadable ${kind}`;
  slot(item, 'explanation').textContent = `The saved data for this ${kind} (${id}) could not be read. It has been left untouched.`;
}

function fill(item: ParentNode, entry: LibraryEntry): void {
  switch (entry.kind) {
    case 'character':
      fillReadable(item, entry);
      fillLink(item, 'open', sheetUrl(entry.id), entry.name);
      fillLink(item, 'edit', editSheetUrl(entry.id), entry.name);
      return;
    case 'build':
      fillReadable(item, entry);
      fillLink(item, 'continue', builderUrl(entry.id), entry.name);
      return;
    case 'unreadable-character':
      fillUnreadable(item, 'character', entry.id);
      return;
    case 'unreadable-build':
      fillUnreadable(item, 'build', entry.id);
      return;
  }
}

/** One list item for `entry`. */
export function drawEntry(templates: EntryTemplates, entry: LibraryEntry): HTMLLIElement {
  const template = templates[TEMPLATE_OF[entry.kind]];
  const item = template.content.firstElementChild?.cloneNode(true);
  if (!(item instanceof HTMLLIElement)) throw new Error('An entry template must hold one list item.');
  fill(item, entry);
  return item;
}
