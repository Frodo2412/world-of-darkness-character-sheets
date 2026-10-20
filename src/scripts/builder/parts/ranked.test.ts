import { describe, expect, it } from 'vitest';
import type { UpdateResult } from '../../../domain/v20/creation/result';
import { wireAddField } from './ranked';

/** An add field and its button, with the listeners the wiring registers, and the names `add` is given. */
function setup(outcome: UpdateResult['status'] = 'applied') {
  const added: string[] = [];
  const keys: ((event: { key: string; isComposing: boolean }) => void)[] = [];
  const clicks: (() => void)[] = [];
  const input = { value: 'Celerity', addEventListener: (_type: string, listener: (typeof keys)[number]) => void keys.push(listener) };
  const button = {
    parentElement: { querySelector: () => input },
    addEventListener: (_type: string, listener: () => void) => void clicks.push(listener),
  };
  wireAddField(button as unknown as HTMLButtonElement, (name) => {
    added.push(name);
    return outcome;
  });
  return { input, added, press: (key: string, isComposing = false) => keys.forEach((listener) => listener({ key, isComposing })), click: () => clicks.forEach((listener) => listener()) };
}

describe('wireAddField', () => {
  it('adds the typed name on Enter, then empties the field', () => {
    const { input, added, press } = setup();
    press('Enter');
    expect(added).toEqual(['Celerity']);
    expect(input.value).toBe('');
  });

  it('adds the typed name when the button is pressed', () => {
    const { added, click } = setup();
    click();
    expect(added).toEqual(['Celerity']);
  });

  it('leaves a refused name as typed', () => {
    const { input, press } = setup('refused');
    press('Enter');
    expect(input.value).toBe('Celerity');
  });

  it('ignores the Enter that ends an input-method composition', () => {
    const { input, added, press } = setup();
    press('Enter', true);
    expect(added).toEqual([]);
    expect(input.value).toBe('Celerity');
  });

  it('ignores other keys', () => {
    const { added, press } = setup();
    press('a');
    expect(added).toEqual([]);
  });
});
