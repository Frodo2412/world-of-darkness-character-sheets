import { clampExtraSuccesses, EXTRA_SUCCESSES_MESSAGE } from '../../domain/v20/combat/damage';
import { type CombatSection } from '../../domain/v20/combat/data/manoeuvres';
import { CONCEALMENT } from '../../domain/v20/combat/data/types';
import { manoeuvreRows, meleeWeaponRows, rangedWeaponRows, weaponNamed, type ManoeuvreRow, type WeaponRow } from '../../domain/v20/combat/rows';
import { weaponPool } from '../../domain/v20/combat/pools';
import { diceLabel } from '../../domain/v20/identity';
import { woundState } from '../../domain/v20/resources';
import { setText } from '../../scripts/dossier/dom';
import { filterBy } from '../../scripts/dossier/filterBy';
import { matchesText, wireSearch } from '../../scripts/dossier/search';
import { setPressed, wireSegmentedPress } from '../../scripts/dossier/segmented';
import type { MountedTab, TabContext } from '../../scripts/tabs/context';
import { buildPickers, drawRoll } from './drawRoll';
import { drawManoeuvres, drawMeleeWeapons, drawRangedWeapons } from './drawTables';
import { difficultyModifierFor, manoeuvreOf, OPENING_ROLL, rollView, type RollState } from './rollView';
import { chooseFilter, chooseTab, OPENING_VIEW, shownSections, type SectionFilter } from './section';

const CONCEAL_NOTE =
  `Conceal: P = ${CONCEALMENT.P.replace('Can be carried in the ', '')} · J = ${CONCEALMENT.J.replace('Can be hidden in a ', '')} · ` +
  `T = ${CONCEALMENT.T.replace('Can be hidden in a ', '')} · N = ${CONCEALMENT.N.replace('Cannot be concealed on the person at all', 'cannot be concealed')}.`;

/** The narrow layout stacks the roll panel under the tables, where choosing a row should bring it into view. */
const STACKED = '(max-width: 74.9375rem)';

/** The Combat tab: the rulebook's manoeuvres and weapons with the character's pools, and the Weapon roll panel. */
export function mount(ctx: TabContext): MountedTab {
  const { root } = ctx;
  const find = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const body = (table: string): HTMLElement => find(`[data-table="${table}"] tbody`);
  const roll = find('[data-roll]');
  const noMatch = find('[data-no-match]');
  const filterGroup = find('.combat-tools .dossier-segmented');
  const subtabs = find('[data-subtabs] .dossier-segmented');

  // Page state: forgotten when the tab is left. Nothing here is stored and nothing is random.
  let view = OPENING_VIEW;
  let query = '';
  let state: RollState = { ...OPENING_ROLL };

  buildPickers(roll);

  const search = wireSearch(find('[data-search]'), (text) => {
    query = text;
    redraw();
  });
  wireSegmentedPress(filterGroup, (value) => {
    view = chooseFilter(view, value as SectionFilter);
    redraw();
  });
  wireSegmentedPress(subtabs, (value) => {
    view = chooseTab(view, value as CombatSection);
    redraw();
  });

  /** A weapon of the other chart changes the manoeuvre to one that fits it; one of the same chart leaves it. */
  function chooseWeapon(name: string): void {
    state = { ...state, weapon: name === '' ? undefined : name };
    const weapon = weaponNamed(state.weapon);
    if (weapon !== undefined && manoeuvreOf(state.manoeuvre).section !== weapon.kind) {
      const fitted = weapon.kind === 'melee' ? 'Weapon Strike' : weapon.automatic ? 'Three-Round Burst' : 'Multiple Shots';
      state = { ...state, manoeuvre: fitted };
    }
  }

  function chooseManoeuvre(name: string): void {
    state = { ...state, manoeuvre: name };
  }

  /** Brings the roll panel into view when it sits under the tables, and puts focus on its result. */
  function showRoll(): void {
    if (!window.matchMedia(STACKED).matches) return;
    roll.scrollIntoView({ block: 'start' });
    find('.combat-stats').focus({ preventScroll: true });
  }

  root.addEventListener('click', (event) => {
    const target = event.target as Element;
    const use = target.closest<HTMLButtonElement>('[data-use]')?.dataset.use;
    if (use !== undefined) {
      const [kind, name] = use.split(/:(.*)/s);
      if (kind === 'weapon') chooseWeapon(name);
      else chooseManoeuvre(name);
      redraw();
      showRoll();
      return;
    }
    const step = target.closest<HTMLButtonElement>('[data-step]')?.dataset.step;
    if (step !== undefined) {
      const [field, by] = step.split(':');
      applyNumber(field as 'dice' | 'difficulty' | 'extra', Number(by), true);
    }
  });

  roll.addEventListener('change', (event) => {
    const target = event.target as HTMLElement;
    if (target instanceof HTMLSelectElement) {
      const pick = target.dataset.pick;
      if (pick === 'weapon') chooseWeapon(target.value);
      else if (pick === 'manoeuvre') chooseManoeuvre(target.value);
      else if (pick === 'target') state = { ...state, target: target.value };
      else if (pick === 'range') state = { ...state, range: target.value };
      redraw();
    } else if (target instanceof HTMLInputElement && target.dataset.input !== undefined) {
      applyNumber(target.dataset.input as 'dice' | 'difficulty' | 'extra', Number(target.value), false, target);
    }
  });

  roll.addEventListener('input', (event) => {
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLInputElement) || target.dataset.input === undefined) return;
    const field = target.dataset.input as 'dice' | 'difficulty' | 'extra';
    const typed = Number(target.value);
    // A half-typed number waits for the commit; a whole one shows at once.
    if (target.value.trim() === '' || !Number.isInteger(typed)) {
      if (field === 'extra' && target.value.trim() !== '') showExtraHint(EXTRA_SUCCESSES_MESSAGE);
      return;
    }
    if (field === 'extra' && typed < 0) {
      showExtraHint(EXTRA_SUCCESSES_MESSAGE);
      return;
    }
    if (field === 'extra') showExtraHint(undefined);
    applyNumber(field, typed, false);
  });

  function showExtraHint(text: string | undefined): void {
    const hint = find('[data-extra-hint]');
    setText(hint, text ?? '');
    hint.hidden = text === undefined;
  }

  /**
   * Sets one of the three numbers. `relative` adds to what it is; otherwise `value` is what the player
   * entered, put right when it is not a whole number (and for extra successes, not 0 or more) with a message.
   */
  function applyNumber(field: 'dice' | 'difficulty' | 'extra', value: number, relative: boolean, input?: HTMLInputElement): void {
    if (field === 'dice') {
      const next = relative ? state.dice + value : Number.isNaN(value) ? 0 : Math.trunc(value);
      state = { ...state, dice: next };
      if (input !== undefined) input.value = String(next);
    } else if (field === 'difficulty') {
      const shown = rollView(ctx.current(), state).difficultyShown;
      const wanted = relative ? shown + value : Number.isNaN(value) ? shown : Math.trunc(value);
      state = { ...state, difficulty: difficultyModifierFor(state, wanted) };
      if (wanted !== shown || input !== undefined) {
        const now = rollView(ctx.current(), state).difficultyShown;
        if (input !== undefined) input.value = String(now);
      }
    } else {
      const { extra, corrected } = clampExtraSuccesses(relative ? state.extra + value : value);
      state = { ...state, extra };
      if (input !== undefined) input.value = String(extra);
      showExtraHint(corrected && !relative ? EXTRA_SUCCESSES_MESSAGE : undefined);
      if (corrected && !relative) ctx.announce(EXTRA_SUCCESSES_MESSAGE);
    }
    redraw();
  }

  /** The count shown for a search: every row of the sections it looks in. */
  function redraw(): void {
    const character = ctx.current();
    const weapon = weaponNamed(state.weapon);
    const searching = query.trim() !== '';
    const sections = shownSections(view, searching);

    const manoeuvres = (section: CombatSection): ManoeuvreRow[] =>
      filterBy(manoeuvreRows(character, section, weapon, state.manoeuvre), query, (row) => [row.name, row.description, row.unavailable, row.damage, ...row.tags]);
    const weapons = (kind: CombatSection): WeaponRow[] =>
      filterBy(kind === 'melee' ? meleeWeaponRows(character, state.weapon) : rangedWeaponRows(character, state.weapon), query, (row) => [
        row.name,
        row.detail,
        row.type,
        row.concealMeaning,
        ...row.tags,
      ]);

    let total = 0;
    for (const section of ['melee', 'ranged'] as const) {
      const shown = sections.includes(section);
      find(`[data-section="${section}"]`).hidden = !shown;
      const rows = manoeuvres(section);
      const guns = weapons(section);
      if (shown) total += rows.length + guns.length;
      find(`[data-group="${section}-manoeuvres"]`).hidden = rows.length === 0;
      find(`[data-group="${section}-weapons"]`).hidden = guns.length === 0;
      drawManoeuvres(body(`${section}-manoeuvres`), rows);
      (section === 'melee' ? drawMeleeWeapons : drawRangedWeapons)(body(`${section}-weapons`), guns);
      setText(find(`[data-conceal-note="${section}"]`), CONCEAL_NOTE);
    }
    noMatch.hidden = total > 0;
    search.say(searching ? matchesText(total) : '');
    setPressed(filterGroup, view.filter);
    setPressed(subtabs, view.tab);

    const melee = weaponPool(character, 'melee');
    const ranged = weaponPool(character, 'ranged');
    const strength = character.attributes.strength;
    setText(
      find('[data-bar="melee"]'),
      `Rulebook reference — not owned equipment. Attack: ${melee.formula} = ${diceLabel(melee.dice)}. Damage: Strength ${strength} + weapon bonus + extra successes; no wound penalty.`,
    );
    setText(
      find('[data-bar="ranged"]'),
      `Rulebook reference — not owned equipment. Attack: ${ranged.formula} = ${diceLabel(ranged.dice)}. The wound takes nothing off damage. Range shown is short range; up to twice it is long range.`,
    );
    find('[data-incapacitated]').hidden = woundState(character) !== 'incapacitated';
    setText(find('[data-lead]'), `Manoeuvres, defensive actions and weapon rolls for ${character.header.name.trim().split(/\s+/)[0] || 'this character'}.`);

    drawRoll(roll, character, state, rollView(character, state));
  }

  return {
    render() {
      redraw();
    },
    leave() {
      // The modifiers, the target, the range and the choices are page state: back to nothing on leaving.
      state = { ...OPENING_ROLL };
      view = OPENING_VIEW;
      search.clear();
      showExtraHint(undefined);
    },
  };
}
