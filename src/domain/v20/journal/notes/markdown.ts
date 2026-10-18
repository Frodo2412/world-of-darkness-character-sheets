// The small Markdown subset a note's body is written in, rendered to HTML. Nothing the player types
// reaches the output unescaped: text is escaped wherever it is written, and the only markup produced
// is the fixed set of tags below, with attribute values this file builds itself.
//
//   paragraphs (a line break stays a line break), **bold**, *italic*, [text](http|https|mailto link),
//   "- " / "* " bulleted lists, "1. " numbered lists, "- [ ] " / "- [x] " checklists, "> " quotes.
//
// Everything else, headings and raw HTML included, is shown as the text it is.

/** The characters that would otherwise be read as markup. */
const ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** The text as HTML text or an attribute value: the five characters that can open or close markup are replaced. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ESCAPES[character]);
}

/** The only places a link may lead. Anything else (javascript:, data:, a relative path) is not made a link. */
const SAFE_LINK = /^(?:https?:\/\/|mailto:)[^\s<>"']+$/i;

/** Whether a link target may be linked to. */
export function isSafeLink(target: string): boolean {
  return SAFE_LINK.test(target.trim());
}

/** A link's text and target; the target may hold one level of parentheses, as in a page address that has them. */
const LINK = /\[([^\]\n]*)\]\(((?:[^()\s]|\([^()\s]*\))*)\)/y;

/** A line of text with its inline marks: bold, italic and links. */
function inline(text: string): string {
  let out = '';
  let at = 0;
  while (at < text.length) {
    const character = text[at];
    if (character === '[') {
      LINK.lastIndex = at;
      const link = LINK.exec(text);
      if (link !== null) {
        const [whole, label, target] = link;
        const shown = inline(label);
        out += isSafeLink(target) ? `<a href="${escapeHtml(target.trim())}" rel="noopener noreferrer">${shown}</a>` : shown;
        at += whole.length;
        continue;
      }
    }
    if (character === '*' && text[at + 1] === '*') {
      const end = text.indexOf('**', at + 2);
      if (end > at + 2) {
        out += `<strong>${inline(text.slice(at + 2, end))}</strong>`;
        at = end + 2;
        continue;
      }
    }
    if (character === '*' && text[at + 1] !== undefined && text[at + 1] !== ' ' && text[at + 1] !== '*') {
      const end = text.indexOf('*', at + 1);
      if (end > at + 1 && text[end - 1] !== ' ') {
        out += `<em>${inline(text.slice(at + 1, end))}</em>`;
        at = end + 1;
        continue;
      }
    }
    out += ESCAPES[character] ?? character;
    at += 1;
  }
  return out;
}

const CHECKLIST = /^(\s*)[-*]\s+\[([ xX])\]\s+(.*)$/;
const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;

type Kind = 'paragraph' | 'bullets' | 'numbers' | 'checklist' | 'quote';

interface Line {
  kind: Kind;
  /** The line's text without its marker. */
  text: string;
  /** Its place in the body, counted from 0: what a ticked box refers to. */
  index: number;
  checked: boolean;
}

function classify(line: string, index: number): Line {
  const checklist = CHECKLIST.exec(line);
  if (checklist !== null) return { kind: 'checklist', text: checklist[3], index, checked: checklist[2] !== ' ' };
  const bullet = BULLET.exec(line);
  if (bullet !== null) return { kind: 'bullets', text: bullet[1], index, checked: false };
  const numbered = NUMBERED.exec(line);
  if (numbered !== null) return { kind: 'numbers', text: numbered[1], index, checked: false };
  const quote = QUOTE.exec(line);
  if (quote !== null) return { kind: 'quote', text: quote[1], index, checked: false };
  return { kind: 'paragraph', text: line, index, checked: false };
}

function checkbox(line: Line): string {
  const label = inline(line.text);
  return `<li><label><input type="checkbox" data-line="${line.index}"${line.checked ? ' checked' : ''}> <span>${label}</span></label></li>`;
}

function block(kind: Kind, lines: Line[]): string {
  switch (kind) {
    case 'bullets':
      return `<ul>${lines.map((line) => `<li>${inline(line.text)}</li>`).join('')}</ul>`;
    case 'numbers':
      return `<ol>${lines.map((line) => `<li>${inline(line.text)}</li>`).join('')}</ol>`;
    case 'checklist':
      return `<ul class="note-checklist">${lines.map(checkbox).join('')}</ul>`;
    case 'quote':
      return `<blockquote>${lines.map((line) => inline(line.text)).join('<br>')}</blockquote>`;
    default:
      return `<p>${lines.map((line) => inline(line.text)).join('<br>')}</p>`;
  }
}

/** The body as safe HTML. An empty body is an empty string. */
export function renderNote(body: string): string {
  const html: string[] = [];
  let kind: Kind | undefined;
  let run: Line[] = [];
  const flush = (): void => {
    if (kind !== undefined) html.push(block(kind, run));
    kind = undefined;
    run = [];
  };
  body.split(/\r\n|\r|\n/).forEach((text, index) => {
    if (text.trim() === '') {
      flush();
      return;
    }
    const line = classify(text, index);
    if (line.kind !== kind) flush();
    kind = line.kind;
    run.push(line);
  });
  flush();
  return html.join('');
}

/**
 * The body with the checklist item on line `index` (counted from 0) ticked or unticked: that line and
 * no other changes. A line that is not a checklist item changes nothing.
 */
export function toggleChecklistLine(body: string, index: number): string {
  const lines = body.split(/(\r\n|\r|\n)/);
  // The separators are kept in the odd places, so line `index` is at `index * 2`.
  const at = index * 2;
  const line = lines[at];
  if (line === undefined || !CHECKLIST.test(line)) return body;
  lines[at] = line.replace(/\[([ xX])\]/, (_whole, state: string) => (state === ' ' ? '[x]' : '[ ]'));
  return lines.join('');
}
