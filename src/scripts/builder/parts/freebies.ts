// The freebie budget's words: what is left, kept in view by the bar on every step, and the dots each
// collapsible section holds.

import { freebieReport } from '../../../domain/v20/creation/progress';
import type { V20Build } from '../../../domain/v20/creation/build';
import { plural } from '../../../domain/v20/creation/wording';
import { showReadout } from '../messages';

export function renderFreebies(root: HTMLElement, build: V20Build): void {
  const freebies = freebieReport(build);
  for (const status of root.querySelectorAll<HTMLElement>('[data-freebie-remaining]')) {
    showReadout(status, freebies.status);
  }
  for (const count of root.querySelectorAll<HTMLElement>('[data-freebie-dots]')) {
    const { dots } = freebies.sections[count.dataset.freebieDots as keyof typeof freebies.sections];
    showReadout(count, `${plural(dots, 'dot')} bought`);
  }
}
