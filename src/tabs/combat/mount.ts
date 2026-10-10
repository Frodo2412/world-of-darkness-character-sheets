import { manoeuvrePool, weaponPool } from '../../domain/v20/combat/pools';
import type { V20Character } from '../../domain/v20/character';
import { wireSegmented } from '../../scripts/dossier/segmented';
import { setAttr } from '../../scripts/sheet/draw';
import type { MountedTab, TabContext } from '../../scripts/tabs/context';
import { drawManoeuvres } from './drawManoeuvres';
import { drawSearch, type SearchParts } from './drawSearch';
import { drawWeapons } from './drawWeapons';
import { listedCount, listing, type Listing, type Section } from './section';

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
  /** The weapon chosen for the roll, by name: page state, forgotten on leaving. */
  let weapon: string | undefined;

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
        rows.map((each) => ({ weapon: each, pool: weaponPool(character, each), selected: each.name === weapon })),
      );
    }
    for (const group of groups) group.hidden = [...group.querySelectorAll<HTMLElement>('[data-table]')].every((block) => block.hidden);
    noMatch.hidden = listedCount(listed) > 0;
    drawSearch(search, listedCount(listed));
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
      weapon = weapon === name ? undefined : name;
      draw(ctx.current());
    });
  }

  return { render: draw, leave: () => void (weapon = undefined) };
}
