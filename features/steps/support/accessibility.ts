import type { Locator, Page } from '@playwright/test';

/** Every role a player can operate, or type into, on a page. */
export const INTERACTIVE_ROLES = [
  'button',
  'link',
  'checkbox',
  'radio',
  'switch',
  'tab',
  'menuitem',
  'combobox',
  'listbox',
  'option',
  'textbox',
  'searchbox',
  'slider',
  'spinbutton',
] as const;

/**
 * The names assistive technology gives the elements `matches` finds: the label the page
 * sets on the element, else its text, with the text of any image inside it. Read through the
 * locator, so the page is asked for what is there now, never parsed from a snapshot.
 */
export const accessibleNames = (matches: Locator): Promise<string[]> =>
  matches.evaluateAll((elements) =>
    elements.map((element) => {
      const label = element.getAttribute('aria-label');
      const text =
        element.textContent +
        Array.from(element.querySelectorAll('img'), (image) => ` ${image.alt}`).join('');
      return (label ?? text).replace(/\s+/g, ' ').trim();
    }),
  );

/** The accessible names of the links within `scope`. */
export const linkNames = (scope: Page | Locator): Promise<string[]> =>
  accessibleNames(scope.getByRole('link'));

/** The accessible names of every interactive control within `scope`. */
export async function controlNames(scope: Page | Locator): Promise<string[]> {
  const named = await Promise.all(
    INTERACTIVE_ROLES.map((role) => accessibleNames(scope.getByRole(role))),
  );
  return named.flat();
}
