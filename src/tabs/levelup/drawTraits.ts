import type { CardView, GroupView, RowView } from '../../domain/v20/levelup/view';
import { el, reconcile, setAttribute, setText } from '../../scripts/dossier/dom';

/** The dots of a row: filled for the rating, and the next one outlined while the choice is pending. */
function drawDots(holder: HTMLElement, row: RowView): void {
  const dots = [...holder.children];
  if (dots.length !== row.dots) {
    holder.replaceChildren(...Array.from({ length: row.dots }, () => el('span', 'levelup-dot')));
  }
  [...holder.children].forEach((dot, at) => {
    dot.classList.toggle('is-filled', at < row.rating);
    dot.classList.toggle('is-pending', row.state === 'pending' && at === row.rating);
  });
}

function buildRow(row: RowView): HTMLElement {
  const item = el('li', 'levelup-row');
  const top = el('div', 'levelup-row-top');
  const button = el('button', 'levelup-step');
  button.type = 'button';
  button.dataset.subject = row.subject;
  button.dataset.focusKey = `step:${row.subject}`;
  top.append(el('span', 'levelup-row-name'), el('span', 'levelup-row-change'), el('span', 'levelup-row-cost'), button);
  const bottom = el('div', 'levelup-row-bottom');
  bottom.append(el('span', 'levelup-dots'), el('span', 'levelup-row-note'));
  bottom.firstElementChild!.setAttribute('aria-hidden', 'true');
  item.append(top, bottom);
  return item;
}

function updateRow(item: HTMLElement, row: RowView): void {
  item.dataset.state = row.state;
  setText(item.querySelector('.levelup-row-name')!, row.label);
  setText(item.querySelector('.levelup-row-change')!, row.change ?? `${row.rating} / ${row.dots === 10 ? 10 : 5}`);
  setText(item.querySelector('.levelup-row-cost')!, row.cost ?? '—');
  const note = item.querySelector<HTMLElement>('.levelup-row-note')!;
  setText(note, row.note);
  note.id = `levelup-note-${row.subject.replaceAll('.', '-')}`;
  drawDots(item.querySelector('.levelup-dots')!, row);

  const button = item.querySelector<HTMLButtonElement>('.levelup-step')!;
  button.dataset.action = row.state === 'pending' ? 'remove' : 'add';
  setText(button, row.state === 'pending' ? '−' : '+');
  setAttribute(button, 'aria-label', row.action);
  // A button that cannot be pressed says why in the row's own words, which the button points to.
  button.disabled = row.state === 'unavailable' || row.state === 'maximum';
  if (button.disabled) setAttribute(button, 'aria-describedby', note.id);
  else button.removeAttribute('aria-describedby');
}

function buildCard(): HTMLElement {
  const details = el('details', 'levelup-trait-card');
  details.open = true;
  const summary = el('summary', 'levelup-trait-summary');
  const heading = el('h4', 'levelup-trait-title');
  summary.append(heading, el('span', 'levelup-trait-rule'));
  details.append(summary, el('ul', 'levelup-rows'));
  return details;
}

function updateCard(details: HTMLElement, card: CardView): void {
  setText(details.querySelector('.levelup-trait-title')!, card.title);
  setText(details.querySelector('.levelup-trait-rule')!, card.rule);
  reconcile(details.querySelector('.levelup-rows')!, card.rows, (row) => row.subject, buildRow, updateRow);
}

function buildGroup(group: GroupView): HTMLElement {
  const section = el('section', 'levelup-group');
  section.setAttribute('aria-labelledby', `levelup-group-${group.key}`);
  const heading = el('div', 'levelup-group-heading');
  const title = el('h3', 'levelup-group-title');
  title.id = `levelup-group-${group.key}`;
  heading.append(title, el('span', 'levelup-group-hint'));
  section.append(heading, el('div', 'levelup-trait-cards'));
  return section;
}

function updateGroup(section: HTMLElement, group: GroupView): void {
  setText(section.querySelector('.levelup-group-title')!, group.title);
  setText(section.querySelector('.levelup-group-hint')!, group.hint);
  reconcile(section.querySelector('.levelup-trait-cards')!, group.cards, (card) => card.key, buildCard, updateCard);
}

/** Draws the groups of cards of traits. A card the player has folded stays folded across redraws; a button being used keeps focus. */
export function drawGroups(container: HTMLElement, groups: readonly GroupView[]): void {
  reconcile(container, groups, (group) => group.key, buildGroup, updateGroup);
}
