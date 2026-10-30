import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The tabs share a page with the Character sheet's stylesheet, whose class names are short and common
// (`.power`, `.discipline-entry`). A tab that reuses one inherits its rules, so the tabs' own
// stylesheets may not define a class an older stylesheet does.

const styles = new URL('./', import.meta.url);
const read = (url: URL): string => readFileSync(url, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The classes a stylesheet's selectors name. */
function classesOf(css: string): Set<string> {
  const found = new Set<string>();
  for (const [, selector] of css.matchAll(/([^{}]+)\{/g)) {
    if (selector.trim().startsWith('@')) continue;
    for (const [, name] of selector.matchAll(/\.([a-zA-Z_][\w-]*)/g)) found.add(name);
  }
  return found;
}

const older = ['global.css', 'sheet.css', 'roster.css', 'builder.css', '../components/controls/controls.css'].flatMap((file) => [
  ...classesOf(read(new URL(file, styles))),
]);

/** The folders' own stylesheets, and the shared ones every tab uses. */
function tabStylesheets(): URL[] {
  const folder = new URL('../tabs/', import.meta.url);
  const own = readdirSync(folder, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.css'))
    .map((file) => new URL(file, folder));
  return [new URL('dossier.css', styles), new URL('tabs.css', styles), ...own];
}

/** The builder's partials, one per screen: each may reuse neither an older stylesheet's class nor the shell's. */
function builderPartials(): URL[] {
  const folder = new URL('builder/', styles);
  return existsSync(folder)
    ? readdirSync(folder)
        .filter((file) => file.endsWith('.css'))
        .map((file) => new URL(file, folder))
    : [];
}

/** Classes the shared stylesheet restyles on purpose: the Character sheet's rating dots and the sheet root. */
const SHARED_ON_PURPOSE = new Set(['rating-mark', 'is-filled', 'sheet']);

describe("the tabs' class names", () => {
  for (const sheet of tabStylesheets()) {
    it(`${sheet.pathname.split('/src/')[1]} defines no class the older stylesheets define`, () => {
      const clashes = [...classesOf(read(sheet))].filter((name) => older.includes(name) && !SHARED_ON_PURPOSE.has(name));
      expect(clashes).toEqual([]);
    });
  }

  for (const sheet of builderPartials()) {
    it(`${sheet.pathname.split('/src/')[1]} defines no class the older stylesheets or the builder shell define`, () => {
      const clashes = [...classesOf(read(sheet))].filter((name) => older.includes(name));
      expect(clashes).toEqual([]);
    });
  }

  it('reads the builder partials, so a pass is not an empty parse', () => {
    expect(builderPartials().map((sheet) => sheet.pathname)).toEqual(
      expect.arrayContaining([expect.stringMatching(/styles\/builder\/clan\.css$/)]),
    );
  });

  it('reads the older stylesheets, so a pass is not an empty parse', () => {
    expect(older).toEqual(expect.arrayContaining(['card', 'power', 'discipline-entry', 'rating-mark']));
  });
});
