import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Scenarios share one set of step definitions, matched by keyword and text. A phrase defined twice
// is either an error at generation time or, worse, a step that quietly means two things.

const STEPS = new URL('../features/steps/', import.meta.url).pathname;

const filesIn = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesIn(join(directory, entry.name)) : entry.name.endsWith('.ts') ? [join(directory, entry.name)] : [],
  );

interface Definition {
  keyword: 'Given' | 'When' | 'Then';
  /** The text, or the regular expression's source. */
  text: string;
  file: string;
}

/** Every step defined with a literal text or a regular expression; one whose text is built in code is not listed. */
function definitions(): Definition[] {
  const literal = /\b(Given|When|Then)\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\$]|\\.)*)`|\/((?:[^/\\\n]|\\.)+)\/[a-z]*)/g;
  return filesIn(STEPS).flatMap((path) => {
    const file = path.slice(STEPS.length);
    const source = readFileSync(path, 'utf8');
    return [...source.matchAll(literal)].map((match) => ({
      keyword: match[1] as Definition['keyword'],
      text: match[2] ?? match[3] ?? match[4] ?? `/${match[5]}/`,
      file,
    }));
  });
}

describe('step definitions', () => {
  it('are found', () => {
    expect(definitions().length).toBeGreaterThan(100);
  });

  it('never define one keyword and text twice', () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const { keyword, text, file } of definitions()) {
      const key = `${keyword} ${text}`;
      if (seen.has(key)) duplicates.push(`${key} (in ${seen.get(key)} and ${file})`);
      else seen.set(key, file);
    }
    expect(duplicates).toEqual([]);
  });

  it('keep the shared phrases of every tab in shared.steps.ts, each defined once', () => {
    const phrases: [Definition['keyword'], string][] = [
      ['Given', 'a saved character'],
      ['Given', 'a character in play mode'],
      ['Given', 'a character in edit mode'],
      ['Given', 'a character with no session'],
      ['When', 'the Combat tab is opened'],
      ['When', 'the Level up tab is scanned for accessibility problems'],
      ['When', 'the Journal tab is opened at 320 pixels wide with crowded content'],
      ['Then', 'the read-only hint is shown'],
      ['Then', 'nothing on the tab can be edited'],
      ['Then', 'the start-a-session prompt is shown'],
      ['Then', 'no problems are reported'],
      ['Then', 'the page does not scroll sideways'],
    ];
    const all = definitions();
    for (const [keyword, phrase] of phrases) {
      const matching = all.filter(
        (definition) =>
          definition.keyword === keyword &&
          (definition.text.startsWith('/') ? new RegExp(definition.text.slice(1, -1)).test(phrase) : definition.text === phrase),
      );
      expect(matching.map((definition) => `${definition.keyword} ${definition.text} (${definition.file})`), phrase).toHaveLength(1);
      expect(matching[0].file, phrase).toBe('shared.steps.ts');
    }
  });
});
