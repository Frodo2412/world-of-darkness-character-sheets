// The step router: one step shown at a time, kept in the address hash with
// replaceState so Back leaves the builder rather than walking the steps.

import type { BuildReport, BuildStep } from '../../domain/v20/creation/progress';

export interface StepRouter {
  /** Rewrites the document title, for when the build's name changes. */
  updateTitle(): void;
  /** Opens a step and moves focus to its heading, or to `focusTarget` within it. */
  open(step: string, focusTarget?: HTMLElement): void;
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

  function show(panel: HTMLElement, moveFocus: boolean, focusTarget?: HTMLElement): void {
    current = panel;
    for (const each of panels) each.hidden = each !== panel;
    for (const link of links) {
      if (link.dataset.stepLink === panel.dataset.step) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    }
    window.history.replaceState(null, '', `#${panel.dataset.step}`);
    updateTitle();
    if (moveFocus) (focusTarget ?? heading(panel)).focus();
  }

  // Delegated, so links inside messages written later open steps too.
  root.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-step-link], [data-step-go]');
    if (!target) return;
    event.preventDefault();
    show(panelFor(target.dataset.stepLink ?? target.dataset.stepGo!), true);
  });

  show(current, false);
  return {
    updateTitle,
    open(step, focusTarget) {
      show(panelFor(step), true, focusTarget);
    },
    renderStatuses(report) {
      for (const status of statuses) {
        const text = report.steps[status.dataset.stepStatus as BuildStep];
        if (status.textContent !== text) status.textContent = text;
      }
    },
  };
}
