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
    loadFailed: (tab) => void log.push(`view:failed:${tab.key}`),
    unavailable: (tab) => void log.push(`view:unavailable:${tab.key}`),
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
    restore: (key) => void log.push(`restore:${key}`),
    announce: extras.announce ?? (() => {}),
    stamp,
    observers: extras.observers ?? [],
    pageRoot: page,
    view,
  });
  return { shell, saved, resources, mode };
}

const page = {} as HTMLElement;

/** A tab whose script fails to load (a lost chunk) or whose `mount` throws, until `state.failing` is cleared. */
function flakyTab(key: string, log: string[], how: 'load' | 'mount' = 'load') {
  const state = { failing: true, attempts: 0 };
  const good = recordingTab(key, log).descriptor;
  const descriptor: TabDescriptor = {
    ...good,
    mount: async () => {
      state.attempts += 1;
      if (!state.failing) return good.mount();
      if (how === 'load') throw new Error('chunk failed');
      return {
        mount: () => {
          throw new Error('mount threw');
        },
      };
    },
  };
  return { descriptor, state };
}

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

describe('a tab that throws while drawing', () => {
  it('does not stop an edit from being saved', async () => {
    const log: string[] = [];
    let throwing = false;
    const sheet = recordingTab('sheet', log, {
      render() {
        if (throwing) throw new Error('render threw');
      },
    }).descriptor;
    const { shell, saved } = setup([sheet], log);
    await shell.switchTo('sheet');
    throwing = true;

    expect(() => shell.apply(strength)).toThrow('render threw');

    expect(saved).toHaveLength(1);
  });
});

describe('a tab that cannot be mounted', () => {
  it.each(['load', 'mount'] as const)(
    'is reported, not thrown, and the shell still draws its own parts when the first tab fails by %s',
    async (how) => {
      const log: string[] = [];
      const { descriptor } = flakyTab('sheet', log, how);
      const { shell } = setup([descriptor], log);

      await shell.switchTo('sheet');
      shell.apply(strength);

      expect(log).toEqual([
        'view:show:sheet',
        'view:unavailable:sheet',
        'view:after:sheet',
        'view:failed:sheet',
        'view:after:sheet',
        'view:applied',
      ]);
    },
  );

  it('is loaded again when it is chosen again, rather than failing from a remembered rejection', async () => {
    const log: string[] = [];
    const { descriptor, state } = flakyTab('sheet', log);
    const { shell } = setup([descriptor], log);
    await shell.switchTo('sheet');
    state.failing = false;
    log.length = 0;

    await shell.open('sheet');

    expect(state.attempts).toBe(2);
    expect(log).toEqual([
      'push:sheet',
      'view:show:sheet',
      'sheet:mount',
      'sheet:enter',
      'sheet:render:play',
      'view:after:sheet',
      'view:focus:sheet',
    ]);
  });

  it('puts the tab and the address back on the one that was shown, which keeps redrawing on edits', async () => {
    const log: string[] = [];
    const sheet = recordingTab('sheet', log).descriptor;
    const { descriptor: combat, state } = flakyTab('combat', log);
    const { shell } = setup([sheet, combat], log);
    await shell.switchTo('sheet');
    log.length = 0;

    await shell.open('combat');

    expect(log).toEqual([
      'push:combat',
      'sheet:leave',
      'view:show:combat',
      'restore:sheet',
      'view:show:sheet',
      'sheet:enter',
      'sheet:render:play',
      'view:after:sheet',
      'view:failed:combat',
    ]);
    log.length = 0;

    shell.apply(strength);
    expect(log).toEqual(['sheet:render:play', 'view:after:sheet', 'view:applied', 'sheet:changed']);

    state.failing = false;
    log.length = 0;
    await shell.open('combat');
    expect(log).toContain('combat:enter');
    expect(log.at(-1)).toBe('view:focus:combat');
  });

  it('goes back to the tab that was shown when Back or Forward asks for one that fails', async () => {
    const log: string[] = [];
    const sheet = recordingTab('sheet', log).descriptor;
    const { descriptor: combat } = flakyTab('combat', log);
    const { shell } = setup([sheet, combat], log);
    await shell.switchTo('sheet');
    log.length = 0;

    await shell.switchTo('combat');

    expect(log).toContain('restore:sheet');
    expect(log.at(-1)).toBe('view:failed:combat');
  });

  it('goes back to the tab that was drawn when the one that fails was asked for while another still loaded', async () => {
    const log: string[] = [];
    const sheet = recordingTab('sheet', log).descriptor;
    // Still loading when the next request arrives, so it was never drawn: not what to go back to.
    const pending: TabDescriptor = {
      ...recordingTab('journal', log).descriptor,
      mount: () => new Promise(() => {}),
    };
    const { descriptor: combat } = flakyTab('combat', log);
    const { shell } = setup([sheet, pending, combat], log);
    await shell.switchTo('sheet');
    void shell.switchTo('journal');
    log.length = 0;

    await shell.switchTo('combat');

    expect(log).toContain('restore:sheet');
    expect(log).toContain('sheet:enter');
    expect(log.at(-1)).toBe('view:failed:combat');
  });

  it('is entered again, on the same mounted tab, when chosen again after its enter threw, and the shown tab comes back meanwhile', async () => {
    const log: string[] = [];
    const sheet = recordingTab('sheet', log).descriptor;
    let throwing = true;
    const combat = recordingTab('combat', log, {
      enter() {
        if (throwing) throw new Error('enter threw');
        log.push('combat:enter');
      },
    }).descriptor;
    const { shell } = setup([sheet, combat], log);
    await shell.switchTo('sheet');
    log.length = 0;

    await shell.open('combat');

    expect(log).toContain('restore:sheet');
    expect(log.at(-1)).toBe('view:failed:combat');

    throwing = false;
    log.length = 0;
    await shell.open('combat');

    expect(log).not.toContain('combat:mount');
    expect(log).toContain('combat:enter');
    expect(log.at(-1)).toBe('view:focus:combat');
  });

  it('is not reported when a later request has already moved on', async () => {
    const log: string[] = [];
    const sheet = recordingTab('sheet', log).descriptor;
    let fail!: () => void;
    const slow: TabDescriptor = {
      ...recordingTab('combat', log).descriptor,
      mount: () =>
        new Promise((_resolve, reject) => {
          fail = () => reject(new Error('chunk failed'));
        }),
    };
    const { shell } = setup([sheet, slow], log);
    await shell.switchTo('sheet');
    log.length = 0;

    const toCombat = shell.switchTo('combat');
    await shell.switchTo('sheet');
    fail();
    await toCombat;

    expect(log.filter((entry) => entry.startsWith('view:failed') || entry.startsWith('restore'))).toEqual([]);
  });
});

describe('switches that overlap', () => {
  it('enter a tab once, however many requests for it are waiting on its load', async () => {
    const log: string[] = [];
    const sheet = recordingTab('sheet', log).descriptor;
    const combatTab = recordingTab('combat', log).descriptor;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => void (release = resolve));
    const slow: TabDescriptor = { ...combatTab, mount: () => gate.then(() => combatTab.mount()) };
    const { shell } = setup([sheet, slow], log);
    await shell.switchTo('sheet');
    log.length = 0;

    const first = shell.switchTo('combat');
    await shell.switchTo('sheet');
    const second = shell.switchTo('combat');
    release();
    await Promise.all([first, second]);

    expect(log.filter((entry) => entry === 'combat:enter')).toEqual(['combat:enter']);
    expect(log.filter((entry) => entry === 'combat:render:play')).toEqual(['combat:render:play']);
  });
});

describe('a tab that draws text with showText', () => {
  it('leaves an input that already shows the text alone on every redraw the shell asks for', async () => {
    const writes: string[] = [];
    let shown = 'Ada';
    const input = {
      get value() {
        return shown;
      },
      set value(next: string) {
        writes.push(next);
        shown = next;
      },
    };
    const log: string[] = [];
    const sheet = recordingTab('sheet', log, { render: () => showText(input, 'Ada') }).descriptor;
    const { shell, mode } = setup([sheet], log);
    await shell.switchTo('sheet');

    shell.apply(strength);
    mode.value = 'edit';
    shell.modeChanged();

    expect(writes).toEqual([]);
  });
});

describe('what the shell offers every tab', () => {
  it('runs the observers after every draw, whatever tab is shown, with the whole page and not the tab\'s panel', async () => {
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
