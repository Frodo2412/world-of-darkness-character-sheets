// Small helpers for drawing a tab's panel. Stored text only ever reaches the page as `textContent`
// or an attribute, never as markup.

/** A new element with a class and, when given, its text. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className !== undefined && className !== '') element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** Puts `text` in the node only when it differs, so a redraw that changes nothing is not spoken again. */
export function setText(node: Node, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

/** Sets an attribute only when it differs. */
export function setAttribute(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

/** The keys of the element `focus` is on inside `container`, if it carries one (`data-focus-key`). */
const focusKeyIn = (container: Element): string | undefined => {
  const active = document.activeElement;
  return active instanceof HTMLElement && container.contains(active) ? active.dataset.focusKey : undefined;
};

/**
 * Replaces the container's children. When focus was on a child marked `data-focus-key`, it goes to the
 * new child with the same key, so redrawing a list the player is operating does not drop their place.
 */
export function replaceKeepingFocus(container: Element, children: readonly Node[]): void {
  const key = focusKeyIn(container);
  container.replaceChildren(...children);
  if (key !== undefined) {
    const same = [...container.querySelectorAll<HTMLElement>('[data-focus-key]')].find((candidate) => candidate.dataset.focusKey === key);
    same?.focus();
  }
}

/**
 * Draws a keyed list into `container`. When the keys are the same as last time and in the same order
 * the existing elements are only updated, so a field the player is typing in is left alone; otherwise
 * the list is built again, keeping focus on the control with the same `data-focus-key`.
 */
export function reconcile<T>(
  container: Element,
  items: readonly T[],
  keyOf: (item: T) => string,
  build: (item: T) => HTMLElement,
  update: (element: HTMLElement, item: T) => void,
): void {
  const existing = [...container.children] as HTMLElement[];
  const same = existing.length === items.length && existing.every((element, at) => element.dataset.key === keyOf(items[at]));
  if (same) {
    existing.forEach((element, at) => update(element, items[at]));
    return;
  }
  replaceKeepingFocus(
    container,
    items.map((item) => {
      const element = build(item);
      element.dataset.key = keyOf(item);
      update(element, item);
      return element;
    }),
  );
}
