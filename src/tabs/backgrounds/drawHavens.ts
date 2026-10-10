import type { HavenCard } from '../../domain/v20/backgrounds/havens';
import { cloneOf, field, reconcile, setText } from './dom';

/** The details a haven can have, each with the label it is shown under: the one list the card is drawn from. */
export const HAVEN_FIELDS = [
  { key: 'description', label: 'Description' },
  { key: 'location', label: 'Location' },
  { key: 'access', label: 'Access' },
  { key: 'security', label: 'Security' },
] as const;

/** What the haven cards copy their markup from. */
export interface HavenTemplates {
  haven: HTMLTemplateElement;
  detail: HTMLTemplateElement;
}

/** One haven as it reads in play mode: its kind, its name and the details it has (a blank one is left out). */
function drawCard(item: HTMLElement, card: HavenCard, templates: HavenTemplates): void {
  setText(field(item, 'name'), card.name);
  setText(field(item, 'kind'), card.kind);
  reconcile(
    field(item, 'details'),
    HAVEN_FIELDS.filter(({ key }) => card[key] !== ''),
    ({ key }) => key,
    () => cloneOf(templates.detail),
    (row, { key, label }) => {
      setText(field(row, 'label'), label);
      setText(field(row, 'value'), card[key]);
    },
  );
}

/** Makes the list hold the cards, one element each, kept from one draw to the next. */
export function drawHavens(list: HTMLElement, cards: readonly HavenCard[], templates: HavenTemplates): void {
  reconcile(
    list,
    cards,
    (card) => String(card.index),
    () => cloneOf(templates.haven),
    (item, card) => drawCard(item, card, templates),
  );
}
