import type { V20Character } from '../../domain/v20/character';
import { experienceTotals } from '../../domain/v20/experience/ledger';
import { sessionChange } from '../../domain/v20/journal/sessionView';
import { startSession } from '../../domain/v20/journal/sessions';
import { applyFailureText, applyPending, undoApply, undoneCount, type Applied } from '../../domain/v20/levelup/apply';
import { addPending, clearPending, pendingTotal, removePending, reprice, type Pending } from '../../domain/v20/levelup/pending';
import type { Subject } from '../../domain/v20/levelup/subjects';
import { filterGroups, levelUpView, rowCount } from '../../domain/v20/levelup/view';
import { countLabel } from '../../domain/v20/labels';
import { setText } from '../../scripts/dossier/dom';
import { matchesText, wireSearch } from '../../scripts/dossier/search';
import { START_SESSION_EVENT, wireSessionPrompts, type StartSessionEvent } from '../../scripts/dossier/sessionPrompt';
import type { SheetMode } from '../../scripts/sheet/mode';
import { SHEET_KEY } from '../../scripts/tabs/descriptor';
import type { MountedTab, TabContext } from '../../scripts/tabs/context';
import { drawGroups } from './drawTraits';
import { drawFigures, drawReview } from './drawReview';

/** The Level up tab: advancements are chosen into a review and applied together. Works in play and in edit mode. */
export function mount(ctx: TabContext): MountedTab {
  const { root } = ctx;
  const find = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;

  // Pending choices live for the page visit: they survive tab switches and mode changes, are priced again on
  // every draw, and are not stored. What the other state here (the search, the filter, the last result) is for
  // is forgotten when the tab is left.
  let pending: Pending = [];
  let applied: Applied | undefined;
  let dropped: string[] = [];
  let query = '';
  let affordableOnly = false;

  wireSessionPrompts(root);

  const search = wireSearch(find('[data-search]'), (text) => {
    query = text;
    draw(ctx.current());
  });
  const affordable = find<HTMLInputElement>('[data-affordable]');
  affordable.addEventListener('change', () => {
    affordableOnly = affordable.checked;
    draw(ctx.current());
  });

  const available = (): number => experienceTotals(ctx.current().journal).available;

  function draw(character: V20Character): void {
    const repriced = reprice(character, pending);
    if (repriced.dropped.length > 0) {
      pending = repriced.pending;
      dropped = [...dropped, ...repriced.dropped.map((note) => note.text)];
      ctx.announce(repriced.dropped.map((note) => note.text).join(' '));
    }
    const view = levelUpView(character, pending);
    const groups = filterGroups(view.groups, { query, affordableOnly });
    const searching = query.trim() !== '' || affordableOnly;

    drawFigures(root, view.cards);
    drawGroups(find('[data-groups]'), groups);
    find('[data-no-match]').hidden = !searching || rowCount(groups) > 0;
    search.say(query.trim() === '' ? '' : matchesText(rowCount(groups)));
    setText(find('[data-status]'), view.status);
    setText(find('[data-willpower-note]'), view.willpowerNote);
    drawReview(root, view);

    find('[data-prompt]').hidden = view.sessionTitle !== undefined;
    find('[data-no-xp]').hidden = !view.noXp;
    const chip = find('[data-chip]');
    chip.hidden = view.review.count === 0;
    setText(chip, view.review.chip);
    const bar = find('[data-bar]');
    bar.hidden = view.review.count === 0;
    setText(bar, `${view.review.chip} · −${view.review.preview.total}`);

    const droppedNotes = find('[data-dropped]');
    droppedNotes.hidden = dropped.length === 0;
    droppedNotes.replaceChildren(...dropped.map((text) => Object.assign(document.createElement('p'), { textContent: text })));

    const result = find('[data-applied]');
    result.hidden = applied === undefined;
    if (applied !== undefined) {
      const count = countLabel(applied.items.length, 'advancement', 'advancements');
      setText(find('[data-applied-text]'), `Applied ${count} · ${applied.spent} XP spent · `);
    }
  }

  const toPending = (list: Pending): void => {
    pending = list;
    // The last result and any stale-choice notes are about what came before.
    applied = undefined;
    dropped = [];
  };

  function choose(subject: Subject): void {
    const character = ctx.current();
    const next = addPending(character, available(), pending, subject);
    if (next === pending) return;
    toPending(next);
    const item = next.at(-1)!;
    draw(character);
    ctx.announce(`${item.label} ${item.from} to ${item.to} added to the review. ${pendingTotal(next)} XP pending.`);
  }

  function unchoose(subject: Subject, fromReview: boolean): void {
    const item = pending.find((candidate) => candidate.subject === subject);
    if (item === undefined) return;
    const index = pending.indexOf(item);
    toPending(removePending(pending, subject));
    draw(ctx.current());
    ctx.announce(`${item.label} removed from the review. ${pendingTotal(pending)} XP pending.`);
    if (!fromReview) return;
    // Focus goes to the next line, or to the review's heading when there is none after it.
    const next = pending[index];
    const target = next === undefined ? find('#levelup-review-title') : find(`[data-focus-key="line:${next.subject}"]`);
    target.focus();
  }

  function confirm(): void {
    const result = applyPending(ctx.current(), pending, ctx.stamp);
    if (!result.ok) {
      // Redrawn first: a choice that no longer fits is dropped, with its note, before the reason is given.
      draw(ctx.current());
      ctx.announce(applyFailureText(result.reason));
      return;
    }
    // The state is settled before the write, because the write redraws: pending choices would be priced against ratings they just raised.
    pending = clearPending();
    applied = result.applied;
    dropped = [];
    ctx.apply(() => result.character);
    ctx.announce(`Applied ${countLabel(result.applied.items.length, 'advancement', 'advancements')}. ${result.applied.spent} XP spent. Available ${result.applied.available}.`);
    find('[data-applied]').focus();
  }

  function undo(): void {
    const before = applied;
    if (before === undefined) return;
    applied = undefined;
    const after = ctx.apply((character) => undoApply(character, before));
    ctx.announce(`Undid ${countLabel(undoneCount(before, after.journal), 'advancement', 'advancements')}. Available ${experienceTotals(after.journal).available}.`);
    find('#levelup-review-title').focus();
  }

  function discard(): void {
    toPending(clearPending());
    draw(ctx.current());
    ctx.announce('Review cleared. 0 XP pending.');
  }

  root.addEventListener('click', (event) => {
    const target = event.target as Element;
    const step = target.closest<HTMLButtonElement>('[data-subject]');
    if (step !== null) {
      if (step.dataset.action === 'remove') unchoose(step.dataset.subject as Subject, false);
      else choose(step.dataset.subject as Subject);
      return;
    }
    const line = target.closest<HTMLElement>('[data-remove]')?.dataset.remove;
    if (line !== undefined) {
      unchoose(line as Subject, true);
      return;
    }
    if (target.closest('[data-confirm]') !== null) confirm();
    else if (target.closest('[data-undo]') !== null) undo();
    else if (target.closest('[data-clear], [data-cancel]') !== null) discard();
    else if (target.closest('[data-back]') !== null) void ctx.openTab(SHEET_KEY);
    else if (target.closest('[data-open-journal]') !== null) {
      event.preventDefault();
      void ctx.openTab('journal');
    } else if (target.closest('[data-bar]') !== null) {
      event.preventDefault();
      find('#levelup-review').scrollIntoView({ block: 'start' });
      find('#levelup-review-title').focus({ preventScroll: true });
    }
  });

  root.addEventListener(START_SESSION_EVENT, (event) => {
    const before = ctx.current().journal;
    const title = (event as StartSessionEvent).detail.title;
    const after = ctx.apply((character) => ({ ...character, journal: startSession(character.journal, title, ctx.stamp) })).journal;
    const said = sessionChange(before, after);
    if (said !== undefined) ctx.announce(said);
  });

  return {
    render(character: V20Character, _mode: SheetMode) {
      draw(character);
    },
    leave() {
      applied = undefined;
      dropped = [];
      query = '';
      affordableOnly = false;
      affordable.checked = false;
      search.clear();
    },
  };
}
