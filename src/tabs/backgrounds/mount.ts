import { backgroundCards } from '../../domain/v20/backgrounds/cards';
import { sectionCounts } from '../../domain/v20/backgrounds/counts';
import { canRemove, type Family } from '../../domain/v20/backgrounds/edit';
import { havenCards } from '../../domain/v20/backgrounds/havens';
import { otherTraitCards } from '../../domain/v20/backgrounds/others';
import { flawCards, meritCards } from '../../domain/v20/backgrounds/points';
import type { V20Character } from '../../domain/v20/character';
import { countLabel } from '../../domain/v20/labels';
import type { SheetMode } from '../../scripts/sheet/mode';
import type { MountedTab, TabContext } from '../../scripts/tabs/context';
import { drawBackgrounds, type BackgroundTemplates } from './drawBackgrounds';
import { backgroundValues, drawEdit, havenValues, otherValues, pointValues, type EditView } from './drawEdit';
import { drawHavens, type HavenTemplates } from './drawHavens';
import { drawIndex } from './drawIndex';
import { drawMeritsFlaws, totalsText } from './drawMeritsFlaws';
import { drawOther } from './drawOther';
import { drawFrame, sectionOf } from './section';
import { messageKey, removeLabel, wireEdit } from './wireEdit';

const one = <T extends Element>(root: ParentNode, selector: string): T => root.querySelector<T>(selector)!;

const entries = (count: number): string => countLabel(count, 'entry', 'entries');

/** The Backgrounds tab: the character's Backgrounds, Havens, Merits, Flaws and other traits, read-only in play and edited in edit mode. */
export function mount(ctx: TabContext): MountedTab {
  const { root } = ctx;
  const templates: BackgroundTemplates = {
    background: one(root, '[data-template="background"]'),
    person: one(root, '[data-template="person"]'),
  };
  const personEdit = one<HTMLTemplateElement>(root, '[data-template="person-edit"]');
  const havenTemplates: HavenTemplates = {
    haven: one(root, '[data-template="haven"]'),
    detail: one(root, '[data-template="detail"]'),
  };
  const pointed = one<HTMLTemplateElement>(root, '[data-template="pointed"]');
  const otherTemplate = one<HTMLTemplateElement>(root, '[data-template="other"]');
  const sections = {
    backgrounds: sectionOf(root, 'backgrounds'),
    havens: sectionOf(root, 'havens'),
    merits: sectionOf(root, 'merits'),
    flaws: sectionOf(root, 'flaws'),
    otherTraits: sectionOf(root, 'otherTraits'),
  };
  const index = one<HTMLElement>(root, '[data-section-index]');
  /** What the player was last told about each entry's fields; shown in the entry's form. */
  const messages = new Map<string, string>();

  wireEdit(
    {
      ctx,
      lists: {
        backgrounds: sections.backgrounds.list,
        havens: sections.havens.list,
        merits: sections.merits.list,
        flaws: sections.flaws.list,
        otherTraits: sections.otherTraits.list,
      },
      messages,
    },
    { root: one(root, '[data-undo-notice]'), name: one(root, '[data-undo-name]'), button: one(root, '[data-undo-button]') },
  );

  // An entry of the index goes to its section: the heading takes focus, as it does for a link in the page.
  index.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLElement>('[data-index]');
    if (link === null) return;
    event.preventDefault();
    const heading = one<HTMLElement>(root, `[data-section="${link.dataset.index}"] .dossier-heading-title`);
    heading.tabIndex = -1;
    heading.focus();
  });

  function draw(character: V20Character, mode: SheetMode): void {
    // What a field was corrected to is said while the player is editing; play mode starts clean.
    if (mode === 'play') messages.clear();
    /** The form of an entry: its fields, what it was last told, and what removing it would do. */
    const editView = (family: Family, card: { index: number; name: string; nameText: string }, values: Record<string, string>): EditView => ({
      values,
      message: messages.get(messageKey(family, card.index)) ?? '',
      removable: canRemove(character, family, card.index),
      removeLabel: removeLabel({ name: card.nameText }, family, card.index),
    });

    const background = backgroundCards(character, mode);
    drawFrame(sections.backgrounds, background.count, entries(background.count));
    drawBackgrounds(sections.backgrounds.list, background.cards, templates, (item, card) =>
      drawEdit(item, { ...editView('backgrounds', card, backgroundValues(card)), needsName: card.needsName, people: card.people }, personEdit),
    );
    const haven = havenCards(character, mode);
    drawFrame(sections.havens, haven.count, entries(haven.count));
    drawHavens(sections.havens.list, haven.cards, havenTemplates, (item, card) =>
      drawEdit(item, editView('havens', card, havenValues(card)), personEdit),
    );
    for (const [family, list] of [['merits', meritCards(character, mode)], ['flaws', flawCards(character, mode)]] as const) {
      drawFrame(sections[family], list.count, totalsText(list.count, list.total));
      drawMeritsFlaws(sections[family].list, list.cards, pointed, (item, card) =>
        drawEdit(item, editView(family, card, pointValues(card)), personEdit),
      );
    }
    const other = otherTraitCards(character, mode);
    drawFrame(sections.otherTraits, other.count, entries(other.count));
    drawOther(sections.otherTraits.list, other.cards, otherTemplate, (item, card) =>
      drawEdit(item, editView('otherTraits', card, otherValues(card)), personEdit),
    );
    drawIndex(index, sectionCounts(character, mode));
  }

  return {
    render: draw,
  };
}
