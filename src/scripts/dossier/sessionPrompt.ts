// The session prompt's one event. The prompt (components/dossier/SessionPrompt.astro) is a form with
// a title field; submitting it says "start a session" and leaves the starting to whoever listens.

/** The event a submitted session prompt raises, bubbling from the prompt. */
export const START_SESSION_EVENT = 'start-session';

export type StartSessionEvent = CustomEvent<{ title: string }>;

/** Turns submitting any session prompt inside `root` into a `start-session` event carrying the title (possibly blank). */
export function wireSessionPrompts(root: HTMLElement): void {
  root.addEventListener('submit', (event) => {
    const prompt = (event.target as Element).closest<HTMLFormElement>('[data-session-prompt]');
    if (prompt === null) return;
    event.preventDefault();
    const field = prompt.querySelector<HTMLInputElement>('[data-session-title]')!;
    const title = field.value;
    field.value = '';
    prompt.dispatchEvent(new CustomEvent(START_SESSION_EVENT, { bubbles: true, detail: { title } }));
  });
}
