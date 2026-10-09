import { woundChange } from '../sheet/resourceCards';
import { announcePool, drawPoolCard } from '../sheet/poolCard';
import type { SheetMode } from '../sheet/mode';
import type { PoolRow } from '../sheet/pool';
import { drawSideCards } from '../sheet/sideCards';
import { drawTraitCards } from '../sheet/traitCards';
import type { MountedTab, TabContext } from './context';
import { bindFields, drawFields } from './fields';

/** The Character sheet: the trait cards, the Disciplines and Virtues cards and the Selected pool. */
export function mount(ctx: TabContext): MountedTab {
  const { root } = ctx;
  let drawnMode: SheetMode | undefined;

  const sayPool = (): void => announcePool(root, ctx.current(), ctx.poolSelection());

  bindFields(root, ctx.apply);

  // Choosing a trait redraws and says the pool once it is whole.
  root.addEventListener('click', (event) => {
    const row = (event.target as Element).closest('.trait-select')?.closest<HTMLElement>('[data-trait-key]');
    if (row === null || row === undefined) return;
    ctx.togglePool(row.dataset.traitKey as PoolRow);
    sayPool();
  });

  return {
    render(character, mode) {
      drawFields(root, character, mode);
      drawTraitCards(root, character, mode, ctx.poolSelection());
      drawSideCards(root, character);
      drawPoolCard(root, character, ctx.poolSelection());
      // A mode change forgets the selection, and the pool said for it; the redraw above shows none.
      if (drawnMode !== undefined && drawnMode !== mode) sayPool();
      drawnMode = mode;
    },
    // A pool chosen elsewhere (or a wound taken meanwhile) is said on arrival; one the card already says stays silent.
    enter: sayPool,
    // The wound moves the pool's total: say the pool again so its status text matches its card.
    changed(before, after) {
      if (woundChange(before, after) !== undefined) announcePool(root, after, ctx.poolSelection());
    },
  };
}
