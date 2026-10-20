import '../../../styles/builder/finishing.css';
import { bloodPoolHint, report } from '../../../domain/v20/creation/progress';
import { showReadout } from '../messages';
import { renderFreebies } from '../parts/freebies';
import { renderDisciplineRows, wireDisciplineRows } from '../parts/ranked';
import type { ScreenModule } from './index';

/** The Blood Pool field's own words: its range, whether it is recorded, and that it is required until then. */
function renderBloodPool(root: HTMLElement, bloodPool: number | null, hint: string): void {
  const unrecorded = bloodPool === null;
  for (const element of root.querySelectorAll<HTMLElement>('[data-blood-pool-hint]')) showReadout(element, hint);
  for (const state of root.querySelectorAll<HTMLElement>('[data-blood-pool-state]')) {
    showReadout(state, unrecorded ? 'Not recorded' : '');
  }
  for (const tag of root.querySelectorAll<HTMLElement>('[data-blood-pool-required]')) tag.hidden = !unrecorded;
  for (const input of root.querySelectorAll<HTMLInputElement>('[data-entry="bloodPool"]')) {
    input.setAttribute('aria-required', String(unrecorded));
  }
}

export default {
  id: 'finishing',
  wire(root, wiring) {
    wireDisciplineRows(root, wiring, 'freebie');
  },
  render(build, root) {
    renderDisciplineRows(root, report(build), 'freebie');
    renderFreebies(root, build);
    renderBloodPool(root, build.bloodPool, bloodPoolHint(build));
  },
} satisfies ScreenModule;
