import { manoeuvrePool, weaponPool } from '../../domain/v20/combat/pools';
import type { V20Character } from '../../domain/v20/character';
import { wireSegmented } from '../../scripts/dossier/segmented';
import { setAttr } from '../../scripts/sheet/draw';
import type { MountedTab, TabContext } from '../../scripts/tabs/context';
import { drawManoeuvres } from './drawManoeuvres';
import { drawRoll, rollParts } from './drawRoll';
import { blankRoll, clearedEntries, rollView, type RollState } from './roll';
import { drawSearch, type SearchParts } from './drawSearch';
import { drawWeapons } from './drawWeapons';
import { listedCount, listing, type Listing, type Section } from './section';

/** The width below which the Weapon roll panel is under the tables, not beside them (as combat.css lays it out). */
const COMPACT_LAYOUT = '(max-width: 69.99rem)';

/** What the player typed as a whole number; nothing, or something that is not a number, is 0. */
const wholeNumber = (text: string): number => {
  const number = Math.trunc(Number(text));
  return Number.isFinite(number) ? number : 0;
};

const one = <T extends Element>(root: ParentNode, selector: string): T => root.querySelector<T>(selector)!;

/** The Combat tab: the rulebook's manoeuvres and weapons with the character's pools, read-only. */
export function mount(ctx: TabContext): MountedTab {
  const { root } = ctx;
  const template = (name: string): HTMLTemplateElement => one(root, `[data-template="${name}"]`);
  const manoeuvreTemplate = template('manoeuvre');
  /** A table: the block that holds it (hidden when it lists nothing) and the body its rows go in. */
  const tableOf = (name: string): { block: HTMLElement; body: HTMLElement } => ({
    block: one(root, `[data-table="${name}"]`),
    body: one(root, `[data-table="${name}"] tbody`),
  });
  const manoeuvreTables = [
    { ...tableOf('melee-manoeuvres'), rows: (listed: Listing) => listed.meleeManoeuvres },
    { ...tableOf('ranged-manoeuvres'), rows: (listed: Listing) => listed.rangedManoeuvres },
  ];
  const weaponTables = [
    { ...tableOf('melee-weapons'), template: template('melee-weapon'), rows: (listed: Listing) => listed.meleeWeapons },
    { ...tableOf('ranged-weapons'), template: template('ranged-weapon'), rows: (listed: Listing) => listed.rangedWeapons },
  ];
  const groups = [...root.querySelectorAll<HTMLElement>('[data-group]')];
  const controls = [one<HTMLElement>(root, '[data-control="section"] [data-segmented]'), one<HTMLElement>(root, '[data-control="tables"] [data-segmented]')];
  const search: SearchParts = {
    input: one(root, '[data-search-input]'),
    clear: one(root, '[data-search-clear]'),
    count: one(root, '[data-search-count]'),
  };
  const noMatch = one<HTMLElement>(root, '[data-state="no-match"]');
  let section: Section = 'all';
  const roll = rollParts(one(root, '[data-roll]'));
  const result = one<HTMLElement>(root, '[data-result]');
  /** What the player chose and entered for the Weapon roll: page state, never stored. */
  let state: RollState = blankRoll();

  function draw(character: V20Character): void {
    const listed = listing(section, search.input.value);
    for (const control of controls) {
      for (const button of control.querySelectorAll<HTMLButtonElement>('button')) {
        setAttr(button, 'aria-pressed', String(button.dataset.value === section));
      }
    }
    for (const table of manoeuvreTables) {
      const rows = table.rows(listed);
      table.block.hidden = rows.length === 0;
      drawManoeuvres(table.body, manoeuvreTemplate, rows.map((manoeuvre) => ({ manoeuvre, pool: manoeuvrePool(character, manoeuvre) })));
    }
    for (const table of weaponTables) {
      const rows = table.rows(listed);
      table.block.hidden = rows.length === 0;
      drawWeapons(
        table.body,
        table.template,
        rows.map((each) => ({ weapon: each, pool: weaponPool(character, each), selected: each.name === state.weapon })),
      );
    }
    for (const group of groups) group.hidden = [...group.querySelectorAll<HTMLElement>('[data-table]')].every((block) => block.hidden);
    noMatch.hidden = listedCount(listed) > 0;
    drawSearch(search, listedCount(listed));
    drawRoll(roll, state, rollView(character, state));
  }

  /** Changes what the player chose or entered, and redraws. */
  function choose(change: Partial<RollState>): void {
    state = { ...state, ...change };
    draw(ctx.current());
  }

  // The filter and the sub-tabs choose the same section.
  for (const control of controls) {
    control.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('button');
      if (button === null) return;
      section = button.dataset.value as Section;
      draw(ctx.current());
    });
    wireSegmented(control);
  }

  search.input.addEventListener('input', () => draw(ctx.current()));
  search.clear.addEventListener('click', () => {
    search.input.value = '';
    search.input.focus();
    draw(ctx.current());
  });

  // "Use in roll" chooses the row's weapon for the roll, or drops it when it is the chosen one.
  for (const table of weaponTables) {
    table.body.addEventListener('click', (event) => {
      const button = (event.target as Element).closest('[data-field="use"]');
      if (button === null) return;
      const name = button.closest<HTMLElement>('[data-key]')!.dataset.key!;
      const chosen = state.weapon !== name;
      choose({ weapon: chosen ? name : undefined });
      // Under the tables the roll panel is out of sight: bring its result into view and read it.
      if (chosen && result.ownerDocument.defaultView!.matchMedia(COMPACT_LAYOUT).matches) {
        result.scrollIntoView({ block: 'nearest' });
        result.focus();
      }
    });
  }

  // The pickers and the entries of the Weapon roll panel.
  const picked = (select: HTMLSelectElement): string | undefined => (select.value === '' ? undefined : select.value);
  roll.weapon.addEventListener('change', () => choose({ weapon: picked(roll.weapon) }));
  roll.manoeuvre.addEventListener('change', () => choose({ manoeuvre: picked(roll.manoeuvre) }));
  roll.target.addEventListener('change', () => choose({ target: picked(roll.target) }));
  roll.range.addEventListener('change', () => choose({ range: picked(roll.range) }));
  roll.dice.addEventListener('input', () => choose({ diceModifier: wholeNumber(roll.dice.value) }));
  roll.difficulty.addEventListener('input', () => choose({ difficultyModifier: wholeNumber(roll.difficulty.value) }));

  return { render: draw, leave: () => void (state = { ...state, ...clearedEntries() }) };
}
