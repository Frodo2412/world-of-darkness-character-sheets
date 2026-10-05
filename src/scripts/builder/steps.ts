// The step router: one step shown at a time, kept in the address hash with
// replaceState so Back leaves the builder rather than walking the steps.

import type { BuildReport, BuildStep } from '../../domain/v20/creation/progress';

export interface StepRouter {
  /** Rewrites the document title, for when the build's name changes. */
  updateTitle(): void;
  /** Shows each step's status from the report in the step navigation. */
  renderStatuses(report: BuildReport): void;
}

export function startSteps(root: HTMLElement, buildName: () => string): StepRouter {
  const panels = [...root.querySelectorAll<HTMLElement>('[data-step]')];
  const links = [...root.querySelectorAll<HTMLAnchorElement>('[data-step-link]')];
  const statuses = [...root.querySelectorAll<HTMLElement>('[data-step-status]')];
  const heading = (panel: HTMLElement) => panel.querySelector<HTMLElement>('h2')!;

  // An unknown or missing step shows the first one.
  const panelFor = (step: string): HTMLElement =>
    panels.find((panel) => panel.dataset.step === step) ?? panels[0];

  let current = panelFor(window.location.hash.slice(1));

  function updateTitle(): void {
    document.title = `${heading(current).textContent} – ${buildName()}`;
  }

  function show(panel: HTMLElement, moveFocus: boolean): void {
    current = panel;
    for (const each of panels) each.hidden = each !== panel;
    for (const link of links) {
      if (link.dataset.stepLink === panel.dataset.step) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    }
    window.history.replaceState(null, '', `#${panel.dataset.step}`);
    updateTitle();
    if (moveFocus) heading(panel).focus();
  }

  for (const link of links) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      show(panelFor(link.dataset.stepLink!), true);
    });
  }
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-step-go]')) {
    button.addEventListener('click', () => show(panelFor(button.dataset.stepGo!), true));
  }

  show(current, false);
  return {
    updateTitle,
    renderStatuses(report) {
      for (const status of statuses) {
        const text = report.steps[status.dataset.stepStatus as BuildStep];
        if (status.textContent !== text) status.textContent = text;
      }
    },
  };
}
