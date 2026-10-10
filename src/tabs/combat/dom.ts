// Small drawing helpers for this tab. A tab redraws on every change, so each one leaves the page
// alone when it already shows what is asked: text is not rewritten, and an element that is still
// wanted is kept (so an open <details> stays open and focus stays where it is).

/** Writes the text only when it differs. */
export function setText(element: Element, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

/** Writes the text into the element of the template's markup marked `data-field="<name>"`, when it has one; an element left with no text is hidden. */
export function setField(scope: ParentNode, name: string, text: string): void {
  const element = scope.querySelector<HTMLElement>(`[data-field="${name}"]`);
  if (element === null) return;
  setText(element, text);
  element.hidden = text === '';
}

/** The element a template's markup marks `data-field="<name>"`, inside `scope`. */
export function field(scope: ParentNode, name: string): HTMLElement {
  return scope.querySelector<HTMLElement>(`[data-field="${name}"]`)!;
}

/** A copy of the one element a `<template>` holds. */
export function cloneOf(template: HTMLTemplateElement): HTMLElement {
  return template.content.firstElementChild!.cloneNode(true) as HTMLElement;
}

/**
 * Makes the children of `container` the items, in order, one element each. An element already
 * there for an item's key is kept and updated, so only what is new or gone touches the page.
 */
export function reconcile<T>(
  container: HTMLElement,
  items: readonly T[],
  keyOf: (item: T) => string,
  create: () => HTMLElement,
  update: (element: HTMLElement, item: T) => void,
): void {
  const existing = new Map([...container.children].map((child) => [(child as HTMLElement).dataset.key!, child as HTMLElement]));
  let cursor = container.firstElementChild;
  for (const item of items) {
    const key = keyOf(item);
    let element = existing.get(key);
    if (element === undefined) {
      element = create();
      element.dataset.key = key;
    }
    existing.delete(key);
    // Moving an element that is already in place would take focus from it.
    if (element === cursor) cursor = cursor.nextElementSibling;
    else container.insertBefore(element, cursor);
    update(element, item);
  }
  for (const gone of existing.values()) gone.remove();
}

/** Puts the text in an input unless the player is in it: what they are typing is left as it is. */
export function showUnlessFocused(input: HTMLInputElement | HTMLSelectElement, text: string): void {
  if (input.ownerDocument.activeElement !== input && input.value !== text) input.value = text;
}
