import type { V20Character } from '../../../domain/v20/character';
import { awardXp, experienceTotals } from '../../../domain/v20/experience/ledger';
import { awardAnnouncement, validateAward } from '../../../domain/v20/experience/awards/validate';
import { experienceView } from '../../../domain/v20/experience/awards/view';
import { currentSession } from '../../../domain/v20/journal/sessions';
import { setText } from '../../../scripts/dossier/dom';
import type { SheetMode } from '../../../scripts/sheet/mode';
import type { MountedTab, TabContext } from '../../../scripts/tabs/context';
import { SECTION_DRAWN_EVENT } from '../events';
import { drawCards, drawLogs, type LogState } from './drawExperience';

/** The Experience section of the Journal: the ledger's figures, awarding experience, and the two logs. Editable in play and in edit mode. */
export function mount(ctx: TabContext, root: HTMLElement): MountedTab {
  const find = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const toggle = find<HTMLButtonElement>('[data-award-toggle]');
  const panel = find('[data-award-panel]');
  const form = find<HTMLFormElement>('[data-award-form]');
  const amountField = find<HTMLInputElement>('[data-award-amount]');
  const noteField = find<HTMLInputElement>('[data-award-note]');
  const hint = find('[data-award-hint]');

  // Page state: forgotten when the tab is left. Nothing here is stored.
  let open = false;
  let more: LogState = { awards: false, spendings: false };

  function showHint(text: string | undefined): void {
    hint.hidden = text === undefined;
    setText(hint, text ?? '');
    if (text === undefined) amountField.removeAttribute('aria-invalid');
    else amountField.setAttribute('aria-invalid', 'true');
  }

  function draw(character: V20Character): void {
    const view = experienceView(character);
    const hasSession = view.recordingIn !== undefined;
    drawCards(root, view);
    drawLogs(root, view, more);
    // With no session there is nothing to record against: the prompt stands in for the form.
    find('[data-award-prompt]').hidden = hasSession;
    panel.hidden = !open || !hasSession;
    toggle.setAttribute('aria-expanded', String(open && hasSession));
    setText(find('[data-award-where]'), hasSession ? `Recorded in ${view.recordingIn}. A negative number takes points back.` : '');
    const legacy = character.experience.trim() !== '';
    find('[data-earlier-experience]').hidden = !legacy;
    setText(find('[data-earlier-experience] [data-earlier-text]'), character.experience);
    root.dispatchEvent(new CustomEvent(SECTION_DRAWN_EVENT, { bubbles: true }));
  }

  toggle.addEventListener('click', () => {
    if (currentSession(ctx.current().journal) === undefined) {
      find<HTMLInputElement>('[data-award-prompt] [data-session-title]').focus();
      return;
    }
    open = !open;
    draw(ctx.current());
    if (open) amountField.focus();
  });

  find('[data-award-cancel]').addEventListener('click', () => {
    open = false;
    form.reset();
    showHint(undefined);
    draw(ctx.current());
    toggle.focus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const session = currentSession(ctx.current().journal);
    if (session === undefined) return;
    const entry = validateAward(amountField.value);
    if (!entry.ok) {
      showHint(entry.message);
      ctx.announce(entry.message);
      amountField.focus();
      return;
    }
    const note = noteField.value.trim();
    const after = ctx.apply((character) => ({
      ...character,
      journal: awardXp(character.journal, { sessionId: session.id, amount: entry.amount, note }, ctx.stamp),
    }));
    form.reset();
    showHint(undefined);
    open = false;
    draw(after);
    ctx.announce(awardAnnouncement(entry.amount, experienceTotals(after.journal).available));
    toggle.focus();
  });

  // A refused entry stops being refused as soon as the player starts again.
  amountField.addEventListener('input', () => showHint(undefined));

  root.addEventListener('click', (event) => {
    const key = (event.target as Element).closest<HTMLElement>('[data-show-all]')?.dataset.showAll as keyof LogState | undefined;
    if (key === undefined) return;
    more = { ...more, [key]: !more[key] };
    draw(ctx.current());
    const view = experienceView(ctx.current());
    const shown = key === 'awards' ? view.awards.length : view.spendings.length;
    const noun = key === 'awards' ? 'awards' : 'spending entries';
    ctx.announce(more[key] ? `Showing all ${shown} ${noun}.` : `Showing the newest 4 ${noun}.`);
  });

  return {
    render(character: V20Character, _mode: SheetMode) {
      draw(character);
    },
    leave() {
      open = false;
      more = { awards: false, spendings: false };
      form.reset();
      showHint(undefined);
    },
  };
}
