import { CALLED_SHOTS, RANGE_BANDS } from '../../domain/v20/combat/data/modifiers';
import { MANOEUVRES } from '../../domain/v20/combat/data/manoeuvres';
import { RANGED_WEAPONS } from '../../domain/v20/combat/data/ranged';
import { MELEE_WEAPONS } from '../../domain/v20/combat/data/weapons';
import type { Weapon } from '../../domain/v20/combat/data/types';
import { manoeuvreAvailability } from '../../domain/v20/combat/requirements';
import { damageText } from '../../domain/v20/combat/rows';
import type { V20Character } from '../../domain/v20/character';
import { diceLabel } from '../../domain/v20/identity';
import { el, setText } from '../../scripts/dossier/dom';
import type { RollState, RollView } from './rollView';

function option(value: string, text: string): HTMLOptionElement {
  const choice = el('option', undefined, text);
  choice.value = value;
  return choice;
}

function group(label: string, options: HTMLOptionElement[]): HTMLOptGroupElement {
  const optgroup = el('optgroup');
  optgroup.label = label;
  optgroup.append(...options);
  return optgroup;
}

const weaponLabel = (weapon: Weapon): string =>
  weapon.kind === 'melee'
    ? `${weapon.name} · ${damageText(weapon.damage).replace(' +', '+')} ${weapon.type}`
    : `${weapon.name} · ${weapon.example ?? `damage ${damageText(weapon.damage)}`}`;

/** Fills the pickers whose choices never change: the weapons, the manoeuvres and the called shots. */
export function buildPickers(root: HTMLElement): void {
  const pick = (name: string): HTMLSelectElement => root.querySelector<HTMLSelectElement>(`[data-pick="${name}"]`)!;
  pick('weapon').append(
    option('', 'No weapon selected'),
    group('Melee weapons', MELEE_WEAPONS.map((weapon) => option(weapon.name, weaponLabel(weapon)))),
    group('Ranged weapons', RANGED_WEAPONS.map((weapon) => option(weapon.name, weaponLabel(weapon)))),
  );
  pick('manoeuvre').append(
    group('Close combat', MANOEUVRES.filter((entry) => entry.section === 'melee').map((entry) => option(entry.name, entry.name))),
    group('Ranged combat', MANOEUVRES.filter((entry) => entry.section === 'ranged').map((entry) => option(entry.name, entry.name))),
  );
  pick('target').append(
    option('', 'No called shot'),
    ...CALLED_SHOTS.map((shot) => option(shot.key, `${shot.label} · ${shot.examples} (+${shot.difficulty} difficulty)`)),
  );
}

const rangeSignature = (weapon: Weapon | undefined, ranged: boolean): string =>
  weapon?.kind === 'ranged' ? `ranged:${weapon.range}` : ranged ? 'ranged' : 'melee';

/** The range picker follows the weapon: its own bands for a ranged weapon, one fixed choice for melee. */
function drawRange(select: HTMLSelectElement, weapon: Weapon | undefined, ranged: boolean, value: string): void {
  const signature = rangeSignature(weapon, ranged);
  if (select.dataset.signature !== signature) {
    select.dataset.signature = signature;
    select.replaceChildren(
      ...(ranged
        ? RANGE_BANDS.map((band) => {
            const meters =
              'withinMeters' in band.reach ? band.reach.withinMeters : weapon?.kind === 'ranged' ? weapon.range * band.reach.timesRange : undefined;
            return option(band.key, `${band.label}${meters === undefined ? '' : ` · ≤ ${meters} m`}`);
          })
        : [option('melee', 'Melee · within reach')]),
    );
  }
  select.disabled = !ranged;
  if (ranged && select.value !== value) select.value = value;
}

const signed = (value: number): string => (value > 0 ? `+${value}` : String(value));

function drawInput(input: HTMLInputElement, text: string): void {
  if (input !== document.activeElement && input.value !== text) input.value = text;
}

/** Draws the Weapon roll panel from the choices on it and what they come to. */
export function drawRoll(root: HTMLElement, character: V20Character, state: RollState, view: RollView): void {
  const find = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const pick = (name: string): HTMLSelectElement => find<HTMLSelectElement>(`[data-pick="${name}"]`);

  const first = character.header.name.trim().split(/\s+/)[0];
  setText(find('[data-selected-label]'), `Selected · ${view.manoeuvre.name}`);
  setText(
    find('[data-roll-lead]'),
    `No weapons are tracked for ${first === '' ? 'this character' : first}. This panel previews a rulebook weapon, not their equipment.`,
  );

  // The pickers.
  const weapon = pick('weapon');
  if (weapon.value !== (state.weapon ?? '')) weapon.value = state.weapon ?? '';
  const manoeuvre = pick('manoeuvre');
  for (const choice of manoeuvre.options) {
    const entry = MANOEUVRES.find((candidate) => candidate.name === choice.value)!;
    const availability = manoeuvreAvailability(character, entry, view.weapon);
    const suffix = availability.unavailable !== undefined ? ' (unavailable)' : availability.weaponNeeded !== undefined ? ' (weapon required)' : '';
    setText(choice, `${entry.name}${suffix}`);
  }
  if (manoeuvre.value !== state.manoeuvre) manoeuvre.value = state.manoeuvre;
  if (pick('target').value !== state.target) pick('target').value = state.target;
  drawRange(pick('range'), view.weapon, view.weapon?.kind === 'ranged' || view.manoeuvre.section === 'ranged', state.range);

  // The attack.
  const reason = find('[data-attack-reason]');
  const reasonText = view.availability.unavailable ?? (view.attack?.incapacitated === true ? 'Incapacitated · cannot act.' : view.availability.weaponNeeded);
  setText(reason, reasonText ?? '');
  reason.hidden = reasonText === undefined;
  if (view.attack === undefined) {
    setText(find('[data-attack-formula]'), '');
    setText(find('[data-attack-dice]'), 'Unavailable');
    setText(find('[data-attack-accuracy]'), view.manoeuvre.accuracy === 'special' ? 'Special' : signed(view.manoeuvre.accuracy));
    setText(find('[data-attack-difficulty]'), String(view.difficultyShown));
  } else {
    setText(find('[data-attack-formula]'), view.attack.formula);
    setText(find('[data-attack-dice]'), diceLabel(view.attack.dice));
    setText(find('[data-attack-accuracy]'), view.attack.accuracy);
    setText(find('[data-attack-difficulty]'), String(view.attack.difficulty));
  }
  drawInput(find('[data-input="dice"]'), String(state.dice));
  drawInput(find('[data-input="difficulty"]'), String(view.difficultyShown));
  drawInput(find('[data-input="extra"]'), String(state.extra));

  // The damage.
  const result = find('.combat-result');
  if (view.damage.kind === 'pool') {
    const { pool, formula, type } = view.damage;
    setText(find('[data-damage-formula]'), formula);
    setText(find('[data-damage-dice]'), diceLabel(pool.dice));
    setText(find('[data-damage-type]'), `${type === undefined ? '' : `${type} · `}soak difficulty 6`);
    setText(find('[data-damage-note]'), pool.incapacitated ? 'Incapacitated · cannot act.' : 'No wound penalty to damage or soak.');
  } else {
    setText(find('[data-damage-formula]'), view.damage.reason);
    setText(find('[data-damage-dice]'), '—');
    setText(find('[data-damage-type]'), '');
    setText(find('[data-damage-note]'), 'No wound penalty to damage or soak.');
  }
  result.dataset.kind = view.damage.kind;
}
