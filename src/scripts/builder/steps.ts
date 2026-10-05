// The step router: one step shown at a time, kept in the address hash with
// replaceState so Back leaves the builder rather than walking the steps.

export interface StepRouter {
  /** Rewrites the document title, for when the build's name changes. */
  updateTitle(): void;
}

export function startSteps(root: HTMLElement, buildName: () => string): StepRouter {
  const panels = [...root.querySelectorAll<HTMLElement>('[data-step]')];
  const links = [...root.querySelectorAll<HTMLAnchorElement>('[data-step-link]')];
  const heading = (panel: HTMLElement) => panel.querySelector<HTMLElement>('h2')!;

  // An unknown or missing step shows the first one.
  const panelFor = (hash: string): HTMLElement =>
    panels.find((panel) => `#${panel.dataset.step}` === hash) ?? panels[0];

  let current = panelFor(window.location.hash);

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
      show(panelFor(`#${link.dataset.stepLink}`), true);
    });
  }

  show(current, false);
  return { updateTitle };
}
