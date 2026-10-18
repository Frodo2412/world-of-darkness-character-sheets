import { describe, expect, test } from 'vitest';
import { insertLink, PLACEHOLDER, toggleLines, toggleWrap, type TextRange } from './format';

/** "He[llo] there": the brackets mark the selection. */
function range(marked: string): TextRange {
  const start = marked.indexOf('[');
  const end = marked.indexOf(']') - 1;
  return { text: marked.replace('[', '').replace(']', ''), start, end };
}
/** The whole text selected, for text that holds brackets of its own. */
const all = (text: string): TextRange => ({ text, start: 0, end: text.length });
const marked = ({ text, start, end }: TextRange): string => `${text.slice(0, start)}[${text.slice(start, end)}]${text.slice(end)}`;

describe('toggleWrap', () => {
  test('wraps the selection and keeps it selected', () => {
    expect(marked(toggleWrap(range('say [hello] now'), '**', PLACEHOLDER.bold))).toBe('say **[hello]** now');
    expect(marked(toggleWrap(range('say [hello] now'), '*', PLACEHOLDER.italic))).toBe('say *[hello]* now');
  });

  test('with nothing selected, inserts a selected placeholder', () => {
    expect(marked(toggleWrap(range('say [] now'), '**', PLACEHOLDER.bold))).toBe('say **[bold text]** now');
  });

  test('takes the marker off a selection it surrounds', () => {
    expect(marked(toggleWrap(range('say **[hello]** now'), '**', PLACEHOLDER.bold))).toBe('say [hello] now');
    expect(marked(toggleWrap(range('say *[hello]* now'), '*', PLACEHOLDER.italic))).toBe('say [hello] now');
  });

  test('takes the marker off a selection that includes it', () => {
    expect(marked(toggleWrap(range('say [**hello**] now'), '**', PLACEHOLDER.bold))).toBe('say [hello] now');
  });

  test('italic inside bold is wrapped, not mistaken for the bold marker', () => {
    expect(marked(toggleWrap(range('**[hello]**'), '*', PLACEHOLDER.italic))).toBe('***[hello]***');
  });

  test('wrapping twice undoes the first', () => {
    const once = toggleWrap(range('[word]'), '**', PLACEHOLDER.bold);
    expect(marked(toggleWrap(once, '**', PLACEHOLDER.bold))).toBe('[word]');
  });
});

describe('toggleLines', () => {
  test('with the caret in an empty first line it works on that line, not the one after it', () => {
    const result = toggleLines({ text: '\nsecond', start: 0, end: 0 }, 'bullets');

    expect(result.text).toBe('- \nsecond');
  });

  test('makes the line a bullet and back', () => {
    const bullet = toggleLines(range('one [two] three'), 'bullets');
    expect(bullet.text).toBe('- one two three');
    expect(toggleLines(bullet, 'bullets').text).toBe('one two three');
  });

  test('works on every line the selection touches, not the one after it', () => {
    const lines = { text: 'a\nb\nc\nd', start: 2, end: 5 };
    expect(toggleLines(lines, 'bullets').text).toBe('a\n- b\n- c\nd');
    expect(toggleLines({ text: 'a\nb\nc', start: 0, end: 2 }, 'bullets').text).toBe('- a\nb\nc');
  });

  test('numbers count from one', () => {
    expect(toggleLines({ text: 'a\nb\nc', start: 0, end: 5 }, 'numbers').text).toBe('1. a\n2. b\n3. c');
  });

  test('checklist items and quotes', () => {
    expect(toggleLines(range('[ask Mara]'), 'checklist').text).toBe('- [ ] ask Mara');
    expect(toggleLines(range('[said]'), 'quote').text).toBe('> said');
  });

  test('a line with another marker is changed to this one', () => {
    expect(toggleLines(range('[1. one]'), 'bullets').text).toBe('- one');
    expect(toggleLines(all('- [x] done'), 'quote').text).toBe('> done');
    expect(toggleLines(range('[- one]'), 'checklist').text).toBe('- [ ] one');
  });

  test('a checklist item is not taken for a plain bullet', () => {
    expect(toggleLines(all('- [ ] one'), 'bullets').text).toBe('- one');
  });

  test('blank lines between items are left blank', () => {
    expect(toggleLines({ text: 'a\n\nb', start: 0, end: 4 }, 'bullets').text).toBe('- a\n\n- b');
  });

  test('keeps a line out of the selection alone and selects what it changed', () => {
    const changed = toggleLines({ text: 'x\nab\ny', start: 3, end: 3 }, 'bullets');
    expect(changed.text).toBe('x\n- ab\ny');
    expect(changed.text.slice(changed.start, changed.end)).toBe('- ab');
  });

  test('an empty text becomes one marker', () => {
    expect(toggleLines({ text: '', start: 0, end: 0 }, 'bullets').text).toBe('- ');
  });
});

describe('insertLink', () => {
  test('turns the selection into the link text', () => {
    const link = insertLink(range('see [the site] now'), 'https://example.com');
    expect(link.text).toBe('see [the site](https://example.com) now');
    expect(link.text.slice(link.start, link.end)).toBe('the site');
  });

  test('with nothing selected, inserts a placeholder text, selected', () => {
    const link = insertLink({ text: 'x', start: 1, end: 1 }, ' https://example.com ');
    expect(link.text).toBe('x[link text](https://example.com)');
    expect(link.text.slice(link.start, link.end)).toBe('link text');
  });

  test('puts in whatever address was typed; the preview decides whether it is a link', () => {
    expect(insertLink({ text: '', start: 0, end: 0 }, 'javascript:alert(1)').text).toBe('[link text](javascript:alert(1))');
  });
});
