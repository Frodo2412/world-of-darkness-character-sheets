import { describe, expect, it } from 'vitest';
import { blankCharacter, type V20Character } from '../../../domain/v20/character';
import { makeCurrent, startSession } from '../../../domain/v20/journal/sessions';
import { counterStamp } from '../../../domain/v20/journal/testing/stamp';
import { afterRender, appBarLabel } from './appBarLabel';

function character(chronicle: string, ...sessions: string[]): V20Character {
  const stamp = counterStamp();
  const made = blankCharacter('abc');
  made.header.chronicle = chronicle;
  for (const title of sessions) made.journal = startSession(made.journal, title, stamp);
  return made;
}

describe('appBarLabel', () => {
  it('names the chronicle and the current session', () => {
    expect(appBarLabel(character('The Glass City', 'Session 11', 'Session 12'))).toBe('The Glass City / Session 12');
  });

  it('is the chronicle alone while no session has been started', () => {
    expect(appBarLabel(character('The Glass City'))).toBe('The Glass City');
  });

  it('is the session alone when there is no chronicle', () => {
    expect(appBarLabel(character('', 'Session 12'))).toBe('Session 12');
  });

  it('is empty with neither', () => {
    expect(appBarLabel(character(''))).toBe('');
  });

  it('is trimmed, and a chronicle of spaces counts as none', () => {
    expect(appBarLabel(character('  The Glass City ', ' Session 12 '))).toBe('The Glass City / Session 12');
    expect(appBarLabel(character('   ', 'Session 12'))).toBe('Session 12');
  });

  it('follows the session made current', () => {
    const made = character('The Glass City', 'Session 11', 'Session 12');
    made.journal = makeCurrent(made.journal, made.journal.sessions[0].id);

    expect(appBarLabel(made)).toBe('The Glass City / Session 11');
  });
});

describe('afterRender', () => {
  const slot = (): { textContent: string } & HTMLElement => ({ textContent: '' }) as never;

  it('fills the slot it finds in the page', () => {
    const label = slot();
    const root = { querySelector: (selector: string) => (selector === '[data-app-bar-label]' ? label : null) } as unknown as HTMLElement;

    afterRender(character('The Glass City', 'Session 12'), root);

    expect(label.textContent).toBe('The Glass City / Session 12');
  });

  it('leaves a page without the slot alone', () => {
    const root = { querySelector: () => null } as unknown as HTMLElement;

    expect(() => afterRender(character('The Glass City', 'Session 12'), root)).not.toThrow();
  });
});
