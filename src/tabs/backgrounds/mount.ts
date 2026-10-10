import { backgroundCards } from '../../domain/v20/backgrounds/cards';
import { countLabel } from '../../domain/v20/labels';
import type { V20Character } from '../../domain/v20/character';
import type { MountedTab, TabContext } from '../../scripts/tabs/context';
import type { SheetMode } from '../../scripts/sheet/mode';
import { havenCards } from '../../domain/v20/backgrounds/havens';
import { flawCards, meritCards } from '../../domain/v20/backgrounds/points';
import { drawBackgrounds, type BackgroundTemplates } from './drawBackgrounds';
import { drawHavens, type HavenTemplates } from './drawHavens';
import { drawMeritsFlaws, totalsText } from './drawMeritsFlaws';
import { drawFrame, sectionOf } from './section';

const one = <T extends Element>(root: ParentNode, selector: string): T => root.querySelector<T>(selector)!;

/** The Backgrounds tab: the character's Backgrounds, Havens, Merits, Flaws and other traits. */
export function mount(ctx: TabContext): MountedTab {
  const { root } = ctx;
  const templates: BackgroundTemplates = {
    background: one(root, '[data-template="background"]'),
    person: one(root, '[data-template="person"]'),
  };
  const havenTemplates: HavenTemplates = {
    haven: one(root, '[data-template="haven"]'),
    detail: one(root, '[data-template="detail"]'),
  };
  const backgrounds = sectionOf(root, 'backgrounds');
  const havens = sectionOf(root, 'havens');
  const merits = sectionOf(root, 'merits');
  const flaws = sectionOf(root, 'flaws');
  const pointed = one<HTMLTemplateElement>(root, '[data-template="pointed"]');
  const entries = (count: number): string => countLabel(count, 'entry', 'entries');

  function draw(character: V20Character, mode: SheetMode): void {
    const background = backgroundCards(character, mode);
    drawFrame(backgrounds, background.count, entries(background.count));
    drawBackgrounds(backgrounds.list, background.cards, templates);
    const haven = havenCards(character, mode);
    drawFrame(havens, haven.count, entries(haven.count));
    drawHavens(havens.list, haven.cards, havenTemplates);
    for (const [section, list] of [[merits, meritCards(character, mode)], [flaws, flawCards(character, mode)]] as const) {
      drawFrame(section, list.count, totalsText(list.count, list.total));
      drawMeritsFlaws(section.list, list.cards, pointed);
    }
  }

  return {
    render: draw,
  };
}
