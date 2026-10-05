/** Writes read-only text into every `data-show` element of that name. */
export function show(root: ParentNode, name: string, text: string): void {
  for (const element of root.querySelectorAll<HTMLElement>(`[data-show="${name}"]`)) {
    if (element.textContent !== text) element.textContent = text;
  }
}

/** Hides a block while its text is empty, so a blank value leaves no label behind. */
export function showBlock(root: ParentNode, name: string, visible: boolean): void {
  for (const block of root.querySelectorAll<HTMLElement>(`[data-show-block="${name}"]`)) {
    block.hidden = !visible;
  }
}
