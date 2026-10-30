// The keys that move focus through a list of radios: the arrows, Home and End. A key pressed with a modifier
// belongs to the browser (Alt+Left is Back) and is never taken.

type ModifierKeys = Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>;

/** Where a key takes focus among `count` listed items from item `at`, wrapping at the ends; undefined for any other key or a held modifier. */
export function movedTo(event: Pick<KeyboardEvent, 'key'> & ModifierKeys, at: number, count: number): number | undefined {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return undefined;
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return (at + 1) % count;
    case 'ArrowUp':
    case 'ArrowLeft':
      return (at - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return undefined;
  }
}
