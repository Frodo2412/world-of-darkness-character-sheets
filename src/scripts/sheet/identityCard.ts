import { displayName, type V20Character } from '../../domain/v20/character';
import { identitySummary, monogram, temperament } from '../../domain/v20/identity';
import { show, showBlock } from './draw';

/** Draws the identity display from the character; the same in play and edit mode. */
export function drawIdentity(root: ParentNode, character: V20Character): void {
  const summary = identitySummary(character);
  const natureAndDemeanor = temperament(character);

  show(root, 'identity.monogram', monogram(character.header.name));
  show(root, 'identity.name', displayName(character));
  show(root, 'identity.summary', summary);
  showBlock(root, 'identity.summary', summary !== '');
  show(root, 'identity.temperament', natureAndDemeanor);
  showBlock(root, 'identity.temperament', natureAndDemeanor !== '');
}
