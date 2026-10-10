import { backgroundCards } from '../../domain/v20/backgrounds/cards';
import { countLabel } from '../../domain/v20/labels';
import type { V20Character } from '../../domain/v20/character';
import type { MountedTab, TabContext } from '../../scripts/tabs/context';
import type { SheetMode } from '../../scripts/sheet/mode';
import { sectionCounts } from '../../domain/v20/backgrounds/counts';
import { havenCards } from '../../domain/v20/backgrounds/havens';
import { otherTraitCards } from '../../domain/v20/backgrounds/others';
import { flawCards, meritCards } from '../../domain/v20/backgrounds/points';
import { drawBackgrounds, type BackgroundTemplates } from './drawBackgrounds';
import { drawHavens, type HavenTemplates } from './drawHavens';
import { drawIndex } from './drawIndex';
import { drawMeritsFlaws, totalsText } from './drawMeritsFlaws';
import { drawOther } from './drawOther';
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
  const others = sectionOf(root, 'otherTraits');
  const otherTemplate = one<HTMLTemplateElement>(root, '[data-template="other"]');
  const index = one<HTMLElement>(root, '[data-index]');

  // An entry of the index goes to its section: the heading takes focus, as it does for a link in the page.
  index.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLElement>('[data-index]');
    if (link === null || link === index) return;
    event.preventDefault();
    const heading = one<HTMLElement>(root, `[data-section="${link.dataset.index}"] .dossier-heading-title`);
    heading.tabIndex = -1;
    heading.focus();
  });
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
    const other = otherTraitCards(character, mode);
    drawFrame(others, other.count, entries(other.count));
    drawOther(others.list, other.cards, otherTemplate);
    drawIndex(index, sectionCounts(character, mode));
  }

  return {
    render: draw,
  };
}
