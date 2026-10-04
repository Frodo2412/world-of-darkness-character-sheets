import type { DamageType, HealthLevelKey } from '../../domain/v20/traits';
import './controls.css';

export interface HealthChange {
  level: HealthLevelKey;
}

/** Each damage type has its own glyph, so it never depends on colour. */
const GLYPHS: Record<DamageType, string> = {
  empty: '',
  bashing: '/',
  lethal: 'X',
  aggravated: '*',
};

/**
 * The health boxes. Its markup supplies one button per health level; this
 * element draws the damage it is given and emits `change` naming the box
 * that was activated. It keeps no damage of its own.
 */
export class HealthTrack extends HTMLElement {
  connectedCallback(): void {
    this.addEventListener('click', (event) => {
      const box = (event.target as Element).closest<HTMLButtonElement>('[data-health-level]');
      if (!box) return;
      const level = box.dataset.healthLevel as HealthLevelKey;
      this.dispatchEvent(
        new CustomEvent<HealthChange>('change', { detail: { level }, bubbles: true }),
      );
    });
  }

  set damage(damage: Record<HealthLevelKey, DamageType>) {
    for (const box of this.querySelectorAll<HTMLButtonElement>('[data-health-level]')) {
      const type = damage[box.dataset.healthLevel as HealthLevelKey];
      box.textContent = GLYPHS[type];
      box.dataset.damage = type;
      box.setAttribute('aria-label', `${box.dataset.label}, ${type}`);
    }
  }
}

customElements.define('health-track', HealthTrack);
