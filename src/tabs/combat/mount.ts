import { MANOEUVRES } from '../../domain/v20/combat/data/manoeuvres';
import { manoeuvrePool } from '../../domain/v20/combat/pools';
import type { V20Character } from '../../domain/v20/character';
import { wireSegmented } from '../../scripts/dossier/segmented';
import { setAttr } from '../../scripts/sheet/draw';
import type { MountedTab, TabContext } from '../../scripts/tabs/context';
import { drawManoeuvres } from './drawManoeuvres';

const one = <T extends Element>(root: ParentNode, selector: string): T => root.querySelector<T>(selector)!;

/** Which tables are shown: both, or the close combat ones, or the ranged ones. */
type Section = 'all' | 'melee' | 'ranged';

/** The Combat tab: the rulebook's manoeuvres and weapons with the character's pools, read-only. */
export function mount(ctx: TabContext): MountedTab {
  const { root } = ctx;
  const manoeuvreTemplate = one<HTMLTemplateElement>(root, '[data-template="manoeuvre"]');
  const meleeManoeuvres = one<HTMLElement>(root, '[data-table="melee-manoeuvres"] tbody');
  const tables = one<HTMLElement>(root, '[data-control="tables"] [data-segmented]');
  const groups = [...root.querySelectorAll<HTMLElement>('[data-group]')];
  let section: Section = 'all';

  function draw(character: V20Character): void {
    for (const button of tables.querySelectorAll<HTMLButtonElement>('button')) {
      setAttr(button, 'aria-pressed', String(button.dataset.value === section));
    }
    for (const group of groups) group.hidden = section !== 'all' && group.dataset.group !== section;
    const melee = MANOEUVRES.filter((manoeuvre) => manoeuvre.section === 'melee');
    drawManoeuvres(
      meleeManoeuvres,
      manoeuvreTemplate,
      melee.map((manoeuvre) => ({ manoeuvre, pool: manoeuvrePool(character, manoeuvre) })),
    );
  }

  tables.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (button === null) return;
    section = button.dataset.value as Section;
    draw(ctx.current());
  });
  wireSegmented(tables);

  return { render: draw };
}
