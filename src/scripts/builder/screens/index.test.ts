import { afterAll, describe, expect, it, vi } from 'vitest';
import { SCREENS } from '../../../domain/v20/creation/rules';

// The screen modules reach for the page's elements when they load (the save status, the views). A
// document that finds none lets them load here; nothing in this file draws.
vi.stubGlobal('document', { querySelector: () => null });
afterAll(() => vi.unstubAllGlobals());

const { screenModuleProblems, screenModules } = await import('./index');

const fake = (id: string) => ({ id, wire() {}, render() {} }) as never;
const allModules = () => Object.fromEntries(SCREENS.map(({ id }) => [`./${id}.ts`, fake(id)]));

describe('screenModuleProblems', () => {
  it('finds nothing when every screen id has the module named for it', () => {
    expect(screenModuleProblems(allModules())).toEqual([]);
  });

  it('names a screen id with no module', () => {
    const { './clan.ts': _clan, ...rest } = allModules();
    expect(screenModuleProblems(rest)).toEqual(['The screen "clan" has no module in screens/']);
  });

  it('names a module that has no known screen id', () => {
    expect(screenModuleProblems({ ...allModules(), './extra.ts': fake('extra') })).toEqual([
      './extra.ts has the id "extra", which is not a screen',
    ]);
  });

  it('names a module whose id is not its file name, since the file is how it is found', () => {
    expect(screenModuleProblems({ ...allModules(), './clan.ts': fake('concept') })).toEqual([
      './clan.ts has the id "concept", not "clan"',
      'The screen "clan" has no module in screens/',
    ]);
  });
});

describe('the screen modules', () => {
  it('are one per screen id, in screen order', () => {
    expect(screenModules.map((screen) => screen.id)).toEqual(SCREENS.map(({ id }) => id));
  });
});
