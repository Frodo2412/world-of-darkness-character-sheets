import { HAVEN_KINDS, MERIT_CATEGORIES } from '../../domain/v20/dossier/types';
import { el, setAttribute } from '../../scripts/dossier/dom';
import { showText } from '../../scripts/tabs/showText';

// The fields of an entry in edit mode. Every control says where an edit to it goes (`data-family`,
// `data-index`, `data-person`, `data-field`), so one handler on the panel serves them all.

export type ControlKind = 'text' | 'area' | 'select' | 'number' | 'dots';

export interface FieldSpec {
  field: string;
  label: string;
  control: ControlKind;
  options?: readonly string[];
  min?: number;
  max?: number;
  /** Spans the whole width of the form. */
  wide?: boolean;
}

/** The entry a control belongs to: a list, its place in it and, for a person on a Background, theirs. */
export interface Where {
  family: string;
  index: number;
  person?: number;
}

export const BACKGROUND_FIELDS: readonly FieldSpec[] = [
  { field: 'name', label: 'Name', control: 'text' },
  { field: 'rating', label: 'Rating', control: 'dots', max: 5 },
  { field: 'summary', label: 'Summary', control: 'text', wide: true },
  { field: 'note', label: 'Note', control: 'area', wide: true },
];

export const PERSON_FIELDS: readonly FieldSpec[] = [
  { field: 'name', label: 'Person', control: 'text' },
  { field: 'role', label: 'Role', control: 'text' },
];

export const POINTED_FIELDS: readonly FieldSpec[] = [
  { field: 'name', label: 'Name', control: 'text' },
  { field: 'category', label: 'Category', control: 'select', options: MERIT_CATEGORIES },
  { field: 'points', label: 'Points', control: 'number', min: 0 },
  { field: 'note', label: 'Note', control: 'area', wide: true },
];

export const HAVEN_FIELDS: readonly FieldSpec[] = [
  { field: 'name', label: 'Name', control: 'text' },
  { field: 'kind', label: 'Kind', control: 'select', options: HAVEN_KINDS },
  { field: 'description', label: 'Description', control: 'area', wide: true },
  { field: 'location', label: 'Location', control: 'text' },
  { field: 'access', label: 'Access', control: 'text' },
  { field: 'security', label: 'Security and escape', control: 'text', wide: true },
];

export const OTHER_FIELDS: readonly FieldSpec[] = [
  { field: 'name', label: 'Name', control: 'text' },
  { field: 'kind', label: 'Kind', control: 'text' },
  { field: 'rating', label: 'Rating (blank when unrated)', control: 'number', min: 0, max: 10 },
  { field: 'note', label: 'Note', control: 'area', wide: true },
];

const keyOf = ({ family, index, person }: Where, field: string): string => [family, index, person ?? '', field].join(':');

function controlOf(spec: FieldSpec): HTMLElement {
  switch (spec.control) {
    case 'area': {
      const area = el('textarea', 'bg-input');
      area.rows = 2;
      return area;
    }
    case 'select': {
      const select = el('select', 'bg-input');
      for (const option of spec.options ?? []) {
        const choice = el('option', undefined, option);
        choice.value = option;
        select.append(choice);
      }
      return select;
    }
    case 'number': {
      const input = el('input', 'bg-input');
      input.type = 'number';
      input.step = '1';
      if (spec.min !== undefined) input.min = String(spec.min);
      if (spec.max !== undefined) input.max = String(spec.max);
      return input;
    }
    case 'dots': {
      const dots = document.createElement('dot-rating');
      dots.setAttribute('max', String(spec.max ?? 5));
      dots.setAttribute('value', '0');
      return dots;
    }
    default: {
      const input = el('input', 'bg-input');
      input.type = 'text';
      input.autocomplete = 'off';
      return input;
    }
  }
}

/** One labelled control. `prefix` names the entry ("Merit 2"), so every control has a name of its own. */
export function buildField(spec: FieldSpec, where: Where, prefix: string): HTMLElement {
  const wrap = el('div', spec.wide ? 'bg-field bg-field-wide' : 'bg-field');
  const control = controlOf(spec);
  const id = `bg-${keyOf(where, spec.field).replaceAll(':', '-')}`;
  control.id = id;
  control.dataset.family = where.family;
  control.dataset.index = String(where.index);
  if (where.person !== undefined) control.dataset.person = String(where.person);
  control.dataset.field = spec.field;
  control.dataset.focusKey = keyOf(where, spec.field);
  control.setAttribute('aria-label', `${prefix} ${spec.label.toLowerCase()}`);
  // A rating of dots has no native label: its caption is read as text beside it.
  const caption = el(spec.control === 'dots' ? 'span' : 'label', 'bg-field-label', spec.label);
  if (caption instanceof HTMLLabelElement) caption.htmlFor = id;
  wrap.append(caption, control);
  return wrap;
}

export function buildFields(specs: readonly FieldSpec[], where: Where, prefix: string): HTMLElement {
  const form = el('div', 'bg-fields');
  form.append(...specs.map((spec) => buildField(spec, where, prefix)));
  return form;
}

/** Shows `value` in a control without disturbing one the player is typing in. */
export function syncControl(control: HTMLElement, value: string | number | undefined): void {
  const text = value === undefined ? '' : String(value);
  if (control instanceof HTMLSelectElement) {
    if (control.value !== text) control.value = text;
  } else if (control.localName === 'dot-rating') {
    setAttribute(control, 'value', text === '' ? '0' : text);
  } else if (control !== document.activeElement) {
    showText(control as HTMLInputElement, text);
  }
}

/** Shows each field's value in the controls under `root`. */
export function syncFields(root: ParentNode, values: Readonly<Record<string, string | number | undefined>>, person?: number): void {
  for (const control of root.querySelectorAll<HTMLElement>('[data-field]')) {
    const own = control.dataset.person === undefined ? undefined : Number(control.dataset.person);
    if (own !== person || !(control.dataset.field! in values)) continue;
    syncControl(control, values[control.dataset.field!]);
  }
}
