import { namedRows, type V20Character } from '../../domain/v20/character';
import { lookup, showBlock } from './draw';

/** One line per named Discipline, "Presence 3", in the order stored; a Discipline rated 0 is still listed. */
export function disciplineLines(character: V20Character): string[] {
  return namedRows(character.disciplines).map((row) => `${row.name} ${row.rating}`);
}

/** Draws the Disciplines card's play list and its empty-state line. */
export function drawSideCards(root: ParentNode, character: V20Character): void {
  const lines = disciplineLines(character);
  const list = lookup(root, '[data-disciplines-list]');

  const shown = [...list.children].map((item) => item.textContent);
  if (shown.length !== lines.length || shown.some((text, index) => text !== lines[index])) {
    list.replaceChildren(
      ...lines.map((line) => {
        const item = document.createElement('li');
        item.className = 'discipline-entry';
        item.textContent = line;
        return item;
      }),
    );
  }
  list.hidden = lines.length === 0;
  showBlock(root, 'disciplines.empty', lines.length === 0);
}
