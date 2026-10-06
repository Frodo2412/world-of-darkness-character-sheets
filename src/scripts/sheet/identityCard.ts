import { displayName, type V20Character } from '../../domain/v20/character';
import { identitySummary, monogram, temperament } from '../../domain/v20/identity';
import { show, showOptional } from './draw';

/** Draws the identity display from the character; the same in play and edit mode. */
export function drawIdentity(root: ParentNode, character: V20Character): void {
  show(root, 'identity.monogram', monogram(character.header.name));
  show(root, 'identity.name', displayName(character));
  showOptional(root, 'identity.summary', identitySummary(character));
  showOptional(root, 'identity.temperament', temperament(character));
}
