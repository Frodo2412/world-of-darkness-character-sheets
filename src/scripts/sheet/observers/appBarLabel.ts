import type { V20Character } from '../../../domain/v20/character';
import { currentSession } from '../../../domain/v20/journal/sessions';
import { setText } from '../../dossier/dom';

/** What the application bar says about where the character is: "The Glass City / Session 12", whichever parts there are. */
export function appBarLabel(character: V20Character): string {
  const chronicle = character.header.chronicle.trim();
  const session = currentSession(character.journal)?.title.trim() ?? '';
  return [chronicle, session].filter((part) => part !== '').join(' / ');
}

/** Fills the application bar's label, on every tab, after every draw. An empty label draws nothing. */
export function afterRender(character: V20Character, root: HTMLElement): void {
  const label = root.querySelector('[data-app-bar-label]');
  if (label !== null) setText(label, appBarLabel(character));
}
