/** A true minus sign (U+2212), for a wound and a penalty. */
export const MINUS_SIGN = '−';

/** Leave a matching attribute alone so a redraw does not restart what it drives. */
export function setAttr(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

// The sheet's markup is drawn once and never replaced, so what a selector finds under a
// root is looked up on the first draw and reused by every redraw after it.
const found = new WeakMap<ParentNode, Map<string, readonly Element[]>>();

/** Every element matching `selector` under `root`, remembered per root. */
export function lookupAll<T extends Element = HTMLElement>(root: ParentNode, selector: string): readonly T[] {
  let byRoot = found.get(root);
  if (byRoot === undefined) found.set(root, (byRoot = new Map()));
  let elements = byRoot.get(selector);
  if (elements === undefined) byRoot.set(selector, (elements = [...root.querySelectorAll(selector)]));
  return elements as readonly T[];
}

/** The one element the markup has for `selector` under `root`, remembered per root. */
export function lookup<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  return lookupAll<T>(root, selector)[0];
}

/** Writes read-only text into every `data-show` element of that name. */
export function show(root: ParentNode, name: string, text: string): void {
  for (const element of lookupAll(root, `[data-show="${name}"]`)) {
    if (element.textContent !== text) element.textContent = text;
  }
}

/** Hides a block while its text is empty, so a blank value leaves no label behind. */
export function showBlock(root: ParentNode, name: string, visible: boolean): void {
  for (const block of lookupAll(root, `[data-show-block="${name}"]`)) {
    block.hidden = !visible;
  }
}

/** Writes text into a `data-show` element and hides its `data-show-block` while the text is empty. */
export function showOptional(root: ParentNode, name: string, text: string): void {
  show(root, name, text);
  showBlock(root, name, text !== '');
}
