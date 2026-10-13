/**
 * Puts `text` in an input only when it differs. A tab redraws on every change, including the
 * one the player is typing; leaving an input that already shows the text alone keeps the caret
 * where it is.
 */
export function showText(input: { value: string }, text: string): void {
  if (input.value !== text) input.value = text;
}
