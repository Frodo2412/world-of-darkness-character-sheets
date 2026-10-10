import { backgroundCards } from '../../domain/v20/backgrounds/cards';
import { countLabel } from '../../domain/v20/labels';
import type { V20Character } from '../../domain/v20/character';
import type { MountedTab, TabContext } from '../../scripts/tabs/context';
import type { SheetMode } from '../../scripts/sheet/mode';
import { setText } from './dom';
import { drawBackgrounds, type BackgroundTemplates } from './drawBackgrounds';

const one = <T extends Element>(root: ParentNode, selector: string): T => root.querySelector<T>(selector)!;

/** The Backgrounds tab: the character's Backgrounds, Havens, Merits, Flaws and other traits. */
export function mount(ctx: TabContext): MountedTab {
  const { root } = ctx;
  const templates: BackgroundTemplates = {
    background: one(root, '[data-template="background"]'),
    person: one(root, '[data-template="person"]'),
  };
  const backgrounds = {
    list: one<HTMLElement>(root, '[data-list="backgrounds"]'),
    empty: one<HTMLElement>(root, '[data-empty="backgrounds"]'),
    count: one<HTMLElement>(root, '[data-section="backgrounds"] .dossier-heading-count'),
  };

  function draw(character: V20Character, mode: SheetMode): void {
    const { cards, count } = backgroundCards(character, mode);
    setText(backgrounds.count, countLabel(count, 'entry', 'entries'));
    backgrounds.empty.hidden = count > 0;
    drawBackgrounds(backgrounds.list, cards, templates);
  }

  return {
    render: draw,
  };
}
