import { describe, expect, test } from 'vitest';
import { seededRandom } from '../testing/stamp';
import { escapeHtml, isSafeLink, renderNote, toggleChecklistLine } from './markdown';

describe('renderNote', () => {
  test('an empty body renders nothing', () => {
    expect(renderNote('')).toBe('');
    expect(renderNote('   \n\n  ')).toBe('');
  });

  test('paragraphs are separated by a blank line and a single line break is kept', () => {
    expect(renderNote('One\nstill one\n\nTwo')).toBe('<p>One<br>still one</p><p>Two</p>');
  });

  test('bold and italic', () => {
    expect(renderNote('a **bold** and *italic* word')).toBe('<p>a <strong>bold</strong> and <em>italic</em> word</p>');
  });

  test('italic inside bold', () => {
    expect(renderNote('**a *b* c**')).toBe('<p><strong>a <em>b</em> c</strong></p>');
  });

  test('bulleted lists use either marker', () => {
    expect(renderNote('- one\n* two')).toBe('<ul><li>one</li><li>two</li></ul>');
  });

  test('numbered lists', () => {
    expect(renderNote('1. one\n2. two')).toBe('<ol><li>one</li><li>two</li></ol>');
  });

  test('checklist items carry their line and their state', () => {
    expect(renderNote('intro\n\n- [ ] ask\n- [x] done')).toBe(
      '<p>intro</p><ul class="note-checklist">' +
        '<li><label><input type="checkbox" data-line="2"> <span>ask</span></label></li>' +
        '<li><label><input type="checkbox" data-line="3" checked> <span>done</span></label></li></ul>',
    );
  });

  test('a block quote joins its lines', () => {
    expect(renderNote('> first\n> second')).toBe('<blockquote>first<br>second</blockquote>');
  });

  test('a list ends where another kind of line begins', () => {
    expect(renderNote('- a\n1. b\ntext')).toBe('<ul><li>a</li></ul><ol><li>b</li></ol><p>text</p>');
  });

  test('links to http, https and mailto are links that open safely', () => {
    expect(renderNote('[site](https://example.com/a?b=1&c=2)')).toBe(
      '<p><a href="https://example.com/a?b=1&amp;c=2" rel="noopener noreferrer">site</a></p>',
    );
    expect(renderNote('[mail](mailto:a@b.example)')).toContain('href="mailto:a@b.example"');
    expect(renderNote('[plain](http://example.com)')).toContain('href="http://example.com"');
  });

  test.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x', '/relative', '//host/path', 'ftp://host/file', ''])(
    'a link to %j keeps its text and is not a link',
    (target) => {
      const html = renderNote(`[click me](${target})`);
      expect(html).toBe('<p>click me</p>');
      expect(html).not.toMatch(/<a\b/i);
    },
  );

  test('the text of a refused link is still marked up', () => {
    expect(renderNote('[**go**](javascript:x)')).toBe('<p><strong>go</strong></p>');
  });

  test('raw HTML is shown as text', () => {
    expect(renderNote('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
    expect(renderNote('<img src=x onerror=alert(1)>')).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  });

  test('markup in a list item, a quote and a link text is escaped too', () => {
    expect(renderNote('- <b>x</b>')).toBe('<ul><li>&lt;b&gt;x&lt;/b&gt;</li></ul>');
    expect(renderNote('> <i>q</i>')).toBe('<blockquote>&lt;i&gt;q&lt;/i&gt;</blockquote>');
    expect(renderNote('[<u>t</u>](https://e.example)')).toContain('&lt;u&gt;t&lt;/u&gt;');
    expect(renderNote('- [ ] <b>x</b>')).toContain('&lt;b&gt;x&lt;/b&gt;');
  });

  test('a page address with parentheses is one link target', () => {
    expect(renderNote('[w](https://en.example/wiki/Fang_(film))')).toContain('href="https://en.example/wiki/Fang_(film)"');
  });

  test('a quote or an ampersand cannot break out of the link attribute', () => {
    const html = renderNote('[x](https://e.example/"onmouseover="alert(1))');
    expect(html).not.toMatch(/onmouseover=/);
    expect(html).toBe('<p>x</p>');
  });

  test('headings are not offered: they are text', () => {
    expect(renderNote('# Title\n## Smaller')).toBe('<p># Title<br>## Smaller</p>');
  });

  test('unbalanced markers are text', () => {
    expect(renderNote('**open')).toBe('<p>**open</p>');
    expect(renderNote('a * b')).toBe('<p>a * b</p>');
    expect(renderNote('*open')).toBe('<p>*open</p>');
    expect(renderNote('[open](')).toBe('<p>[open](</p>');
    expect(renderNote('[open]')).toBe('<p>[open]</p>');
  });

  test('a star between spaces is not italic and a star list marker is not italic', () => {
    expect(renderNote('2 * 3 * 4')).toBe('<p>2 * 3 * 4</p>');
    expect(renderNote('* item *with* stars')).toBe('<ul><li>item <em>with</em> stars</li></ul>');
  });

  test('Windows and old Mac line endings are line endings', () => {
    expect(renderNote('a\r\nb\r\n\r\nc')).toBe('<p>a<br>b</p><p>c</p>');
    expect(renderNote('a\rb')).toBe('<p>a<br>b</p>');
  });

  test('a very long line renders at once', () => {
    const started = Date.now();
    const html = renderNote(`${'[*'.repeat(20_000)}${'**x '.repeat(5_000)}`);
    expect(html.length).toBeGreaterThan(0);
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  test('whatever is typed, only the allowed tags come out and every attribute value is escaped', () => {
    const random = seededRandom(7);
    const alphabet = ['*', '**', '_', '[', ']', '(', ')', '<', '>', '&', '"', "'", '- ', '1. ', '> ', '[ ] ', '[x] ', '\n', '\n\n', ' ', 'a', 'B', 'http://x.y', 'javascript:', 'onerror=', '<script>', '</p>', '#'];
    const tag = /<\/?(?:p|strong|em|ul|ol|li|blockquote|br|span|label)(?: class="note-checklist")?>|<a href="[^"<>]*" rel="noopener noreferrer">|<\/a>|<input type="checkbox" data-line="\d+"(?: checked)?>/g;
    for (let round = 0; round < 400; round += 1) {
      const body = Array.from({ length: 1 + Math.floor(random() * 40) }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
      const leftover = renderNote(body).replace(tag, '');
      expect(leftover, body).not.toMatch(/[<>]/);
      expect(leftover.replace(/&(?:amp|lt|gt|quot|#39);/g, ''), body).not.toMatch(/&/);
    }
  });
});

describe('toggleChecklistLine', () => {
  const body = 'Intro\n\n- [ ] one\n- [x] two\n- [ ] three\nafter';

  test('ticks an unticked item and unticks a ticked one', () => {
    expect(toggleChecklistLine(body, 2)).toBe('Intro\n\n- [x] one\n- [x] two\n- [ ] three\nafter');
    expect(toggleChecklistLine(body, 3)).toBe('Intro\n\n- [ ] one\n- [ ] two\n- [ ] three\nafter');
  });

  test('changes only that line', () => {
    const toggled = toggleChecklistLine(body, 4).split('\n');
    const before = body.split('\n');
    expect(toggled.filter((line, at) => line !== before[at])).toEqual(['- [x] three']);
  });

  test('toggling twice restores the body', () => {
    for (const line of [2, 3, 4]) expect(toggleChecklistLine(toggleChecklistLine(body, line), line)).toBe(body);
  });

  test('keeps Windows line endings', () => {
    expect(toggleChecklistLine('- [ ] a\r\n- [ ] b', 1)).toBe('- [ ] a\r\n- [x] b');
  });

  test('a line that is not a checklist item, or is not there, changes nothing', () => {
    expect(toggleChecklistLine(body, 0)).toBe(body);
    expect(toggleChecklistLine(body, 5)).toBe(body);
    expect(toggleChecklistLine(body, 99)).toBe(body);
    expect(toggleChecklistLine('', 0)).toBe('');
  });

  test('the line a rendered checkbox names is the line toggled', () => {
    const text = '- [ ] a\n\n- [ ] b';
    const named = [...renderNote(text).matchAll(/data-line="(\d+)"/g)].map((match) => Number(match[1]));

    expect(named).toEqual([0, 2]);
    expect(toggleChecklistLine(text, named[1])).toBe('- [ ] a\n\n- [x] b');
  });
});

describe('escapeHtml and isSafeLink', () => {
  test('escapes the five characters', () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  });

  test('allows only http, https and mailto, trimmed', () => {
    expect(isSafeLink(' https://example.com ')).toBe(true);
    expect(isSafeLink('javascript:alert(1)')).toBe(false);
    expect(isSafeLink('https://exa mple.com')).toBe(false);
  });
});
