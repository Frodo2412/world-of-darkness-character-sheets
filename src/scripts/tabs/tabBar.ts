// The tab bar: a tablist of links over the tabs' panels, with roving focus. The bar draws whatever tabs
// it is given and knows nothing of what they stand for. Nothing here touches the page when imported.

export type TabKeyAction =
  /** Move focus to the tab at this index; nothing is selected until Enter or Space. */
  | { kind: 'focus'; index: number }
  | { kind: 'activate' };

/** What `key` does from the tab at `index` of `count`; nothing for a key the bar does not use. */
export function tabKeyAction(key: string, index: number, count: number): TabKeyAction | undefined {
  switch (key) {
    case 'ArrowRight':
      return { kind: 'focus', index: (index + 1) % count };
    case 'ArrowLeft':
      return { kind: 'focus', index: (index - 1 + count) % count };
    case 'Home':
      return { kind: 'focus', index: 0 };
    case 'End':
      return { kind: 'focus', index: count - 1 };
    case 'Enter':
    case ' ':
      return { kind: 'activate' };
    default:
      return undefined;
  }
}

/** The parts of a click that decide whether the bar handles it or leaves it to the browser (new tab, new window, download). */
export interface ClickLike {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** A plain primary-button click: the one the bar turns into a switch without leaving the page. */
export const isPlainClick = ({ button, ctrlKey, metaKey, shiftKey, altKey }: ClickLike): boolean =>
  button === 0 && !ctrlKey && !metaKey && !shiftKey && !altKey;

/**
 * Where a scrolling bar should be so the tab (at `left`, `width` wide, in the bar's content) is in
 * view; unchanged when it already is.
 */
export function scrollToShow(tab: { left: number; width: number }, view: { scrollLeft: number; width: number }): number {
  if (tab.left < view.scrollLeft) return tab.left;
  const overhang = tab.left + tab.width - (view.scrollLeft + view.width);
  return overhang > 0 ? view.scrollLeft + overhang : view.scrollLeft;
}

export interface TabBarHandlers {
  /** The player chose the tab, by click, Enter or Space. */
  onSelect(key: string): void;
  /** The address the tab has, so a link opened in a new window lands on it. */
  hrefFor(key: string): string;
}

export interface TabBar {
  /** Marks `key` as the selected tab and the one a Tab press lands on, and keeps it in view. */
  select(key: string): void;
}

const tabsOf = (bar: HTMLElement): HTMLAnchorElement[] => [...bar.querySelectorAll<HTMLAnchorElement>('[role="tab"]')];

/** Wires the bar the server drew: addresses, selection, keys and clicks. */
export function createTabBar(bar: HTMLElement, { onSelect, hrefFor }: TabBarHandlers): TabBar {
  const tabs = tabsOf(bar);
  for (const tab of tabs) tab.href = hrefFor(tab.dataset.tabKey!);

  function setRoving(focused: HTMLElement): void {
    for (const tab of tabs) tab.tabIndex = tab === focused ? 0 : -1;
  }

  bar.addEventListener('keydown', (event) => {
    const index = tabs.indexOf(event.target as HTMLAnchorElement);
    if (index < 0) return;
    const action = tabKeyAction(event.key, index, tabs.length);
    if (action === undefined) return;
    // Space would scroll the page, and Enter on a link would follow its address.
    event.preventDefault();
    if (action.kind === 'activate') {
      onSelect(tabs[index].dataset.tabKey!);
    } else {
      setRoving(tabs[action.index]);
      tabs[action.index].focus();
    }
  });

  bar.addEventListener('click', (event) => {
    const tab = (event.target as Element).closest<HTMLAnchorElement>('[role="tab"]');
    if (tab === null || !isPlainClick(event)) return;
    event.preventDefault();
    onSelect(tab.dataset.tabKey!);
  });

  return {
    select(key) {
      for (const tab of tabs) {
        const selected = tab.dataset.tabKey === key;
        tab.setAttribute('aria-selected', String(selected));
        if (selected) {
          setRoving(tab);
          bar.scrollLeft = scrollToShow(
            { left: tab.offsetLeft, width: tab.offsetWidth },
            { scrollLeft: bar.scrollLeft, width: bar.clientWidth },
          );
        }
      }
    },
  };
}
