import type { BackgroundCard } from '../../domain/v20/backgrounds/cards';
import type { Person } from '../../domain/v20/dossier/types';
import { el, reconcile, setText } from '../../scripts/dossier/dom';
import { readOnlyDots } from '../../scripts/dossier/dots';
import { BACKGROUND_FIELDS, PERSON_FIELDS, buildFields, syncFields, type Where } from './fields';

const prefixOf = (card: BackgroundCard): string => `Background ${card.index + 1}`;

/** The name a Background goes by in a message or on a button: its name, or its place while it has none. */
export const backgroundLabel = (card: BackgroundCard): string => (card.name === '' ? prefixOf(card) : card.name);

function pill(person: Person): HTMLElement {
  const item = el('li', 'bg-pill');
  item.append(el('span', 'bg-pill-name', person.name));
  // A space between the two, so that name and role read as two words wherever the text is read.
  if (person.role.trim() !== '') item.append(' ', el('span', 'bg-pill-role', person.role));
  return item;
}

function buildPerson(card: BackgroundCard, person: number): HTMLElement {
  const where: Where = { family: 'backgrounds', index: card.index, person };
  const item = el('li', 'bg-person');
  const remove = el('button', 'bg-remove', 'Remove person');
  remove.type = 'button';
  remove.dataset.removePerson = `${card.index}:${person}`;
  remove.dataset.focusKey = `remove-person:${card.index}:${person}`;
  item.append(buildFields(PERSON_FIELDS, where, `${prefixOf(card)} person ${person + 1}`), remove);
  return item;
}

function updatePerson(item: HTMLElement, person: Person, index: number): void {
  syncFields(item, { name: person.name, role: person.role }, index);
  const remove = item.querySelector<HTMLButtonElement>('.bg-remove')!;
  remove.setAttribute('aria-label', `Remove ${person.name.trim() === '' ? `person ${index + 1}` : person.name}`);
}

function buildCard(card: BackgroundCard): HTMLElement {
  const item = el('li', 'bg-card');
  item.dataset.family = 'backgrounds';

  const read = el('div', 'bg-view');
  read.dataset.sheetModeOnly = 'play';
  const head = el('div', 'bg-card-head');
  const rating = el('div', 'bg-card-rating');
  rating.append(el('span', 'bg-card-number'));
  head.append(el('h4', 'bg-card-name'), rating);
  const pills = el('ul', 'bg-pills');
  pills.setAttribute('aria-label', 'People');
  read.append(head, pills, el('p', 'bg-card-summary'), el('p', 'bg-card-note'));

  const edit = el('div', 'bg-edit');
  edit.dataset.sheetModeOnly = 'edit';
  const where: Where = { family: 'backgrounds', index: card.index };
  const people = el('ul', 'bg-people');
  people.setAttribute('aria-label', `${prefixOf(card)} people`);
  const addPerson = el('button', 'bg-add-person', 'Add person');
  addPerson.type = 'button';
  addPerson.dataset.addPerson = String(card.index);
  addPerson.dataset.focusKey = `add-person:${card.index}`;
  const remove = el('button', 'bg-remove', 'Remove');
  remove.type = 'button';
  remove.dataset.remove = `backgrounds:${card.index}`;
  remove.dataset.focusKey = `remove:backgrounds:${card.index}`;
  edit.append(
    el('p', 'bg-flag', 'Name needed to show in play mode'),
    buildFields(BACKGROUND_FIELDS, where, prefixOf(card)),
    people,
    addPerson,
    remove,
  );

  item.append(read, edit);
  return item;
}

function updateCard(item: HTMLElement, card: BackgroundCard): void {
  const read = item.querySelector<HTMLElement>('.bg-view')!;
  setText(read.querySelector('.bg-card-name')!, card.name);
  setText(read.querySelector('.bg-card-number')!, String(card.rating));
  const rating = read.querySelector('.bg-card-rating')!;
  const dots = rating.querySelector('dot-rating');
  if (dots === null || dots.getAttribute('value') !== String(card.dots)) {
    dots?.remove();
    rating.prepend(readOnlyDots(card.name, card.dots, 5));
  }
  reconcile(
    read.querySelector<HTMLElement>('.bg-pills')!,
    card.people.filter((person) => person.name.trim() !== ''),
    (person) => `${person.name}|${person.role}`,
    pill,
    () => {},
  );
  read.querySelector<HTMLElement>('.bg-pills')!.hidden = !card.people.some((person) => person.name.trim() !== '');
  for (const [selector, text] of [
    ['.bg-card-summary', card.summary],
    ['.bg-card-note', card.note],
  ] as const) {
    const line = read.querySelector<HTMLElement>(selector)!;
    setText(line, text);
    line.hidden = text.trim() === '';
  }

  const edit = item.querySelector<HTMLElement>('.bg-edit')!;
  item.dataset.blank = String(card.blank);
  edit.querySelector<HTMLElement>('.bg-flag')!.hidden = !card.needsName;
  syncFields(edit, { name: card.name === '' ? '' : card.name, rating: card.rating, summary: card.summary, note: card.note });
  reconcile(
    edit.querySelector<HTMLElement>('.bg-people')!,
    card.people.map((person, at) => ({ person, at })),
    ({ at }) => String(at),
    ({ at }) => buildPerson(card, at),
    (element, { person, at }) => updatePerson(element, person, at),
  );
  edit.querySelector<HTMLButtonElement>('.bg-remove[data-remove]')!.setAttribute('aria-label', `Remove ${backgroundLabel(card)}`);
}

/** Draws the Backgrounds: a card each, read-only in play and a form in edit mode. */
export function drawBackgrounds(list: HTMLElement, cards: readonly BackgroundCard[]): void {
  reconcile(list, cards, (card) => String(card.index), buildCard, updateCard);
}
