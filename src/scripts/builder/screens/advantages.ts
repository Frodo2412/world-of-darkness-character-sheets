import '../../../styles/builder/advantages.css';
import { report } from '../../../domain/v20/creation/progress';
import { renderDisciplineRows, wireDisciplineRows } from '../parts/ranked';
import type { ScreenModule } from './index';

export default {
  id: 'advantages',
  wire(root, wiring) {
    wireDisciplineRows(root, wiring, 'creation');
  },
  render(build, root) {
    const current = report(build);
    renderDisciplineRows(root, current, 'creation');
    const { disciplines } = current;
    for (const hint of root.querySelectorAll<HTMLElement>('[data-needs-clan]')) hint.hidden = !disciplines.needsClan;
    for (const add of root.querySelectorAll<HTMLElement>('[data-discipline-add][data-mode="creation"]')) {
      add.hidden = !disciplines.choosesOwn;
    }
  },
} satisfies ScreenModule;
