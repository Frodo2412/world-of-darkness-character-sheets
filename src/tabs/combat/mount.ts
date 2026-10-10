import { MANOEUVRES } from '../../domain/v20/combat/data/manoeuvres';
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

/** The Combat tab: the rulebook's manoeuvres and weapons with the character's pools, read-only. */
export function mount(ctx: TabContext): MountedTab {
  const { root } = ctx;
  const template = (name: string): HTMLTemplateElement => one(root, `[data-template="${name}"]`);
  const body = (table: string): HTMLElement => one(root, `[data-table="${table}"] tbody`);
  const parts = {
    manoeuvreTemplate: template('manoeuvre'),
    meleeWeaponTemplate: template('melee-weapon'),
    meleeManoeuvres: body('melee-manoeuvres'),
    meleeWeapons: body('melee-weapons'),
  };
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
    const melee = MANOEUVRES.filter((manoeuvre) => manoeuvre.section === 'melee');
    drawManoeuvres(
      parts.meleeManoeuvres,
      parts.manoeuvreTemplate,
      melee.map((manoeuvre) => ({ manoeuvre, pool: manoeuvrePool(character, manoeuvre) })),
    );
    drawWeapons(
      parts.meleeWeapons,
      parts.meleeWeaponTemplate,
      MELEE_WEAPONS.map((each) => ({ weapon: each, pool: weaponPool(character, each), selected: each.name === weapon })),
    );
  }

  tables.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (button === null) return;
    section = button.dataset.value as Section;
    draw(ctx.current());
  });
  wireSegmented(tables);

  // "Use in roll" chooses the row's weapon for the roll, or drops it when it is the chosen one.
  parts.meleeWeapons.addEventListener('click', (event) => {
    const button = (event.target as Element).closest('[data-field="use"]');
    if (button === null) return;
    const name = button.closest<HTMLElement>('[data-key]')!.dataset.key!;
    weapon = weapon === name ? undefined : name;
    draw(ctx.current());
  });

  return { render: draw, leave: () => void (weapon = undefined) };
}
