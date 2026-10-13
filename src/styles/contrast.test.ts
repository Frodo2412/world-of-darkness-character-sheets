import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The new tabs' stylesheets are held to the sizes and contrasts WCAG 2.1 AA asks for, read from the
// CSS itself: text 4.5:1 (3:1 for large text), control borders 3:1, text at least 12px, controls at
// least 24 x 24px. Token names and values come from global.css; nothing is copied here.

const read = (url: URL): string => readFileSync(url, 'utf8');
const withoutComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every custom property declared in `css`, by name ("--color-text"). */
function tokensOf(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const [, name, value] of withoutComments(css).matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) tokens.set(name, value.trim());
  return tokens;
}

interface Rule {
  selector: string;
  declarations: Map<string, string>;
}

/** The rules of `css`, flat: a rule inside an at-rule is a rule like any other. */
function rulesOf(css: string): Rule[] {
  const rules: Rule[] = [];
  for (const [, selector, body] of withoutComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (selector.trim().startsWith('@')) continue;
    const declarations = new Map<string, string>();
    for (const [, property, value] of body.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)) declarations.set(property, value.trim());
    rules.push({ selector: selector.trim(), declarations });
  }
  return rules;
}

const hexOf = (value: string): [number, number, number] | undefined => {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex === undefined) return undefined;
  const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex;
  return [0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16)) as [number, number, number];
};

/** A colour value as red, green, blue: a hex colour, or a `var()` of a token that is one. Undefined for anything else (inherit, transparent, a gradient). */
function colourOf(value: string, tokens: Map<string, string>): [number, number, number] | undefined {
  const named = value.match(/^var\((--[\w-]+)\)$/);
  if (named !== null) {
    const token = tokens.get(named[1]);
    return token === undefined ? undefined : colourOf(token, tokens);
  }
  return hexOf(value);
}

/** WCAG relative luminance. */
const luminance = ([r, g, b]: [number, number, number]): number =>
  [r, g, b]
    .map((channel) => channel / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, index) => sum + c * [0.2126, 0.7152, 0.0722][index], 0);

export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/** A length in pixels (rem is 16px): a number with rem or px, or a `var()` of a token that is one. Undefined for anything else (calc, em, auto). */
function pixelsOf(value: string, tokens: Map<string, string>): number | undefined {
  const named = value.match(/^var\((--[\w-]+)\)$/);
  if (named !== null) {
    const token = tokens.get(named[1]);
    return token === undefined ? undefined : pixelsOf(token, tokens);
  }
  const length = value.match(/^(\d*\.?\d+)(rem|px)$/);
  if (length === null) return undefined;
  return Number(length[1]) * (length[2] === 'rem' ? 16 : 1);
}

/** The selectors of things the player presses or types in. */
const CONTROL =
  /(?:^|[\s.,>+~:])(?:button|input|select|textarea|summary)(?![\w-])|-(?:button|input|clear|start|segment|toggle|link)(?![\w-])/;

/** What the player reads or cannot reach in `css`, as sentences. Empty when it is all within the limits. */
export function problemsIn(css: string, tokens: Map<string, string>, surfaces: string[]): string[] {
  const problems: string[] = [];
  const surface = (name: string) => colourOf(`var(${name})`, tokens)!;
  for (const { selector, declarations } of rulesOf(css)) {
    const size = pixelsOf(declarations.get('font-size') ?? '', tokens);
    if (size !== undefined && size < 12) problems.push(`${selector}: text is ${size}px, under 12px`);

    const weight = Number(declarations.get('font-weight') ?? 400);
    const large = size !== undefined && (size >= 24 || (size >= 18.66 && weight >= 700));
    const needed = large ? 3 : 4.5;
    const text = declarations.get('color');
    const textColour = text === undefined ? undefined : colourOf(text, tokens);
    const background = declarations.get('background-color') ?? declarations.get('background');
    const backgroundColour = background === undefined ? undefined : colourOf(background, tokens);
    // A rule that sets only one side is read against the usual other: body text, or any surface.
    if (textColour !== undefined || backgroundColour !== undefined) {
      const foreground = textColour ?? surface('--color-text');
      const behind = backgroundColour === undefined ? surfaces.map(surface) : [backgroundColour];
      for (const colour of behind) {
        const ratio = contrastRatio(foreground, colour);
        if (ratio < needed) problems.push(`${selector}: text contrast ${ratio.toFixed(2)}:1, under ${needed}:1`);
      }
    }

    if (!CONTROL.test(selector)) continue;
    for (const [property, value] of declarations) {
      if (/^border(?:-[a-z]+)*$/.test(property)) {
        // A shorthand names its width, style and colour; the colour is the part that resolves to one.
        const edge = (value.match(/var\(--[\w-]+\)/g) ?? [value]).map((part) => colourOf(part, tokens)).find(Boolean);
        if (edge === undefined) continue;
        for (const colour of surfaces.map(surface)) {
          const ratio = contrastRatio(edge, colour);
          if (ratio < 3) problems.push(`${selector}: control border contrast ${ratio.toFixed(2)}:1, under 3:1`);
        }
      }
      if (/^(?:min-)?(?:block|inline)-size$|^(?:min-)?(?:width|height)$/.test(property)) {
        const pixels = pixelsOf(value, tokens);
        if (pixels !== undefined && property.startsWith('min-') && pixels < 24) problems.push(`${selector}: ${property} is ${pixels}px, under 24px`);
      }
    }
  }
  return [...new Set(problems)];
}

const styles = new URL('./', import.meta.url);
const tokens = tokensOf(read(new URL('global.css', styles)));

/** The stylesheets the new tabs ship: the shared one, the tab bar's, and one per tab folder. */
function tabStylesheets(): URL[] {
  const folder = new URL('../tabs/', import.meta.url);
  const own = existsSync(folder)
    ? readdirSync(folder, { recursive: true, encoding: 'utf8' })
        .filter((file) => file.endsWith('.css'))
        .map((file) => new URL(file, folder))
    : [];
  return [new URL('dossier.css', styles), new URL('tabs.css', styles), ...own];
}

/**
 * The colour tokens text is drawn on: every one global.css and the shared dossier.css use as the
 * background of a box (not of a marker or a bar), found in their rules, so the list is never a
 * second copy of the tokens. A tab's own stylesheet adds none: its pairs are checked against these.
 */
function surfacesOf(): string[] {
  const names = new Set<string>();
  for (const sheet of ['global.css', 'dossier.css']) {
    for (const { selector, declarations } of rulesOf(read(new URL(sheet, styles)))) {
      if (selector.includes('::')) continue;
      const value = declarations.get('background-color') ?? declarations.get('background') ?? '';
      const name = value.match(/^var\((--color-[\w-]+)\)$/)?.[1];
      if (name !== undefined) names.add(name);
    }
  }
  return [...names];
}

const surfaces = surfacesOf();

describe('the new tabs\' stylesheets', () => {
  for (const sheet of tabStylesheets()) {
    it(`${sheet.pathname.split('/src/')[1]} keeps to the contrast and size limits`, () => {
      expect(problemsIn(read(sheet), tokens, surfaces)).toEqual([]);
    });
  }
});

describe('the guard itself', () => {
  it('reads the rules of the stylesheets it guards, so a pass is not an empty parse', () => {
    const dossier = read(new URL('dossier.css', styles));
    expect(rulesOf(dossier).length).toBeGreaterThan(20);
    expect(problemsIn(dossier.replaceAll('var(--text-small)', 'var(--text-caption)'), tokens, surfaces)).not.toEqual([]);
    expect(problemsIn(dossier.replaceAll('var(--color-border-control)', 'var(--color-line)'), tokens, surfaces)).not.toEqual([]);
    expect(tabStylesheets().map((sheet) => sheet.pathname)).toEqual(
      expect.arrayContaining([expect.stringMatching(/styles\/dossier\.css$/), expect.stringMatching(/styles\/tabs\.css$/)]),
    );
  });

  it('reads the tokens from global.css', () => {
    expect(tokens.get('--color-text')).toMatch(/^#/);
    expect(tokens.get('--text-small')).toBe('0.75rem');
  });

  it('takes the backgrounds from the stylesheets, not from a list', () => {
    expect(surfaces).toEqual(expect.arrayContaining(['--color-page', '--color-surface', '--color-selected']));
    expect(surfaces).not.toContain('--color-text');
  });

  it('computes WCAG ratios', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
  });

  it('passes a pair that reads', () => {
    expect(problemsIn('.ok { color: var(--color-text); background: var(--color-surface); font-size: var(--text-body); }', tokens, surfaces)).toEqual([]);
  });

  it('fails a low-contrast pair', () => {
    const css = '.bad { color: var(--color-line); background: var(--color-surface); }';
    expect(problemsIn(css, tokens, surfaces)).toEqual([expect.stringContaining('.bad: text contrast')]);
  });

  it('fails accent used as text, which global.css keeps for fills and edges', () => {
    expect(problemsIn('.bad { color: var(--color-accent); }', tokens, surfaces)).not.toEqual([]);
  });

  it('fails a text size under 12px', () => {
    expect(problemsIn('.bad { font-size: var(--text-caption); }', tokens, surfaces)).toEqual(['.bad: text is 11px, under 12px']);
  });

  it('fails a control smaller than 24px', () => {
    expect(problemsIn('.dossier-bad-button { min-block-size: 1rem; }', tokens, surfaces)).toEqual([
      '.dossier-bad-button: min-block-size is 16px, under 24px',
    ]);
  });

  it('fails a control border that fades into its surface, even behind a width token', () => {
    expect(problemsIn('.dossier-bad-input { border: 1px solid var(--color-line); }', tokens, surfaces)).not.toEqual([]);
    expect(problemsIn('.dossier-bad-input { border: var(--stroke) solid var(--color-line); }', tokens, surfaces)).not.toEqual([]);
  });

  it('passes the control border global.css provides for the purpose', () => {
    expect(problemsIn('.dossier-ok-input { border: var(--stroke) solid var(--color-border-control); }', tokens, surfaces)).toEqual([]);
  });

  it('leaves a decorative edge on something that is not a control', () => {
    expect(problemsIn('.dossier-card { border: 1px solid var(--color-line); }', tokens, surfaces)).toEqual([]);
  });
});
