// The builder as a whole: journeys through the real UI, every message and
// dialog state, keyboard-only use, and what is announced.

import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';
import { completeBuild, creation, generation } from '../../src/domain/v20/creation/testing/play';
import { Given, Then, When } from './fixtures';
import {
  activateFinish,
  announcements,
  builderAddress,
  buildWith,
  enterExtraFreebies,
  finishDialog,
  freebieBar,
  groupNotice,
  openPlayed,
  openPlayedFrom,
  openStep,
  placeDots,
  rankGroup,
  rankSelect,
  rateTrait,
  requestRating,
  saveBuilds,
  setBaseGeneration,
  shownStep,
  startBuild,
  stepNav,
  traitRating,
} from './support/builder';
import { buildEntries, openRoster } from './support/pages';
import { identityName, identitySummary } from './support/sheet';
import { overwriteRecord, refuseWrites } from './support/storage';
import { seedSteps } from './builder-seeding.steps';

/** Spends what is left: Willpower first, then one point at a time on Backgrounds. */
async function spendEverything(page: Page): Promise<void> {
  const left = async () => Number(/^(\d+)/.exec((await (await freebieBar(page)).textContent()) ?? '0')![1]);
  await openStep(page, 'Finishing touches');
  const willpower = await traitRating(page, 'Willpower');
  const current = Number(await willpower.getAttribute('aria-valuenow'));
  const room = Math.min(await left(), 10 - current);
  if (room > 0) await rateTrait(page, 'Willpower', current + room);
  for (const name of ['Contacts', 'Domain', 'Fame', 'Herd', 'Influence']) {
    const remaining = await left();
    if (remaining === 0) break;
    const control = await traitRating(page, name);
    const value = Number(await control.getAttribute('aria-valuenow'));
    await rateTrait(page, name, Math.min(5, value + remaining));
  }
  await expect(await freebieBar(page)).toHaveText('0 freebie points remaining');
}

async function placeAttributes(page: Page): Promise<void> {
  await rankGroup(page, 'Physical', 'primary');
  await rankGroup(page, 'Social', 'secondary');
  await rankGroup(page, 'Mental', 'tertiary');
  await placeDots(page, 'Physical', 7, 5);
  await placeDots(page, 'Social', 5, 5);
  await placeDots(page, 'Mental', 3, 5);
}

async function placeAbilities(page: Page): Promise<void> {
  await rankGroup(page, 'Talents', 'primary');
  await rankGroup(page, 'Skills', 'secondary');
  await rankGroup(page, 'Knowledges', 'tertiary');
  await placeDots(page, 'Talents', 13, 3);
  await placeDots(page, 'Skills', 9, 3);
  await placeDots(page, 'Knowledges', 5, 3);
}

async function chooseClan(page: Page, clan: string): Promise<void> {
  await openStep(page, 'Concept');
  await page.locator('#builder').getByRole('combobox', { name: 'Clan', exact: true }).selectOption({ label: clan });
}

// Journeys

When('they set the base generation to {string} and the extra freebie points to {int}', async ({ page }, label: string, points: number) => {
  await setBaseGeneration(page, label);
  await enterExtraFreebies(page, String(points));
});

When('they enter the name {string} and choose the clan {string}', async ({ page }, name: string, clan: string) => {
  await openStep(page, 'Concept');
  await page.locator('#builder').getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  await chooseClan(page, clan);
});

When('they rank the Attribute groups and place all 15 Attribute dots', async ({ page }) => {
  await placeAttributes(page);
});

When('they rank the Ability groups and place all 27 Ability dots', async ({ page }) => {
  await placeAbilities(page);
});

When(
  'they place 3 Discipline dots, 5 Background dots \\(none on Generation) and 7 Virtue dots',
  async ({ page }) => {
    await placeDots(page, 'Disciplines', 3, 3);
    await placeDots(page, 'Backgrounds', 5, 5);
    await placeDots(page, 'Virtues', 7, 5);
  },
);

When('they spend all 20 freebie points \\(none on Generation)', async ({ page }) => {
  await expect(await freebieBar(page)).toHaveText('20 freebie points remaining');
  await spendEverything(page);
});

When('they place 7 Virtue dots and 5 Background dots before anything else', async ({ page }) => {
  await placeDots(page, 'Virtues', 7, 5);
  await placeDots(page, 'Backgrounds', 5, 5);
});

When('they choose the clan {string} and place 3 Discipline dots', async ({ page }, clan: string) => {
  await chooseClan(page, clan);
  await placeDots(page, 'Disciplines', 3, 3);
});

Then(
  'the character sheet is shown for {string} of clan {string} and generation {string}',
  async ({ page }, name: string, clan: string, generationText: string) => {
    await expect(page.getByRole('heading', { name: 'Character sheet' })).toBeVisible();
    await expect(identityName(page)).toHaveText(name);
    await expect(identitySummary(page)).toContainText(clan);
    await expect(identitySummary(page)).toContainText(`${generationText} generation`);
  },
);

Given(
  'a player who has ranked the Attribute groups, chosen the clan {string} and bought one freebie dot',
  async ({ page }, clan: string) => {
    await startBuild(page);
    await rankGroup(page, 'Physical', 'primary');
    await rankGroup(page, 'Social', 'secondary');
    await rankGroup(page, 'Mental', 'tertiary');
    await chooseClan(page, clan);
    await openStep(page, 'Finishing touches');
    await rateTrait(page, 'Willpower', 2);
  },
);

When('they go to the roster and continue the build', async ({ page }) => {
  await openRoster(page);
  await buildEntries(page).getByRole('link', { name: /^Continue/ }).click();
});

Then('the ranks, the clan and the freebie points remaining are as they left them', async ({ page }) => {
  await expect(await rankSelect(page, 'Physical')).toHaveValue('primary');
  await expect(await rankSelect(page, 'Social')).toHaveValue('secondary');
  await expect(await rankSelect(page, 'Mental')).toHaveValue('tertiary');
  await openStep(page, 'Concept');
  await expect(page.locator('#builder').getByRole('combobox', { name: 'Clan' }).locator('option:checked')).toHaveText('Gangrel');
  await expect(await freebieBar(page)).toHaveText('14 freebie points remaining');
});

// States

const STATES: Record<string, (page: Page) => Promise<void>> = {
  'a refusal beside a group': async (page) => {
    await openPlayed(page, ...seedSteps(undefined, undefined, undefined, 'Mental ranked tertiary and Perception rated 4'));
    await requestRating(await traitRating(page, 'Wits'), 2);
    await expect(await groupNotice(page, 'Mental')).not.toHaveText('');
  },
  'a rejected number entry': async (page) => {
    await openPlayed(page);
    await enterExtraFreebies(page, '1000');
    await expect(page.getByRole('textbox', { name: 'Extra freebie points' })).toHaveAttribute('aria-invalid', 'true');
  },
  'the not-saved message': async (page) => {
    await openPlayed(page);
    await refuseWrites(page);
    await setBaseGeneration(page, '10th');
    await expect(page.getByRole('alert')).toBeVisible();
  },
  'the clan-change confirmation': async (page) => {
    await openPlayed(page, ...seedSteps(undefined, undefined, 'Brujah', 'Celerity rated 2 and Potence rated 1'));
    await chooseClan(page, 'Toreador');
    await expect(page.locator('[data-clan-change]')).toBeVisible();
  },
  'a clan-change notice': async (page) => {
    await openPlayed(page, ...seedSteps(undefined, undefined, 'Brujah', 'Celerity rated 2 and Potence rated 1'));
    await chooseClan(page, 'Toreador');
    await page.getByRole('button', { name: 'Switch to Toreador' }).click();
    await expect(page.locator('#concept-clan-notice')).not.toHaveText('');
  },
  'the outstanding list with items': async (page) => {
    await openPlayed(page);
    await openStep(page, 'Finishing touches');
  },
  'the unspent-freebies confirmation': async (page) => {
    await openPlayedFrom(page, completeBuild('Brujah'));
    await activateFinish(page);
    await expect(finishDialog(page)).toBeVisible();
  },
  'the build not found message': async (page) => {
    await page.goto(builderAddress('no-such-build'));
    await expect(page.getByRole('heading', { name: 'Build not found' })).toBeVisible();
  },
  'the unreadable build message': async (page) => {
    const build = buildWith();
    await saveBuilds(page, [build]);
    await overwriteRecord(page, build.id, 'not a build');
    await page.goto(builderAddress(build.id));
    await expect(page.getByRole('heading', { name: 'Build could not be read' })).toBeVisible();
  },
  'a locked Appearance for a Nosferatu': async (page) => {
    await openPlayed(page, ...seedSteps(undefined, undefined, 'Nosferatu'));
    await openStep(page, 'Attributes');
  },
  'ratings of 9 dots at 4th generation': async (page) => {
    await openPlayedFrom(page, completeBuild('Brujah'), generation(4), creation('attribute:dexterity', 1), creation('attribute:stamina', 1), creation('attribute:strength', 8));
    await openStep(page, 'Attributes');
  },
};

Given(/^a build showing (.+)$/, async ({ page }, state: string) => {
  await STATES[state](page);
});

When('the page is checked', async ({ page, memory }) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  memory.violations = results.violations.map(
    (violation) => `${violation.id}: ${violation.help} — ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
});

// Keyboard

Given('a build in progress of clan {string}', async ({ page }, clan: string) => {
  await openPlayed(page, ...seedSteps(undefined, undefined, clan));
});

/** Moves focus with Tab (or Shift+Tab) until `target` has it, noting whether focus was visible at each stop. */
async function tabTo(page: Page, target: Locator, stops: { control: string; visible: boolean }[], backwards = false): Promise<void> {
  for (let presses = 0; presses < 250; presses += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press(backwards ? 'Shift+Tab' : 'Tab');
    stops.push(
      await page.evaluate(() => {
        const focused = document.activeElement!;
        const style = getComputedStyle(focused);
        return {
          control: focused.getAttribute('aria-label') ?? focused.id ?? focused.tagName.toLowerCase(),
          visible:
            focused.matches(':focus-visible') &&
            style.outlineStyle !== 'none' &&
            parseFloat(style.outlineWidth) >= 2 &&
            !style.outlineColor.includes('transparent'),
        };
      }),
    );
  }
  throw new Error('The control was never reached with the keyboard.');
}

/** Opens a step from the navigation with the keyboard alone. */
async function keyboardOpen(page: Page, step: string, stops: { control: string; visible: boolean }[]): Promise<void> {
  await tabTo(page, stepNav(page).getByRole('link', { name: step, exact: true }), stops);
  await page.keyboard.press('Enter');
  await expect(shownStep(page).getByRole('heading', { name: step, level: 2 })).toBeFocused();
}

const KEYBOARD: Record<string, (page: Page, stops: { control: string; visible: boolean }[]) => Promise<void>> = {
  'set the base generation to "10th"': async (page, stops) => {
    await tabTo(page, page.getByRole('combobox', { name: 'Base generation' }), stops);
    await page.keyboard.type('10');
  },
  'choose the clan "Brujah"': async (page, stops) => {
    await keyboardOpen(page, 'Concept', stops);
    await tabTo(page, page.locator('#builder').getByRole('combobox', { name: 'Clan', exact: true }), stops);
    await page.keyboard.type('Bru');
  },
  'rank Physical primary and raise Strength to 3': async (page, stops) => {
    await keyboardOpen(page, 'Attributes', stops);
    await tabTo(page, page.getByRole('combobox', { name: 'Physical rank' }), stops);
    await page.keyboard.type('p');
    await tabTo(page, shownStep(page).getByRole('slider', { name: 'Strength', exact: true }), stops);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
  },
  'rank Talents primary and raise Brawl to 2': async (page, stops) => {
    await keyboardOpen(page, 'Abilities', stops);
    await tabTo(page, page.getByRole('combobox', { name: 'Talents rank' }), stops);
    await page.keyboard.type('p');
    await tabTo(page, shownStep(page).getByRole('slider', { name: 'Brawl', exact: true }), stops);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
  },
  'add the Discipline "Protean" and raise it to 1': async (page, stops) => {
    await keyboardOpen(page, 'Advantages', stops);
    await tabTo(page, shownStep(page).getByLabel('Discipline to add', { exact: true }), stops);
    await page.keyboard.type('Protean');
    await page.keyboard.press('Enter');
    await tabTo(page, shownStep(page).getByRole('slider', { name: 'Protean', exact: true }), stops, true);
    await page.keyboard.press('ArrowRight');
  },
  'buy one dot of Willpower with freebie points': async (page, stops) => {
    await keyboardOpen(page, 'Finishing touches', stops);
    await tabTo(page, shownStep(page).getByRole('slider', { name: 'Willpower', exact: true }), stops);
    await page.keyboard.press('ArrowRight');
  },
  'move from Settings to Advantages with the navigation': async (page, stops) => {
    await keyboardOpen(page, 'Advantages', stops);
  },
};

When(/^using only the keyboard they ((?!focus \w+ and press)(?!move the clan choice).+)$/, async ({ page, memory }, action: string) => {
  if (action === 'activate Finish and press Escape') {
    await keyboardOpen(page, 'Finishing touches', memory.focusStops);
    await tabTo(page, page.getByRole('button', { name: 'Finish', exact: true }), memory.focusStops);
    await page.keyboard.press('Enter');
    await expect(finishDialog(page)).toBeVisible();
    await page.keyboard.press('Escape');
    return;
  }
  await KEYBOARD[action](page, memory.focusStops);
});

Then('every control they stopped on showed a visible focus indicator', async ({ memory }) => {
  expect(memory.focusStops.length).toBeGreaterThan(0);
  expect(memory.focusStops.filter((stop) => !stop.visible)).toEqual([]);
});

// Announcements

Then('{string} is announced once', async ({ page }, text: string) => {
  await expect.poll(async () => (await announcements(page)).filter((entry) => entry === text)).toEqual([text]);
});

When('Strength is read by assistive technology on the attributes step', async ({ page }) => {
  await openStep(page, 'Attributes');
});

Then(
  /^it is announced as "([^"]+)", value (\d+), lowest (\d+), highest (\d+)$/,
  async ({ page }, name: string, value: string, lowest: string, highest: string) => {
    const control = shownStep(page).getByRole('slider', { name, exact: true });
    await expect(control).toHaveAttribute('aria-valuenow', String(value));
    await expect(control).toHaveAttribute('aria-valuemin', String(lowest));
    await expect(control).toHaveAttribute('aria-valuemax', String(highest));
  },
);

Then('the refusal text is announced once', async ({ page }) => {
  await expect
    .poll(async () => (await announcements(page)).filter((entry) => entry.includes('Mental has no dots remaining')).length)
    .toBe(1);
});

Then('the refusal text is shown inside the Mental group', async ({ page }) => {
  await expect(await groupNotice(page, 'Mental')).toContainText('Mental has no dots remaining.');
});

Then('Wits is described by that refusal text', async ({ page }) => {
  await expect(await traitRating(page, 'Wits')).toHaveAccessibleDescription(/Mental has no dots remaining\./);
});

Then('nothing new is announced', async ({ page }) => {
  // Mutation records are delivered before the click that caused them returns.
  const log = await announcements(page);
  expect(log.filter((entry) => entry.includes('Mental has no dots remaining'))).toHaveLength(1);
  expect(log.at(-1)).toContain('Mental has no dots remaining');
});
