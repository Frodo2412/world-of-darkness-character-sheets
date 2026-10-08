import { expect, type Locator, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { saveFullLibrary } from './library-layout.steps';
import {
  clanFilter,
  clearFiltersButton,
  createAction,
  entryAction,
  entryNamed,
  listedNames,
  noMatchState,
  rosterEntries,
  searchField,
  selectedTab,
  sortControl,
  statusOption,
  statusOptions,
  tab,
  tabs,
} from './support/pages';
import { withholdStorage } from './support/storage';

// Accessibility states

Given('the library is in the {string} state', async ({ page, memory }, state: string) => {
  memory.libraryState = state;
  if (state === 'empty' || state === 'storage unavailable') {
    if (state === 'storage unavailable') await withholdStorage(page);
    return;
  }
  await saveFullLibrary(page);
});

Given('a full library and two more characters with nothing filled in', async ({ page }) => {
  await saveFullLibrary(page, [{}, {}]);
});

Then(
  /^the two unnamed characters' actions name "([^"]+)" and "([^"]+)"$/,
  async ({ page }, first: string, second: string) => {
    for (const name of [first, second]) {
      await expect(entryAction(entryNamed(page, name), 'Open sheet')).toHaveAccessibleName(`Open sheet for ${name}`);
      await expect(entryAction(entryNamed(page, name), 'Edit character')).toHaveAccessibleName(`Edit character for ${name}`);
    }
  },
);

// Headings

Then('the only level 1 heading is {string}', async ({ page }, title: string) => {
  expect(await page.getByRole('heading', { level: 1 }).allTextContents()).toEqual([title]);
});

Then('the level 2 headings are {string} and {string}', async ({ page }, first: string, second: string) => {
  expect(await page.getByRole('heading', { level: 2 }).allTextContents()).toEqual([first, second]);
});

Then("every entry's name is a level 3 heading", async ({ page }) => {
  const entries = rosterEntries(page);
  const count = await entries.count();
  expect(count).toBeGreaterThan(0);
  for (const entry of await entries.all()) await expect(entry.getByRole('heading', { level: 3 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(count);
});

// Target sizes

/** Every control a player presses on the roster; a status option is its drawn segment, not the invisible radio. */
async function pressTargets(page: Page): Promise<Locator[]> {
  const segments = (await statusOptions(page).all()).map((option) => option.locator('xpath=ancestor::label[1]'));
  const links = await rosterEntries(page).getByRole('link').all();
  const creators = [
    createAction(page, 'Start character creator'),
    createAction(page, 'Start with a blank sheet'),
  ];
  return [
    ...(await tabs(page).all()),
    searchField(page),
    clanFilter(page),
    sortControl(page),
    ...segments,
    ...links,
    ...creators,
  ];
}

Then(
  'every tab, field, select, status option, entry action and create action is at least {int} pixels wide and {int} pixels tall',
  async ({ page }, width: number, height: number) => {
    const targets = await pressTargets(page);
    expect(targets.length).toBeGreaterThan(10);
    const small: string[] = [];
    for (const target of targets) {
      await target.scrollIntoViewIfNeeded();
      const box = (await target.boundingBox())!;
      if (box.width < width || box.height < height) {
        small.push(`${(await target.textContent())?.trim() ?? '?'}: ${Math.round(box.width)}×${Math.round(box.height)}`);
      }
    }
    expect(small).toEqual([]);
  },
);

// Forced colours

When('the roster is shown with forced colours', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto('/');
  await expect(selectedTab(page)).toHaveCount(1);
});

/** The colour and width of an element's lower edge, as drawn. */
const lowerEdge = (element: Locator): Promise<string> =>
  element.evaluate((node) => {
    const style = getComputedStyle(node);
    return `${style.borderBottomStyle} ${style.borderBottomWidth} ${style.borderBottomColor}`;
  });

Then('the selected tab is underlined and no other tab is', async ({ page }) => {
  const selected = await lowerEdge(selectedTab(page));
  const others = await Promise.all(
    (await tabs(page).all()).map((one) => lowerEdge(one)),
  );
  const unselected = (await tabs(page).all()).length - 1;
  expect(unselected).toBeGreaterThan(0);
  expect(others.filter((edge) => edge === selected)).toHaveLength(1);
});

/** The outline or border colour of a status segment. */
const edge = (segment: Locator): Promise<string> =>
  segment.evaluate((node) => {
    const style = getComputedStyle(node);
    return `${style.outlineStyle} ${style.outlineWidth} ${style.borderTopStyle} ${style.borderTopWidth} ${style.borderTopColor}`;
  });

Then('the selected status is outlined and the other is not', async ({ page }) => {
  const segments = await Promise.all(
    (await statusOptions(page).all()).map(async (option) => ({
      checked: await option.isChecked(),
      edge: await edge(option.locator('xpath=ancestor::label[1]')),
    })),
  );
  const chosen = segments.filter((segment) => segment.checked);
  const rest = segments.filter((segment) => !segment.checked);
  expect(chosen).toHaveLength(1);
  expect(rest).toHaveLength(1);
  expect(chosen[0].edge).not.toBe(rest[0].edge);
});

// Keyboard

/** What a focused element is, as a screen reader would announce it. */
async function describeFocus(page: Page): Promise<{ control: string; thickness: number } | null> {
  return page.evaluate(() => {
    const node = document.activeElement as HTMLElement | null;
    if (node === null || node === document.body) return null;
    const type = (node as HTMLInputElement).type;
    const role =
      node.getAttribute('role') ??
      (node.tagName === 'A'
        ? 'link'
        : node.tagName === 'BUTTON'
          ? 'button'
          : node.tagName === 'SELECT'
            ? 'combobox'
            : type === 'radio'
              ? 'radio'
              : 'textbox');
    const label = node.getAttribute('aria-label') ?? node.closest('label')?.textContent ?? (node as HTMLInputElement).labels?.[0]?.textContent ?? node.textContent;
    const outlineOf = (element: Element): number => {
      const style = getComputedStyle(element);
      return style.outlineStyle === 'none' ? 0 : parseFloat(style.outlineWidth);
    };
    // A radio is invisible; its segment carries the ring.
    const drawn = type === 'radio' ? node.closest('label') ?? node : node;
    // A text field may sit in a box that draws the ring around it.
    const thickness = outlineOf(drawn) || (drawn.parentElement ? outlineOf(drawn.parentElement) : 0);
    return { control: `${role}: ${(label ?? '').replace(/\s+/g, ' ').trim()}`, thickness };
  });
}

When('the player tabs from the top of the page to the bottom', async ({ page, memory }) => {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let press = 0; press < 80; press++) {
    await page.keyboard.press('Tab');
    const stop = await describeFocus(page);
    if (stop === null) break;
    memory.focusStops.push({ control: stop.control, visible: stop.thickness >= 2 });
  }
});

Then(
  "after the application title, focus visits the selected tab, both create actions, search, the clan filter, the status filter, the sort control and each entry's actions, in that order",
  async ({ page, memory }) => {
    const stops = memory.focusStops.map((stop) => stop.control);
    const title = stops.findIndex((control) => control.startsWith('link: ') && control.includes('Vampire'));
    expect(title).toBe(0);
    const entryLinks: string[] = [];
    for (const entry of await rosterEntries(page).all()) {
      for (const link of await entry.getByRole('link').all()) {
        entryLinks.push(`link: ${((await link.getAttribute('aria-label')) ?? (await link.textContent()) ?? '').replace(/\s+/g, ' ').trim()}`);
      }
    }
    const afterTitle = stops.slice(1).map((control) => control.replace(/ for .*$/, '').replace(/: .*/, (rest) => rest));
    expect(afterTitle).toHaveLength(7 + entryLinks.length);
    expect(afterTitle[0]).toMatch(/^tab: All characters/);
    expect(afterTitle.slice(1, 3)).toEqual(['button: Start character creator', 'button: Start with a blank sheet']);
    expect(afterTitle[3]).toMatch(/^textbox:/);
    expect(afterTitle[4]).toMatch(/^combobox:/);
    expect(afterTitle[5]).toMatch(/^radio:/);
    expect(afterTitle[6]).toMatch(/^combobox:/);
    expect(stops.slice(8).map((control) => control.replace(/ for .*$/, ''))).toEqual(
      entryLinks.map((control) => control.replace(/ for .*$/, '')),
    );
  },
);

Then('every focused control shows an outline at least {int} pixels thick', async ({ memory }, thickness: number) => {
  expect(thickness).toBe(2);
  expect(memory.focusStops.filter((stop) => !stop.visible).map((stop) => stop.control)).toEqual([]);
});

When('the player, using only the keyboard, moves to the tab {string}', async ({ page }, text: string) => {
  await selectedTab(page).focus();
  const target = tab(page, text);
  for (let press = 0; press < 12 && (await target.getAttribute('aria-selected')) !== 'true'; press++) {
    await page.keyboard.press('ArrowRight');
  }
  await expect(target).toHaveAttribute('aria-selected', 'true');
});

Then('the roster lists only {string} and {string}', async ({ page }, first: string, second: string) => {
  await expect.poll(async () => (await listedNames(page)).sort()).toEqual([first, second].sort());
});

When(
  'they type {string} in the search field and activate {string} with the Enter key',
  async ({ page, memory }, text: string, action: string) => {
    await searchField(page).focus();
    await page.keyboard.type(text);
    await expect(noMatchState(page)).toBeVisible();
    await expect(page.getByText('No characters match.')).toBeVisible();
    memory.noMatchSeen = true;
    const button = clearFiltersButton(page);
    await expect(button).toHaveAccessibleName(action);
    await button.focus();
    await page.keyboard.press('Enter');
  },
);

Then(
  'the roster shows {string} and then lists {string} and {string} again',
  async ({ page, memory }, message: string, first: string, second: string) => {
    expect(message).toBe('No characters match.');
    expect(memory.noMatchSeen).toBe(true);
    await expect(noMatchState(page)).toBeHidden();
    await expect.poll(async () => (await listedNames(page)).sort()).toEqual([first, second].sort());
  },
);

When(
  'they choose {string} and the sort order {string} with the arrow keys',
  async ({ page }, status: string, order: string) => {
    await page.locator('input[type="radio"]:checked').focus();
    const target = statusOption(page, status);
    for (let press = 0; press < 4 && !(await target.isChecked()); press++) {
      await page.keyboard.press('ArrowRight');
    }
    await expect(target).toBeChecked();

    await sortControl(page).focus();
    const options = await sortControl(page).evaluate((select: HTMLSelectElement) => ({
      texts: [...select.options].map((option) => option.text),
      at: select.selectedIndex,
    }));
    const chosen = () => sortControl(page).evaluate((select: HTMLSelectElement) => select.selectedIndex);
    const needed = options.texts.indexOf(order) - options.at;
    for (let press = 0; press < needed; press++) await page.keyboard.press('ArrowDown');
    // Some browsers take an arrow on a closed list as a request to open it, and keep the keys to the list
    // that opens; there the player closes it and types the start of the option's name, which is as much a key.
    if ((await chosen()) !== options.at + needed) {
      await page.keyboard.press('Escape');
      await page.keyboard.type(order.slice(0, 2));
    }
    await expect(sortControl(page).locator('option:checked')).toHaveText(order);
  },
);

Then('{string} is the selected status and the first entry is {string}', async ({ page }, status: string, name: string) => {
  await expect(statusOption(page, status)).toBeChecked();
  await expect.poll(async () => (await listedNames(page))[0]).toBe(name);
});

When('they activate {string} for {string} with the Enter key', async ({ page }, label: string, name: string) => {
  const link = entryAction(entryNamed(page, name), label);
  await link.focus();
  await page.keyboard.press('Enter');
});

