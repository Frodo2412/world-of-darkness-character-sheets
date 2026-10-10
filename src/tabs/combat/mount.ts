import { MANOEUVRES } from '../../domain/v20/combat/data/manoeuvres';
import { RANGED_WEAPONS } from '../../domain/v20/combat/data/ranged';
import { MELEE_WEAPONS } from '../../domain/v20/combat/data/weapons';
import { manoeuvrePool, weaponPool } from '../../domain/v20/combat/pools';
import type { V20Character } from '../../domain/v20/character';
import { wireSegmented } from '../../scripts/dossier/segmented';
import { setAttr } from '../../scripts/sheet/draw';
import type { MountedTab, TabContext } from '../../scripts/tabs/context';
import { drawManoeuvres } from './drawManoeuvres';
import { drawWeapons } from './drawWeapons';

const one = <T extends Element>(root: ParentNode, selector: string): T => root.querySelector<T>(selector)!;

/** Which tables are shown: both, or the close combat ones, or the ranged ones. */
type Section = 'all' | 'melee' | 'ranged';

const SECTIONS = ['melee', 'ranged'] as const;

/** The Combat tab: the rulebook's manoeuvres and weapons with the character's pools, read-only. */
export function mount(ctx: TabContext): MountedTab {
  const { root } = ctx;
  const template = (name: string): HTMLTemplateElement => one(root, `[data-template="${name}"]`);
  const body = (table: string): HTMLElement => one(root, `[data-table="${table}"] tbody`);
  const manoeuvreTemplate = template('manoeuvre');
  const manoeuvreTables = SECTIONS.map((section) => ({
    body: body(`${section}-manoeuvres`),
    manoeuvres: MANOEUVRES.filter((manoeuvre) => manoeuvre.section === section),
  }));
  const weaponTables = [
    { body: body('melee-weapons'), template: template('melee-weapon'), weapons: MELEE_WEAPONS },
    { body: body('ranged-weapons'), template: template('ranged-weapon'), weapons: RANGED_WEAPONS },
  ];
  const tables = one<HTMLElement>(root, '[data-control="tables"] [data-segmented]');
  const groups = [...root.querySelectorAll<HTMLElement>('[data-group]')];
  let section: Section = 'all';
  /** The weapon chosen for the roll, by name: page state, forgotten on leaving. */
  let weapon: string | undefined;

  function draw(character: V20Character): void {
    for (const button of tables.querySelectorAll<HTMLButtonElement>('button')) {
      setAttr(button, 'aria-pressed', String(button.dataset.value === section));
    }
    for (const group of groups) group.hidden = section !== 'all' && group.dataset.group !== section;
    for (const table of manoeuvreTables) {
      drawManoeuvres(
        table.body,
        manoeuvreTemplate,
        table.manoeuvres.map((manoeuvre) => ({ manoeuvre, pool: manoeuvrePool(character, manoeuvre) })),
      );
    }
    for (const table of weaponTables) {
      drawWeapons(
        table.body,
        table.template,
        table.weapons.map((each) => ({ weapon: each, pool: weaponPool(character, each), selected: each.name === weapon })),
      );
    }
  }

  tables.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (button === null) return;
    section = button.dataset.value as Section;
    draw(ctx.current());
  });
  wireSegmented(tables);

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
