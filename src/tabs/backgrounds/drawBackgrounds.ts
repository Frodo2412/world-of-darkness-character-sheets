import type { BackgroundCard } from '../../domain/v20/backgrounds/cards';
import type { Person } from '../../domain/v20/dossier/types';
import { cloneOf, field, reconcile, setText } from './dom';
import { drawDots } from './dots';

/** What the background cards copy their markup from. */
export interface BackgroundTemplates {
  background: HTMLTemplateElement;
  person: HTMLTemplateElement;
}

/** Shows or hides a part of a card; its text is untouched while hidden. */
const showWhen = (element: HTMLElement, visible: boolean): void => void (element.hidden = !visible);

/** A line of text that is hidden while it is empty, so a blank summary leaves no gap. */
function drawLine(element: HTMLElement, text: string): void {
  setText(element, text);
  showWhen(element, text !== '');
}

/** The people of a background, each with the role they play. */
function drawPeople(list: HTMLElement, people: readonly Person[], template: HTMLTemplateElement): void {
  showWhen(list, people.length > 0);
  reconcile(
    list,
    people,
    (_person, index) => String(index),
    () => cloneOf(template),
    (item, person) => {
      setText(field(item, 'name'), person.name);
      setText(field(item, 'role'), person.role);
    },
  );
}

/**
 * One card as it reads in play mode: the name, the rating in read-only dots (five at most; a stored
 * rating above five is also written out), the summary, the note and the people.
 */
function drawCard(item: HTMLElement, card: BackgroundCard, templates: BackgroundTemplates): void {
  setText(field(item, 'name'), card.name);
  drawDots(item, `backgrounds.${card.index}`, card);
  drawLine(field(item, 'summary'), card.summary);
  drawLine(field(item, 'note'), card.note);
  drawPeople(field(item, 'people'), card.people, templates.person);
}

/** Makes the list hold the cards, one element each, kept from one draw to the next. */
export function drawBackgrounds(
  list: HTMLElement,
  cards: readonly BackgroundCard[],
  templates: BackgroundTemplates,
  edit: (item: HTMLElement, card: BackgroundCard) => void,
): void {
  reconcile(
    list,
    cards,
    (card) => String(card.index),
    () => cloneOf(templates.background),
    (item, card) => {
      drawCard(item, card, templates);
      edit(item, card);
    },
  );
}
