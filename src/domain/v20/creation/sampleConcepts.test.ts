import { describe, expect, test } from 'vitest';
import { SAMPLE_CONCEPTS, sampleConceptLine } from './sampleConcepts';
import { CONCEPT_KINDS } from './rules';
import { setConceptKind } from './updates';
import { blankBuild } from './build';

const words = (line: string): string[] => line.split(/\s+/).filter(Boolean);

/** Any pronoun at all, including the relative ones: the lines name roles and acts, never a person. */
const PRONOUN =
  /\b(?:i|me|my|mine|myself|we|us|our|ours|ourselves|you|your|yours|yourself|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|who|whom|whose|which|that|this|these|those)\b/i;

describe('the sample concepts', () => {
  test('are the fourteen names, in the order the screen offers them', () => {
    expect(SAMPLE_CONCEPTS.map((sample) => sample.name)).toEqual([...CONCEPT_KINDS]);
    expect(SAMPLE_CONCEPTS).toHaveLength(14);
  });

  test.each(SAMPLE_CONCEPTS)('$name has an original one-liner of at most twelve words, with no pronoun', ({ line }) => {
    expect(line.trim()).not.toBe('');
    expect(words(line).length).toBeLessThanOrEqual(12);
    expect(line).not.toMatch(PRONOUN);
  });

  test('no two share a line', () => {
    expect(new Set(SAMPLE_CONCEPTS.map((sample) => sample.line)).size).toBe(SAMPLE_CONCEPTS.length);
  });

  test('a line is found by name, and only for a sample concept', () => {
    expect(sampleConceptLine('Intellectual')).toBe(SAMPLE_CONCEPTS.find((sample) => sample.name === 'Intellectual')!.line);
    expect(sampleConceptLine('')).toBeUndefined();
    expect(sampleConceptLine('Vampire')).toBeUndefined();
  });

  test('every one is accepted by the build, and a name outside them is refused', () => {
    for (const { name } of SAMPLE_CONCEPTS) expect(setConceptKind(blankBuild('a'), name).status).toBe('applied');
    expect(setConceptKind(blankBuild('a'), 'Vampire').status).toBe('refused');
  });
});
