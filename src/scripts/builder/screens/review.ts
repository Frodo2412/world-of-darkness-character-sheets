// What still blocks finishing, each item a link to its step, and the Finish button.

import { BUILD_STEPS, finishReport, outstanding, type OutstandingItem } from '../../../domain/v20/creation/progress';
import { wireFinish } from '../finish';
import { showReadout } from '../messages';
import type { ScreenModule } from './index';

const stepTitle = (step: string): string => BUILD_STEPS.find((entry) => entry.step === step)?.title ?? step;

function renderOutstanding(root: HTMLElement, items: OutstandingItem[]): void {
  for (const intro of root.querySelectorAll<HTMLElement>('[data-outstanding-intro]')) {
    showReadout(intro, items.length === 0 ? 'Nothing outstanding.' : 'Before finishing:');
  }
  for (const list of root.querySelectorAll<HTMLElement>('[data-outstanding-list]')) {
    const key = JSON.stringify(items);
    if (list.dataset.items === key) continue;
    list.dataset.items = key;
    list.replaceChildren(
      ...items.map((item) => {
        const link = document.createElement('a');
        link.href = `#${item.step}`;
        link.dataset.stepGo = item.step;
        link.textContent = item.message;
        const where = document.createElement('span');
        where.className = 'outstanding-step';
        where.dataset.outstandingStep = item.step;
        where.textContent = ` (${stepTitle(item.step)})`;
        const entry = document.createElement('li');
        entry.append(link, where);
        return entry;
      }),
    );
    list.hidden = items.length === 0;
  }
}

export default {
  id: 'review',
  wire(root, { current, builds, characters, render }) {
    wireFinish(root, current, builds, characters, render);
  },
  render(build, root) {
    const items = outstanding(build);
    renderOutstanding(root, items);
    // Finish stays focusable but does nothing while anything is outstanding, and says why.
    const { blocked, label } = finishReport(build, items);
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-finish]')) {
      button.setAttribute('aria-disabled', String(blocked));
      showReadout(button, label);
    }
  },
} satisfies ScreenModule;
