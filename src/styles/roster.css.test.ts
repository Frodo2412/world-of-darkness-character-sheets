import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Colours and typefaces are tokens in global.css; the roster's styles only refer to them.

const COLOUR_FUNCTIONS =
  'rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark';

const NAMED_COLOURS =
  'red|white|black|gray|grey|blue|green|yellow|orange|purple|pink|brown|silver|gold|maroon|navy|teal';

// The properties whose value is a colour, or holds one (shorthands, shadows). `transparent`,
// `currentColor` and the CSS-wide keywords are not named colours, so they stay allowed.
const COLOUR_PROPERTY =
  /^(?:color|background(?:-color)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?|outline(?:-color)?|fill|stroke|caret-color|accent-color|text-decoration(?:-color)?|column-rule(?:-color)?|box-shadow|text-shadow)$/;

const withoutComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every hex colour and colour function in `css`. */
function rawColours(css: string): string[] {
  const text = withoutComments(css);
  return [
    ...(text.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []),
    ...(text.match(new RegExp(`(?<![\\w-])(?:${COLOUR_FUNCTIONS})\\(`, 'gi')) ?? []),
  ];
}

/** Every CSS named colour used as a value of a colour property. */
function namedColours(css: string): string[] {
  const named = new RegExp(`(?<![\\w-])(?:${NAMED_COLOURS})(?![\\w-])`, 'gi');
  return (withoutComments(css).match(/[\w-]+\s*:[^;{}]*/g) ?? []).flatMap((declaration) => {
    const [property, value] = declaration.split(/:(.*)/s).map((part) => part.trim());
    if (!COLOUR_PROPERTY.test(property.toLowerCase())) return [];
    // A token's name ("var(--color-red)") and an address are not colours.
    return value.replace(/(?:var|url)\([^)]*\)/gi, '').match(named) ?? [];
  });
}

/** Every font declaration that names a typeface instead of going through a `var()`. */
function rawTypefaces(css: string): string[] {
  const declarations = withoutComments(css).match(/(?<![\w-])font(?:-family)?\s*:[^;}]*/g) ?? [];
  return declarations.filter((declaration) => {
    const [property, value] = declaration.split(/:(.*)/s).map((part) => part.trim());
    // Inheriting the family names no typeface of its own.
    if (value === 'inherit') return false;
    // The font shorthand carries a family too, so only a token or inheriting is safe there.
    if (property === 'font-family') return !/^var\(--font-[\w-]+\)$/.test(value);
    return true;
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

  it('find CSS named colours used as a colour', () => {
    expect(namedColours('a { color: red; background: white url(x.png); }')).toEqual(['red', 'white']);
    expect(namedColours('a { border: 1px solid Black; box-shadow: 0 0 4px gold; }')).toEqual([
      'Black',
      'gold',
    ]);
    expect(namedColours('a { fill: teal; outline-color: navy; border-top-color: grey; }')).toEqual([
      'teal',
      'navy',
      'grey',
    ]);
  });

  it('pass transparent, currentColor, the CSS-wide keywords and tokens', () => {
    const css =
      'a { color: inherit; background: transparent; border-color: currentColor; fill: initial; stroke: unset; outline: 1px solid var(--color-red); }';
    expect(namedColours(css)).toEqual([]);
  });

  it('pass words that are not colours', () => {
    expect(namedColours('a { color: var(--color-text); background-image: url(red.svg); }')).toEqual([]);
    expect(namedColours('.red { margin: 0; grid-area: red; }')).toEqual([]);
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
    expect(rawTypefaces('a { font-family: inherit; }')).toEqual([]);
  });
});

describe('roster.css', () => {
  const css = readFileSync(new URL('./roster.css', import.meta.url), 'utf8');

  it('has no raw colour', () => {
    expect(rawColours(css)).toEqual([]);
  });

  it('has no CSS named colour', () => {
    expect(namedColours(css)).toEqual([]);
  });

  it('names every typeface through a token', () => {
    expect(rawTypefaces(css)).toEqual([]);
  });
});
