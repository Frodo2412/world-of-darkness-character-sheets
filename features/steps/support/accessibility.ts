import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';
import { doneButton, enterEditMode, isEditing } from './sheet';
import { showTab } from './tabs';

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

const CONTROL_ROLES = 'textbox|searchbox|combobox|slider|button|link|checkbox|radio|spinbutton|tab';
const CONTROL_LINE = new RegExp(`^\\s*- (?:${CONTROL_ROLES})\\b`);
const CONTROL_NAME = new RegExp(`^\\s*- (${CONTROL_ROLES}) "([^"]+)"`);

/**
 * Every control within `scope` has a non-empty accessible name, and no two controls of one role share
 * one. Read from the accessibility tree as assistive technology receives it, one node per line.
 */
export async function expectUniqueControlNames(scope: Locator): Promise<void> {
  const tree = await scope.ariaSnapshot();
  const lines = tree.split('\n').filter((line) => CONTROL_LINE.test(line));
  const named = lines.map((line) => CONTROL_NAME.exec(line));

  expect(lines.length).toBeGreaterThan(0);
  expect(lines.filter((_, index) => !named[index]?.[2].trim())).toEqual([]);
  // A role is announced with its name, so the "Concept" step link and the
  // "Concept" text field are told apart; two links of one name are not.
  const identities = named.map((match) => `${match![1]} "${match![2]}"`);
  expect(identities.filter((identity, index) => identities.indexOf(identity) !== index)).toEqual([]);
}

/** The rules a page must keep: WCAG 2.1 level A and AA. */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** What axe finds wrong with the page as it is, one line per rule: its id, what it asks for and where it was broken. */
export async function violationsOnPage(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} — ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
}

/**
 * Shows the tab called `tab` (already open on the sheet) and scans it in play mode and then in edit
 * mode, as the player meets it. The state the scan sees is whatever the scenario arranged; each
 * finding says which mode it was found in. Ends in edit mode.
 */
export async function scanTab(page: Page, tab: string): Promise<string[]> {
  await showTab(page, tab);
  if (await isEditing(page)) await doneButton(page).click();
  const inPlay = await violationsOnPage(page);
  await enterEditMode(page);
  const inEdit = await violationsOnPage(page);
  return [...inPlay.map((found) => `play mode: ${found}`), ...inEdit.map((found) => `edit mode: ${found}`)];
}
