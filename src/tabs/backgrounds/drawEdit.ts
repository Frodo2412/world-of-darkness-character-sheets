import type { BackgroundCard } from '../../domain/v20/backgrounds/cards';
import type { HavenCard } from '../../domain/v20/backgrounds/havens';
import type { OtherTraitCard } from '../../domain/v20/backgrounds/others';
import type { PointCard } from '../../domain/v20/backgrounds/points';
import type { Person } from '../../domain/v20/dossier/types';
import { showText } from '../../scripts/tabs/showText';
import { cloneOf, field, reconcile, setText } from '../../scripts/dossier/dom';

/** The controls a player changes an entry with. */
export type EditControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/**
 * Shows the text in the control, unless the player is in it: a redraw never rewrites the field being
 * typed in. (A number the player has just entered is put right by whoever corrects it.)
 */
export function showField(control: EditControl, text: string): void {
  if (control.ownerDocument.activeElement !== control) showText(control, text);
}

/** What an entry's form shows besides its fields. */
export interface EditView {
  /** Each field's text by the name its control carries in `data-edit`. */
  values: Record<string, string>;
  /** What the player was last told about a field of this entry (a value corrected); empty for nothing. */
  message: string;
  /** Whether removing the entry would do anything. */
  removable: boolean;
  /** What the remove button is called to assistive technology: "Remove Allies". */
  removeLabel: string;
  /** Backgrounds only: a row with details but no name, which play mode will not show. */
  needsName?: boolean;
  /** Backgrounds only: the people the form lists. */
  people?: readonly Person[];
}

/** The text of a field whose value may be absent (an unrated trait has no rating). */
const text = (value: number | undefined): string => (value === undefined ? '' : String(value));

export const backgroundValues = (card: BackgroundCard): Record<string, string> => ({
  name: card.nameText,
  rating: text(card.rating),
  summary: card.summary,
  note: card.note,
});

export const havenValues = (card: HavenCard): Record<string, string> => ({
  name: card.nameText,
  kind: card.kind,
  description: card.description,
  location: card.location,
  access: card.access,
  security: card.security,
});

export const pointValues = (card: PointCard): Record<string, string> => ({
  name: card.nameText,
  category: card.category,
  points: text(card.points),
  note: card.note,
});

export const otherValues = (card: OtherTraitCard): Record<string, string> => ({
  name: card.nameText,
  rating: text(card.rating),
  kind: card.kind,
  note: card.note,
});

/** The people of a background, one row of fields each. */
function drawPeopleEdit(list: HTMLElement, people: readonly Person[], template: HTMLTemplateElement): void {
  reconcile(
    list,
    people,
    (_person, place) => String(place),
    () => cloneOf(template),
    (row, person) => {
      showField(row.querySelector<HTMLInputElement>('[data-edit="person-name"]')!, person.name);
      showField(row.querySelector<HTMLInputElement>('[data-edit="person-role"]')!, person.role);
    },
  );
}

/** Draws an entry's form: its fields, the message about them, the remove button, and a background's flag and people. */
export function drawEdit(item: HTMLElement, view: EditView, personTemplate: HTMLTemplateElement): void {
  for (const control of item.querySelectorAll<EditControl>('[data-edit]')) {
    const value = view.values[control.dataset.edit!];
    if (value !== undefined) showField(control, value);
  }
  const message = field(item, 'message');
  setText(message, view.message);
  message.hidden = view.message === '';
  const remove = field(item, 'remove');
  remove.hidden = !view.removable;
  remove.setAttribute('aria-label', view.removeLabel);
  const flag = item.querySelector<HTMLElement>('[data-field="needs-name"]');
  if (flag !== null) flag.hidden = view.needsName !== true;
  const people = item.querySelector<HTMLElement>('[data-field="people-edit"]');
  if (people !== null) drawPeopleEdit(people, view.people ?? [], personTemplate);
}
