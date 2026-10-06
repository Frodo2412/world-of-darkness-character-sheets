import { activateRating } from '../../domain/v20/character';
import './controls.css';

export interface RatingChange {
  value: number;
}

const SLIDER_ATTRIBUTES = ['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext'];

/**
 * A row of marks showing a rating from `min` (default 0) to `max`. It keeps no
 * rating of its own: it draws the `value` it is given and asks for a new one
 * by emitting `change`, which the page answers by setting `value` again.
 *
 * Optional attributes, all absent on the sheet unless noted: `min` is the lowest
 * rating it will ask for; `locked` makes it read-only but still focusable and
 * announced; `valuetext` replaces the announced value; `freebie` marks that many
 * of the top filled marks with a distinct shape. `readonly` presents it as an
 * image instead of a slider: labelled "<name> <value> of <max>" from `name`, out
 * of the tab order, and deaf to pointer and keys. Removing it restores the slider.
 */
export class RatingControl extends HTMLElement {
  static observedAttributes = ['value', 'max', 'min', 'locked', 'valuetext', 'freebie', 'readonly', 'name'];

  // The aria-label the page gave the slider, kept while `readonly` replaces it.
  #authoredLabel: string | null = null;
  #imaged = false;

  get max(): number {
    return Number(this.getAttribute('max') ?? 0);
  }

  get min(): number {
    return Number(this.getAttribute('min') ?? 0);
  }

  get locked(): boolean {
    return this.hasAttribute('locked');
  }

  get readonly(): boolean {
    return this.hasAttribute('readonly');
  }

  get value(): number {
    return Number(this.getAttribute('value') ?? 0);
  }

  set value(value: number) {
    this.setAttribute('value', String(value));
  }

  connectedCallback(): void {
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
    const freebie = Number(this.getAttribute('freebie') ?? 0);
    for (const [index, mark] of [...this.children].entries()) {
      mark.classList.toggle('is-filled', index < this.value);
      mark.classList.toggle('is-freebie', index < this.value && index >= this.value - freebie);
    }
    this.#present();
  }

  /** The one place that decides role and ARIA: an image when `readonly`, else a slider. */
  #present(): void {
    if (this.readonly) {
      if (!this.#imaged) this.#authoredLabel = this.getAttribute('aria-label');
      this.#imaged = true;
      this.setAttribute('role', 'img');
      this.setAttribute('aria-label', `${this.getAttribute('name') ?? ''} ${this.value} of ${this.max}`.trim());
      for (const attribute of ['tabindex', ...SLIDER_ATTRIBUTES, 'aria-disabled']) {
        this.removeAttribute(attribute);
      }
      return;
    }
    if (this.#imaged) {
      if (this.#authoredLabel === null) this.removeAttribute('aria-label');
      else this.setAttribute('aria-label', this.#authoredLabel);
      this.#imaged = false;
    }
    this.setAttribute('role', 'slider');
    this.tabIndex = 0;
    this.setAttribute('aria-valuemin', String(this.min));
    this.setAttribute('aria-valuemax', String(this.max));
    this.setAttribute('aria-valuenow', String(this.value));
    // Announce the scale with the value: "3 of 10", not a bare "3".
    this.setAttribute('aria-valuetext', this.getAttribute('valuetext') ?? `${this.value} of ${this.max}`);
    if (this.locked) this.setAttribute('aria-disabled', 'true');
    else this.removeAttribute('aria-disabled');
  }

  #request(value: number): void {
    if (this.locked) return;
    const next = Math.min(this.max, Math.max(this.min, value));
    if (next === this.value) return;
    this.dispatchEvent(
      new CustomEvent<RatingChange>('change', { detail: { value: next }, bubbles: true }),
    );
  }

  #onClick = (event: MouseEvent): void => {
    if (this.readonly) return;
    const mark = (event.target as Element).closest<HTMLElement>('.rating-mark');
    if (!mark) return;
    const position = Number(mark.dataset.position);
    this.#request(activateRating(this.value, position, { min: this.min, max: this.max }));
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (this.readonly) return;
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
      Home: this.min,
      End: this.max,
    };
    if (!(event.key in targets)) return;
    event.preventDefault();
    this.#request(targets[event.key]);
  };
}
