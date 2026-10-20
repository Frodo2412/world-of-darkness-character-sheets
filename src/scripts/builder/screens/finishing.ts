import '../../../styles/builder/advantages.css';
import '../../../styles/builder/finishing.css';
import { bloodPoolHint, report } from '../../../domain/v20/creation/progress';
import { NOT_RECORDED } from '../../../domain/v20/creation/wording';
import { showReadout } from '../messages';
import { renderFreebies } from '../parts/freebies';
import { renderFreebieDisciplineRows, wireFreebieDisciplines } from '../parts/ranked';
import type { ScreenModule } from './index';

/** The Blood Pool field's own words: its range, whether it is recorded, and that it is required until then. */
function renderBloodPool(root: HTMLElement, bloodPool: number | null, hint: string): void {
  const unrecorded = bloodPool === null;
  for (const element of root.querySelectorAll<HTMLElement>('[data-blood-pool-hint]')) showReadout(element, hint);
  for (const state of root.querySelectorAll<HTMLElement>('[data-blood-pool-state]')) {
    showReadout(state, unrecorded ? NOT_RECORDED : '');
  }
  for (const tag of root.querySelectorAll<HTMLElement>('[data-blood-pool-required]')) tag.hidden = !unrecorded;
  for (const input of root.querySelectorAll<HTMLInputElement>('[data-entry="bloodPool"]')) {
    input.setAttribute('aria-required', String(unrecorded));
  }
}

export default {
  id: 'finishing',
  wire(root, wiring) {
    wireFreebieDisciplines(root, wiring);
  },
  render(build, root) {
    renderFreebieDisciplineRows(root, report(build));
    renderFreebies(root, build);
    renderBloodPool(root, build.bloodPool, bloodPoolHint(build));
  },
} satisfies ScreenModule;
