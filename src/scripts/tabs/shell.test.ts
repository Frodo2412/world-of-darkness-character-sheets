import { describe, expect, it } from 'vitest';
import { blankCharacter, setTrait, type V20Character } from '../../domain/v20/character';
import { createPool } from '../sheet/pool';
import type { MountedTab, TabContext } from './context';
import type { TabDescriptor } from './descriptor';
import type { Observer } from '../sheet/observers/index';
import type { Announce, Stamp } from './services';
import { createShell, type ShellView } from './shell';
import { showText } from './showText';

/** A tab that writes what it is asked to do into `log`, prefixed with its key. */
function recordingTab(
  key: string,
  log: string[],
  extra: Partial<MountedTab> = {},
  showsResources = true,
): { descriptor: TabDescriptor; contexts: TabContext[] } {
  const contexts: TabContext[] = [];
  const descriptor: TabDescriptor = {
    key,
    label: key,
    order: key === 'sheet' ? 0 : 10,
    showsResources,
    mount: async () => ({
      mount(ctx) {
        contexts.push(ctx);
        log.push(`${key}:mount`);
        return {
          render: (_character, mode) => void log.push(`${key}:render:${mode}`),
          enter: () => void log.push(`${key}:enter`),
          leave: () => void log.push(`${key}:leave`),
          changed: () => void log.push(`${key}:changed`),
          ...extra,
        };
      },
    }),
  };
  return { descriptor, contexts };
}

const stamp: Stamp = { newId: () => 'id-1', now: () => 1_000 };

function setup(
  descriptors: TabDescriptor[],
  log: string[],
  mode: { value: 'play' | 'edit' } = { value: 'play' },
  extras: { observers?: Observer[]; announce?: Announce } = {},
) {
  const saved: V20Character[] = [];
  const resources: boolean[] = [];
  const view: ShellView = {
    show: (tab) => void log.push(`view:show:${tab.key}`),
    focus: (tab) => void log.push(`view:focus:${tab.key}`),
    showResources: (visible) => void resources.push(visible),
    afterRender: (_character, _mode, tab) => void log.push(`view:after:${tab.key}`),
    applied: () => void log.push('view:applied'),
  };
  const shell = createShell({
    tabs: descriptors,
    character: blankCharacter('a1'),
    mode: () => mode.value,
    pool: createPool(),
    rootOf: () => ({}) as HTMLElement,
    save: (character) => void saved.push(character),
    push: (key) => void log.push(`push:${key}`),
    announce: extras.announce ?? (() => {}),
    stamp,
    observers: extras.observers ?? [],
    pageRoot: page,
    view,
  });
  return { shell, saved, resources, mode };
}

const page = {} as HTMLElement;
const strength = (character: V20Character) => setTrait(character, 'attributes.strength', 4);

describe('the shell and a tab', () => {
  it('mounts the first tab once and draws it, after entering it', async () => {
    const log: string[] = [];
    const { descriptor } = recordingTab('sheet', log);
    const { shell } = setup([descriptor], log);

    await shell.switchTo('sheet');

    expect(log).toEqual(['view:show:sheet', 'sheet:mount', 'sheet:enter', 'sheet:render:play', 'view:after:sheet']);
  });

  it('draws only the active tab, once per edit and once per mode change', async () => {
    const log: string[] = [];
    const sheet = recordingTab('sheet', log).descriptor;
    const combat = recordingTab('combat', log).descriptor;
    const { shell, mode } = setup([sheet, combat], log);
    await shell.switchTo('sheet');
    await shell.switchTo('combat');
    log.length = 0;

    shell.apply(strength);
    mode.value = 'edit';
    shell.modeChanged();

    expect(log.filter((entry) => entry.includes(':render:'))).toEqual(['combat:render:play', 'combat:render:edit']);
  });

  it('saves once per edit, and tells the tab what changed after it was drawn', async () => {
    const log: string[] = [];
    const befores: V20Character[] = [];
    const sheet = recordingTab('sheet', log, { changed: (before) => void befores.push(before) }).descriptor;
    const { shell, saved } = setup([sheet], log);
    await shell.switchTo('sheet');
    log.length = 0;

    const after = shell.apply(strength);

    expect(saved).toEqual([after]);
    expect(befores).toEqual([blankCharacter('a1')]);
    expect(log).toEqual(['sheet:render:play', 'view:after:sheet', 'view:applied']);
  });

  it('leaves the old tab before entering the next, and does not mount a tab twice', async () => {
    const log: string[] = [];
    const sheet = recordingTab('sheet', log).descriptor;
    const combat = recordingTab('combat', log).descriptor;
    const { shell } = setup([sheet, combat], log);
    await shell.switchTo('sheet');
    log.length = 0;

    await shell.switchTo('combat');
    await shell.switchTo('sheet');

    expect(log.filter((entry) => /:(mount|enter|leave)$/.test(entry))).toEqual([
      'sheet:leave',
      'combat:mount',
      'combat:enter',
      'combat:leave',
      'sheet:enter',
    ]);
  });

  it('does nothing when asked for the tab it is already on', async () => {
    const log: string[] = [];
    const { descriptor } = recordingTab('sheet', log);
    const { shell } = setup([descriptor], log);
    await shell.switchTo('sheet');
    log.length = 0;

    await shell.switchTo('sheet');

    expect(log).toEqual([]);
  });

  it('shows the resources row only on tabs that show it', async () => {
    const log: string[] = [];
    const sheet = recordingTab('sheet', log).descriptor;
    const levelUp = recordingTab('level-up', log, {}, false).descriptor;
    const { shell, resources } = setup([sheet, levelUp], log);

    await shell.switchTo('sheet');
    await shell.switchTo('level-up');
    await shell.switchTo('sheet');

    expect(resources).toEqual([true, false, true]);
  });

  it('enters and draws the tab asked for last when a slower one is still loading', async () => {
    const log: string[] = [];
    const sheet = recordingTab('sheet', log).descriptor;
    let release!: () => void;
    const slow: TabDescriptor = {
      ...recordingTab('combat', log).descriptor,
      mount: () =>
        new Promise((resolve) => {
          release = () => resolve({ mount: () => ({ render: () => void log.push('combat:render') }) });
        }),
    };
    const { shell } = setup([sheet, slow], log);
    await shell.switchTo('sheet');
    log.length = 0;

    const toCombat = shell.switchTo('combat');
    await shell.switchTo('sheet');
    release();
    await toCombat;

    expect(log.filter((entry) => entry.startsWith('combat:'))).toEqual([]);
    expect(log.at(-1)).toBe('view:after:sheet');
  });

  it('keeps an input the player is typing in as it is when the tab draws it again', () => {
    const input = { value: 'Ada' };
    const writes: string[] = [];
    const watched = {
      get value() {
        return input.value;
      },
      set value(next: string) {
        writes.push(next);
        input.value = next;
      },
    };

    showText(watched, 'Ada');
    expect(writes).toEqual([]);

    showText(watched, 'Ada L');
    expect(writes).toEqual(['Ada L']);
  });
});

describe('what the shell offers every tab', () => {
  it('runs the observers after every draw, whatever tab is shown, with the page', async () => {
    const log: string[] = [];
    const seen: unknown[] = [];
    const observer: Observer = {
      afterRender: (character, root) => {
        log.push('observer');
        seen.push(root);
      },
    };
    const sheet = recordingTab('sheet', log).descriptor;
    const combat = recordingTab('combat', log).descriptor;
    const { shell } = setup([sheet, combat], log, { value: 'play' }, { observers: [observer] });

    await shell.switchTo('sheet');
    shell.apply(strength);
    await shell.switchTo('combat');
    shell.apply(strength);

    expect(log.filter((entry) => entry === 'observer' || entry.startsWith('view:after'))).toEqual([
      'view:after:sheet',
      'observer',
      'view:after:sheet',
      'observer',
      'view:after:combat',
      'observer',
      'view:after:combat',
      'observer',
    ]);
    expect(seen.every((root) => root === page)).toBe(true);
  });

  it('gives a tab the announcer and the stamp the page uses', async () => {
    const log: string[] = [];
    const said: string[] = [];
    const { descriptor, contexts } = recordingTab('sheet', log);
    const { shell } = setup([descriptor], log, { value: 'play' }, { announce: (text) => void said.push(text) });
    await shell.switchTo('sheet');

    contexts[0].announce('3 XP awarded. Available 8.');

    expect(said).toEqual(['3 XP awarded. Available 8.']);
    expect(contexts[0].stamp).toBe(stamp);
  });
});

describe('opening a tab as the player does', () => {
  it('adds the history entry first, then switches, and puts focus in the panel last', async () => {
    const log: string[] = [];
    const sheet = recordingTab('sheet', log).descriptor;
    const combat = recordingTab('combat', log).descriptor;
    const { shell } = setup([sheet, combat], log);
    await shell.switchTo('sheet');
    log.length = 0;

    await shell.open('combat');

    expect(log).toEqual([
      'push:combat',
      'sheet:leave',
      'view:show:combat',
      'combat:mount',
      'combat:enter',
      'combat:render:play',
      'view:after:combat',
      'view:focus:combat',
    ]);
  });

  it('does nothing for the tab already shown', async () => {
    const log: string[] = [];
    const sheet = recordingTab('sheet', log).descriptor;
    const { shell } = setup([sheet, recordingTab('combat', log).descriptor], log);
    await shell.switchTo('sheet');
    log.length = 0;

    await shell.open('sheet');

    expect(log).toEqual([]);
  });

  it('is available to a tab through its context, as openTab', async () => {
    const log: string[] = [];
    const { descriptor, contexts } = recordingTab('sheet', log);
    const { shell } = setup([descriptor, recordingTab('combat', log).descriptor], log);
    await shell.switchTo('sheet');
    log.length = 0;

    await contexts[0].openTab('combat');

    expect(log[0]).toBe('push:combat');
    expect(log.at(-1)).toBe('view:focus:combat');
  });

  it('moves no focus and adds no entry when Back or Forward switches the tab', async () => {
    const log: string[] = [];
    const sheet = recordingTab('sheet', log).descriptor;
    const { shell } = setup([sheet, recordingTab('combat', log).descriptor], log);
    await shell.switchTo('sheet');
    log.length = 0;

    await shell.switchTo('combat');

    expect(log.some((entry) => entry.startsWith('push:') || entry.startsWith('view:focus'))).toBe(false);
  });
});

describe('the pool the shell keeps for its tabs', () => {
  it('is toggled through the context, redraws the active tab, and is forgotten on a mode change', async () => {
    const log: string[] = [];
    const { descriptor, contexts } = recordingTab('sheet', log);
    const { shell, mode } = setup([descriptor], log);
    await shell.switchTo('sheet');
    const [ctx] = contexts;
    log.length = 0;

    ctx.togglePool('attributes.strength');
    expect(ctx.poolSelection()).toEqual({ attribute: 'attributes.strength' });
    expect(log).toContain('sheet:render:play');

    ctx.togglePool('attributes.strength');
    expect(ctx.poolSelection()).toEqual({});

    ctx.togglePool('abilities.brawl');
    mode.value = 'edit';
    shell.modeChanged();
    expect(ctx.poolSelection()).toEqual({});
  });

  it('is set whole through the context by selectPool, and drawn', async () => {
    const log: string[] = [];
    const { descriptor, contexts } = recordingTab('sheet', log);
    const { shell } = setup([descriptor], log);
    await shell.switchTo('sheet');
    const [ctx] = contexts;
    ctx.togglePool('abilities.brawl');
    log.length = 0;

    ctx.selectPool({ attribute: 'attributes.dexterity', ability: 'abilities.melee' });

    expect(ctx.poolSelection()).toEqual({ attribute: 'attributes.dexterity', ability: 'abilities.melee' });
    expect(log).toContain('sheet:render:play');
  });

  it('reaches the tab as a copy it cannot change the shell through', async () => {
    const log: string[] = [];
    const { descriptor, contexts } = recordingTab('sheet', log);
    const { shell } = setup([descriptor], log);
    await shell.switchTo('sheet');
    const [ctx] = contexts;

    ctx.togglePool('attributes.strength');
    Object.assign(ctx.poolSelection(), { attribute: undefined });

    expect(ctx.poolSelection()).toEqual({ attribute: 'attributes.strength' });
  });
});
