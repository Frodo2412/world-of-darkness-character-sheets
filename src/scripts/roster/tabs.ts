// The tab strip: a tablist over one panel, with roving focus and selection that follows focus.
// It draws whatever tabs it is given and knows nothing of what they stand for.
// Nothing here touches the page when imported: the caller hands over the elements.

/** Where focus goes from the tab at `index` of `count` when `key` is pressed; the same tab for any other key. */
export function nextTab(key: string, index: number, count: number): number {
  switch (key) {
    case 'ArrowRight':
      return (index + 1) % count;
    case 'ArrowLeft':
      return (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return index;
  }
}

/** One tab to draw: a stable key, its name and the count shown after it. */
export interface TabSpec {
  key: string;
  label: string;
  count: number;
}

export interface TabStrip {
  /**
   * Shows `selectedKey` as the selected tab and the panel as named by it. Only the strip's
   * attributes change: no tab is replaced, so focus stays where it is. With `visible` false the
   * strip is hidden and the panel is no longer a tab panel, since there are no tabs to name it.
   */
  sync(selectedKey: string, visible: boolean): void;
}

function span(text: string, attributes: Record<string, string> = {}): HTMLSpanElement {
  const element = document.createElement('span');
  element.textContent = text;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

/**
 * A tab reads "Name · 4". The dot is for the eyes only; a comma that is not drawn takes its
 * place for assistive technology, which reads "Name, 4".
 */
function drawTab(spec: TabSpec, id: string, panelId: string): HTMLButtonElement {
  const tab = document.createElement('button');
  tab.type = 'button';
  tab.id = id;
  tab.className = 'tab';
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-controls', panelId);
  tab.dataset.tabKey = spec.key;

  // One child: the button lays its children out as flex items, and a screen reader names the
  // gap between flex items with a space ("All characters , 4").
  const text = span('');
  text.append(
    span(spec.label, { 'data-slot': 'tab-label' }),
    span(' · ', { 'aria-hidden': 'true' }),
    span(', ', { class: 'tab-comma' }),
    span(String(spec.count), { 'data-slot': 'tab-count' }),
  );
  tab.append(text);
  return tab;
}

/**
 * Draws the tabs into `strip` once. `onSelect` is told the key of the tab the player chose, by
 * pointer or by keyboard; it is for the caller to select it, by calling `sync`.
 */
export function createTabStrip(
  strip: HTMLElement,
  panel: HTMLElement,
  specs: readonly TabSpec[],
  onSelect: (key: string) => void,
): TabStrip {
  if (panel.id === '') throw new Error('The tab panel needs an id for its tabs to refer to.');
  const tabs = specs.map((spec, index) => drawTab(spec, `tab-${index}`, panel.id));
  strip.replaceChildren(...tabs);

  strip.addEventListener('click', (event) => {
    const index = tabs.findIndex((tab) => tab.contains(event.target as Node));
    if (index >= 0) onSelect(specs[index].key);
  });

  strip.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const index = tabs.findIndex((tab) => tab === event.target);
    if (index < 0) return;
    const target = nextTab(event.key, index, tabs.length);
    if (target === index) return;
    event.preventDefault();
    onSelect(specs[target].key);
    tabs[target].focus();
  });

  return {
    sync(selectedKey, visible) {
      strip.hidden = !visible;
      const selected = tabs.find((tab) => tab.dataset.tabKey === selectedKey) ?? tabs[0];
      for (const tab of tabs) {
        const isSelected = tab === selected;
        tab.setAttribute('aria-selected', String(isSelected));
        tab.tabIndex = isSelected ? 0 : -1;
      }
      if (visible) {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', selected.id);
      } else {
        panel.removeAttribute('role');
        panel.removeAttribute('aria-labelledby');
      }
    },
  };
}
