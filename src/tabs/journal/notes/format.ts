// What the formatting toolbar does to the body, as pure functions of the text and the selection.
// Each takes the textarea's text and selection and returns the text and selection it should hold.

export interface TextRange {
  text: string;
  start: number;
  end: number;
}

export type ListKind = 'bullets' | 'numbers' | 'checklist' | 'quote';

/** What the player is shown selected after an insertion with nothing selected. */
export const PLACEHOLDER = { bold: 'bold text', italic: 'italic text', link: 'link text' } as const;

const splice = (text: string, start: number, end: number, inserted: string): string => text.slice(0, start) + inserted + text.slice(end);

/**
 * Wraps the selection in `marker` ("**" for bold, "*" for italic), or takes the marker off when the
 * selection is already wrapped in it. With nothing selected it inserts a placeholder, selected, so
 * typing replaces it.
 */
export function toggleWrap({ text, start, end }: TextRange, marker: '**' | '*', placeholder: string): TextRange {
  const size = marker.length;
  const selected = text.slice(start, end);
  // The markers just outside the selection (and, for italic, not the end of a bold marker).
  const outside =
    text.slice(start - size, start) === marker &&
    text.slice(end, end + size) === marker &&
    (marker === '**' || (text[start - 2] !== '*' && text[end + 1] !== '*'));
  if (outside) {
    return { text: text.slice(0, start - size) + selected + text.slice(end + size), start: start - size, end: end - size };
  }
  const inside = selected.length >= size * 2 + 1 && selected.startsWith(marker) && selected.endsWith(marker) && (marker === '**' || !selected.startsWith('**'));
  if (inside) {
    const bare = selected.slice(size, selected.length - size);
    return { text: splice(text, start, end, bare), start, end: start + bare.length };
  }
  const body = selected === '' ? placeholder : selected;
  const wrapped = marker + body + marker;
  return { text: splice(text, start, end, wrapped), start: start + size, end: start + size + body.length };
}

const MARKER: Record<ListKind, RegExp> = {
  bullets: /^(\s*)[-*]\s+(?!\[[ xX]\]\s)/,
  numbers: /^(\s*)\d+[.)]\s+/,
  checklist: /^(\s*)[-*]\s+\[[ xX]\]\s+/,
  quote: /^(\s*)>\s?/,
};

/** Any list or quote marker at the start of a line, to be replaced when another kind is chosen. */
const ANY_MARKER = /^(\s*)(?:[-*]\s+\[[ xX]\]\s+|[-*]\s+|\d+[.)]\s+|>\s?)/;

const markerFor = (kind: ListKind, place: number): string =>
  kind === 'bullets' ? '- ' : kind === 'numbers' ? `${place}. ` : kind === 'checklist' ? '- [ ] ' : '> ';

/**
 * Makes each line the selection touches a bullet, a numbered item, a checklist item or a quote, or takes
 * that marker off when every non-empty line already has it. A line with another marker is changed to this one.
 */
export function toggleLines({ text, start, end }: TextRange, kind: ListKind): TextRange {
  // lastIndexOf reads a negative position as 0, so a caret at the very start must not look back at all.
  const from = start === 0 ? 0 : text.lastIndexOf('\n', start - 1) + 1;
  // A selection that ends at the start of a line does not touch that line.
  const stop = end > start && text[end - 1] === '\n' ? end - 1 : end;
  const nextBreak = text.indexOf('\n', stop);
  const to = nextBreak === -1 ? text.length : nextBreak;
  const lines = text.slice(from, to).split('\n');
  const worked = lines.filter((line) => line.trim() !== '');
  const allHave = worked.length > 0 && worked.every((line) => MARKER[kind].test(line));

  let place = 0;
  const changed = lines.map((line) => {
    if (line.trim() === '' && lines.length > 1) return line;
    if (allHave) return line.replace(MARKER[kind], '$1');
    place += 1;
    const indent = ANY_MARKER.exec(line)?.[1] ?? /^\s*/.exec(line)![0];
    return indent + markerFor(kind, place) + line.replace(ANY_MARKER, '').trimStart();
  });
  const replaced = changed.join('\n');
  return { text: splice(text, from, to, replaced), start: from, end: from + replaced.length };
}

/** Turns the selection into the text of a link to `url`, or inserts a link with a placeholder text selected. */
export function insertLink({ text, start, end }: TextRange, url: string): TextRange {
  const label = text.slice(start, end) === '' ? PLACEHOLDER.link : text.slice(start, end);
  const link = `[${label}](${url.trim()})`;
  const labelStart = start + 1;
  return { text: splice(text, start, end, link), start: labelStart, end: labelStart + label.length };
}
