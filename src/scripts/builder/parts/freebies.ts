// The freebie budget's words: the dots each collapsible section holds. What is left is the "Your character"
// panel's Freebie points row, drawn with the rest of the chrome.

import { freebieReport } from '../../../domain/v20/creation/progress';
import type { V20Build } from '../../../domain/v20/creation/build';
import { plural } from '../../../domain/v20/creation/wording';
import { showReadout } from '../messages';

export function renderFreebies(root: HTMLElement, build: V20Build): void {
  const freebies = freebieReport(build);
  for (const count of root.querySelectorAll<HTMLElement>('[data-freebie-dots]')) {
    const { dots } = freebies.sections[count.dataset.freebieDots as keyof typeof freebies.sections];
    showReadout(count, `${plural(dots, 'dot')} bought`);
  }
}
