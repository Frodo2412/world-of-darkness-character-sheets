import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Colours and typefaces are tokens in global.css; the roster's styles only refer to them.

const COLOUR_FUNCTIONS =
  'rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark';

const withoutComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every hex colour and colour function in `css`. */
function rawColours(css: string): string[] {
  const text = withoutComments(css);
  return [
    ...(text.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []),
    ...(text.match(new RegExp(`(?<![\\w-])(?:${COLOUR_FUNCTIONS})\\(`, 'gi')) ?? []),
  ];
}

/** Every font declaration that names a typeface instead of going through a `var()`. */
function rawTypefaces(css: string): string[] {
  const declarations = withoutComments(css).match(/(?<![\w-])font(?:-family)?\s*:[^;}]*/g) ?? [];
  return declarations.filter((declaration) => {
    const [property, value] = declaration.split(/:(.*)/s).map((part) => part.trim());
    if (property === 'font-family') return !/^var\(--font-[\w-]+\)$/.test(value);
    // The font shorthand carries a family too; only inheriting it is safe.
    return value !== 'inherit';
  });
}

describe('the checks', () => {
  it('find hex colours and colour functions', () => {
    expect(rawColours('a { color: #fff; background: #0b0c0f; }')).toEqual(['#fff', '#0b0c0f']);
    expect(rawColours('a { color: rgb(0 0 0 / 0.7); border-color: HSL(0 0% 0%); }')).toEqual([
      'rgb(',
      'HSL(',
    ]);
    expect(rawColours('a { color: oklch(0.5 0.1 20); fill: color-mix(in srgb, red, blue); }')).toEqual([
      'oklch(',
      'color-mix(',
    ]);
  });

  it('pass colours that are tokens, and the word "color" in a property name', () => {
    expect(rawColours('a { color: var(--color-text); border-color: var(--color-line); }')).toEqual([]);
    expect(rawColours('/* #fff and rgb(0 0 0) are explained here */ a { margin: 0; }')).toEqual([]);
  });

  it('find a typeface written out, in either property', () => {
    expect(rawTypefaces("a { font-family: 'Inter', sans-serif; }")).toHaveLength(1);
    expect(rawTypefaces('a { font: 12px Georgia; }')).toHaveLength(1);
    expect(rawTypefaces('a { font-family: var(--font-body), serif; }')).toHaveLength(1);
  });

  it('pass a typeface that is a token or inherited', () => {
    expect(rawTypefaces('a { font-family: var(--font-display); }')).toEqual([]);
    expect(rawTypefaces('a { font: inherit; font-size: var(--text-body); }')).toEqual([]);
  });
});

describe('roster.css', () => {
  const css = readFileSync(new URL('./roster.css', import.meta.url), 'utf8');

  it('has no raw colour', () => {
    expect(rawColours(css)).toEqual([]);
  });

  it('names every typeface through a token', () => {
    expect(rawTypefaces(css)).toEqual([]);
  });
});
