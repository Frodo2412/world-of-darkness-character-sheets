import { activateRating } from '../../domain/v20/character';
import './controls.css';

export interface RatingChange {
  value: number;
}

/**
 * A row of marks showing a rating from 0 to `max`. It keeps no rating of its
 * own: it draws the `value` it is given and asks for a new one by emitting
 * `change`, which the page answers by setting `value` again.
 */
export class RatingControl extends HTMLElement {
  static observedAttributes = ['value', 'max'];

  get max(): number {
    return Number(this.getAttribute('max') ?? 0);
  }

  get value(): number {
    return Number(this.getAttribute('value') ?? 0);
  }

  set value(value: number) {
    this.setAttribute('value', String(value));
  }

  connectedCallback(): void {
    this.setAttribute('role', 'slider');
    this.setAttribute('aria-valuemin', '0');
    this.tabIndex = 0;
    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeydown);
    this.#draw();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#draw();
  }

  #draw(): void {
    if (this.children.length !== this.max) {
      this.replaceChildren(
        ...Array.from({ length: this.max }, (_, index) => {
          const mark = document.createElement('span');
          mark.className = 'rating-mark';
          mark.dataset.position = String(index + 1);
          mark.setAttribute('aria-hidden', 'true');
          return mark;
        }),
      );
    }
    for (const [index, mark] of [...this.children].entries()) {
      mark.classList.toggle('is-filled', index < this.value);
    }
    this.setAttribute('aria-valuemax', String(this.max));
    this.setAttribute('aria-valuenow', String(this.value));
    // Announce the scale with the value: "3 of 10", not a bare "3".
    this.setAttribute('aria-valuetext', `${this.value} of ${this.max}`);
  }

  #request(value: number): void {
    const next = Math.min(this.max, Math.max(0, value));
    if (next === this.value) return;
    this.dispatchEvent(
      new CustomEvent<RatingChange>('change', { detail: { value: next }, bubbles: true }),
    );
  }

  #onClick = (event: MouseEvent): void => {
    const mark = (event.target as Element).closest<HTMLElement>('.rating-mark');
    if (!mark) return;
    const position = Number(mark.dataset.position);
    this.#request(activateRating(this.value, position, { min: 0, max: this.max }));
  };

  #onKeydown = (event: KeyboardEvent): void => {
    // Alt+Left is the browser's Back, Ctrl+Home scrolls the page: leave shortcuts alone.
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const page = Math.max(2, Math.round(this.max / 5));
    const targets: Record<string, number> = {
      ArrowRight: this.value + 1,
      ArrowUp: this.value + 1,
      ArrowLeft: this.value - 1,
      ArrowDown: this.value - 1,
      PageUp: this.value + page,
      PageDown: this.value - page,
      Home: 0,
      End: this.max,
    };
    if (!(event.key in targets)) return;
    event.preventDefault();
    this.#request(targets[event.key]);
  };
}
