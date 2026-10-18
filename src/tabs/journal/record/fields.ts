import { el } from '../../../scripts/dossier/dom';
import { showText } from '../../../scripts/tabs/showText';

// The fields of an entry in edit mode. Every control says where an edit to it goes (`data-key`,
// `data-index`, `data-field`), so one handler on the section serves them all.

export type ControlKind = 'text' | 'area' | 'number';

export interface FieldSpec {
  field: string;
  label: string;
  control: ControlKind;
  min?: number;
  max?: number;
  /** Spans the whole width of the form. */
  wide?: boolean;
}

/** The entry a control belongs to: a list and its place in it. */
export interface Where {
  key: string;
  index: number;
}

export const FIELDS: Readonly<Record<string, readonly FieldSpec[]>> = {
  gear: [
    { field: 'item', label: 'Item', control: 'text' },
    { field: 'detail', label: 'Detail', control: 'text' },
  ],
  equipment: [
    { field: 'item', label: 'Item', control: 'text' },
    { field: 'detail', label: 'Detail', control: 'text' },
  ],
  bloodBonds: [
    { field: 'name', label: 'Bound to or by', control: 'text' },
    { field: 'relation', label: 'Relation', control: 'text' },
    { field: 'rating', label: 'Rating', control: 'number', min: 0, max: 10 },
    { field: 'type', label: 'Type', control: 'text' },
  ],
  derangements: [
    { field: 'name', label: 'Name', control: 'text' },
    { field: 'status', label: 'Status', control: 'text' },
    { field: 'note', label: 'Storyteller-agreed note', control: 'area', wide: true },
  ],
  goals: [
    { field: 'text', label: 'Goal text', control: 'area', wide: true },
    { field: 'kind', label: 'Kind', control: 'text' },
  ],
};

const keyOf = ({ key, index }: Where, field: string): string => [key, index, field].join(':');

function controlOf(spec: FieldSpec): HTMLElement {
  if (spec.control === 'area') {
    const area = el('textarea', 'journal-input');
    area.rows = 2;
    return area;
  }
  const input = el('input', 'journal-input');
  input.autocomplete = 'off';
  if (spec.control === 'number') {
    input.type = 'number';
    input.step = '1';
    if (spec.min !== undefined) input.min = String(spec.min);
    if (spec.max !== undefined) input.max = String(spec.max);
    input.inputMode = 'numeric';
  } else {
    input.type = 'text';
  }
  return input;
}

/** One labelled control. `prefix` names the entry ("Gear 2"), so every control has a name of its own. */
export function buildField(spec: FieldSpec, where: Where, prefix: string): HTMLElement {
  const wrap = el('div', spec.wide ? 'journal-record-field journal-record-field-wide' : 'journal-record-field');
  const control = controlOf(spec);
  const id = `journal-record-${keyOf(where, spec.field).replaceAll(':', '-')}`;
  control.id = id;
  control.dataset.key = where.key;
  control.dataset.index = String(where.index);
  control.dataset.field = spec.field;
  control.dataset.focusKey = keyOf(where, spec.field);
  control.setAttribute('aria-label', `${prefix} ${spec.label.toLowerCase()}`);
  const caption = el('label', 'journal-label', spec.label);
  caption.htmlFor = id;
  wrap.append(caption, control);
  return wrap;
}

export function buildFields(specs: readonly FieldSpec[], where: Where, prefix: string): HTMLElement {
  const form = el('div', 'journal-record-fields');
  form.append(...specs.map((spec) => buildField(spec, where, prefix)));
  return form;
}

/** Shows each field's value in the controls under `root`, leaving one the player is in alone. */
export function syncFields(root: ParentNode, values: Readonly<Record<string, string | number>>): void {
  for (const control of root.querySelectorAll<HTMLInputElement>('[data-field]')) {
    const value = values[control.dataset.field!];
    if (value !== undefined && control !== document.activeElement) showText(control, String(value));
  }
}
