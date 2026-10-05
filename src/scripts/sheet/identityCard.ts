import { displayName, type V20Character } from '../../domain/v20/character';
import { identitySummary, monogram } from '../../domain/v20/identity';

/** Writes read-only text into every `data-show` element of that name. */
function show(root: ParentNode, name: string, text: string): void {
  for (const element of root.querySelectorAll<HTMLElement>(`[data-show="${name}"]`)) {
    if (element.textContent !== text) element.textContent = text;
  }
}

/** Hides a block while its text is empty, so a blank value leaves no label behind. */
function showBlock(root: ParentNode, name: string, visible: boolean): void {
  for (const block of root.querySelectorAll<HTMLElement>(`[data-show-block="${name}"]`)) {
    block.hidden = !visible;
  }
}

/** Draws the identity display from the character; the same in play and edit mode. */
export function drawIdentity(root: ParentNode, character: V20Character): void {
  const { name, nature, demeanor } = character.header;
  const summary = identitySummary(character);
  const temperament = [nature.trim(), demeanor.trim()].filter((part) => part !== '').join(' / ');

  show(root, 'identity.monogram', monogram(name));
  show(root, 'identity.name', displayName(character));
  show(root, 'identity.summary', summary);
  showBlock(root, 'identity.summary', summary !== '');
  show(root, 'identity.temperament', temperament);
  showBlock(root, 'identity.temperament', temperament !== '');
}
