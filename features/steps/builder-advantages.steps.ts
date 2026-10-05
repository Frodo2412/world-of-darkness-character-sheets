import { expect, type Page } from '@playwright/test';
import { BACKGROUNDS } from '../../src/domain/v20/creation/rules';
import { Given, Then, When } from './fixtures';
import {
  expectRated,
  groupBox,
  groupReadout,
  openPlayed,
  openStep,
  rateTrait,
  shownStep,
  traitRating,
} from './support/builder';
import { seedSteps } from './builder-seeding.steps';
import { addCreationDiscipline, creation } from '../../src/domain/v20/creation/testing/play';

const PLURAL: Record<string, string> = { Discipline: 'Disciplines', Background: 'Backgrounds', Virtue: 'Virtues' };

const clanSelect = (page: Page) => page.locator('#builder').getByRole('combobox', { name: 'Clan', exact: true });

/** The visible notice that holds `text`, wherever the refused control was. */
const noticeWith = (page: Page, text: string | RegExp) => shownStep(page).locator('[data-notice]').filter({ hasText: text });

async function disciplineNames(page: Page): Promise<string[]> {
  const group = await groupBox(page, 'Disciplines');
  return group.getByRole('slider').evaluateAll((sliders) =>
    sliders.map((slider) => document.getElementById(slider.getAttribute('aria-labelledby')!)!.textContent ?? ''),
  );
}

async function addDiscipline(page: Page, name: string): Promise<void> {
  await openStep(page, 'Advantages');
  const group = await groupBox(page, 'Disciplines');
  await group.getByLabel('Discipline to add', { exact: true }).fill(name);
  await group.getByRole('button', { name: 'Add Discipline' }).click();
}

// Given

Given('a build with no clan chosen', async ({ page }) => {
  await openPlayed(page);
});

Given('a player on the advantages step', async ({ page }) => {
  await openPlayed(page);
  await openStep(page, 'Advantages');
});

Given(
  'a build of clan {string} with a write-in Discipline, Backgrounds and Virtues placed',
  async ({ page }, clan: string) => {
    await openPlayed(
      page,
      ...seedSteps(undefined, undefined, clan),
      addCreationDiscipline('Flight'),
      creation('discipline:Flight', 2),
      creation('background:Resources', 3),
      creation('background:Allies', 2),
      creation('virtue:conscience', 4),
      creation('virtue:courage', 3),
    );
    await openStep(page, 'Advantages');
  },
);

// When

When(/^they add (?:the|a write-in) Discipline "([^"]+)" and raise it to (\d+)$/, async ({ page }, name: string, value: string) => {
  await addDiscipline(page, name);
  await rateTrait(page, name, Number(value));
});

When(/^they try to add a write-in Discipline "([^"]*)"$/, async ({ page }, name: string) => {
  await addDiscipline(page, name);
});

When('they look at the Background choices', async ({ page }) => {
  await openStep(page, 'Advantages');
});

When(
  /^they raise (\w[\w-]*) to (\d+), ([\w-]+) to (\d+) and (\w[\w-]*) to (\d+)$/,
  async ({ page }, a: string, ra: string, b: string, rb: string, c: string, rc: string) => {
    await rateTrait(page, a, Number(ra));
    await rateTrait(page, b, Number(rb));
    await rateTrait(page, c, Number(rc));
  },
);

When('they try to set the base generation to {string}', async ({ page }, label: string) => {
  await openStep(page, 'Settings');
  await page.getByRole('combobox', { name: 'Base generation', exact: true }).selectOption({ label });
});

When(
  /^using only the keyboard they move the clan choice past "([^"]+)" and "([^"]+)" and back to "([^"]+)"$/,
  async ({ page, memory }, first: string, second: string, back: string) => {
    await openStep(page, 'Concept');
    const select = clanSelect(page);
    await select.focus();
    const options = await select.locator('option').allTextContents();
    const start = options.indexOf(back);
    const far = Math.max(options.indexOf(first), options.indexOf(second));
    for (let index = start; index < far; index += 1) await page.keyboard.press('ArrowDown');
    for (let index = far; index > start; index -= 1) await page.keyboard.press('ArrowUp');
    memory.entered.set('focus', await page.evaluate(() => document.activeElement?.id ?? ''));
  },
);

// Then

Then('they are told to choose a clan on the Concept step before placing Discipline dots', async ({ page }) => {
  const group = await groupBox(page, 'Disciplines');
  await expect(group).toContainText('Choose a clan on the Concept step before placing Discipline dots.');
  await expect(group.getByRole('link', { name: 'Go to Concept' })).toBeVisible();
});

Then('no Discipline dots can be placed', async ({ page }) => {
  await expect((await groupBox(page, 'Disciplines')).getByRole('slider')).toHaveCount(0);
});

Then(/^the Disciplines offered are exactly "([^"]+)", "([^"]+)" and "([^"]+)"$/, async ({ page }, a: string, b: string, c: string) => {
  expect(await disciplineNames(page)).toEqual([a, b, c]);
});

Then('the Disciplines are still only {string}', async ({ page }, name: string) => {
  expect(await disciplineNames(page)).toEqual([name]);
});

Then(/^there (?:are|is) (\d+) (Discipline|Background|Virtue) dots? remaining$/, async ({ page }, count: string, noun: string) => {
  const label = PLURAL[noun];
  const dots = Number(count) === 1 ? 'dot' : 'dots';
  await expect(await groupReadout(page, label)).toHaveText(`${label}: ${count} ${dots} remaining`);
});

Then(
  /^they are told there are no (Discipline|Background|Virtue) dots remaining and more can be bought with freebie points on Finishing touches$/,
  async ({ page }, noun: string) => {
    const notice = (await groupBox(page, PLURAL[noun])).locator('[data-notice]');
    await expect(notice).toContainText(`There are no ${noun} dots remaining. More can be bought with freebie points on Finishing touches.`);
    await expect(notice.getByRole('link', { name: 'Go to Finishing touches' })).toBeVisible();
  },
);

Then(/^they are told (a Discipline needs a name|the build already has \w+)$/, async ({ page }, what: string) => {
  await expect(noticeWith(page, new RegExp(what, 'i'))).toBeVisible();
});

Then(/^the clan is "([^"]+)" with (\w+) rated (\d+) and (\w+) rated (\d+)$/, async ({ page }, name: string, a: string, ra: string, b: string, rb: string) => {
  await expect(clanSelect(page).locator('option:checked')).toHaveText(name);
  await expect(page.locator('[data-clan-change]')).toBeHidden();
  await expectRated(await traitRating(page, a), Number(ra));
  await expectRated(await traitRating(page, b), Number(rb));
});

Then('keyboard focus never left the clan choice', async ({ memory }) => {
  expect(memory.entered.get('focus')).toBe('concept-clan');
});

Then('no clan-change notice is shown', async ({ page }) => {
  await openStep(page, 'Concept');
  await expect(page.locator('#concept-clan-notice')).toHaveText('');
});

Then('the choices are exactly', async ({ page }, table: import('playwright-bdd').DataTable) => {
  const sliders = (await groupBox(page, 'Backgrounds')).getByRole('slider');
  const names = await sliders.evaluateAll((elements) =>
    elements.map((slider) => document.getElementById(slider.getAttribute('aria-labelledby')!)!.textContent ?? ''),
  );
  expect(names).toEqual(table.raw().flat());
  expect(names).toEqual([...BACKGROUNDS]);
});

Then(
  /^they are told, beside Generation, that the effective generation is now (\d+th) with a blood pool maximum of (\d+)$/,
  async ({ page }, generation: string, pool: string) => {
    await expect((await groupBox(page, 'Backgrounds')).locator('[data-notice]')).toHaveText(
      `The effective generation is now ${generation}, with a blood pool maximum of ${pool}.`,
    );
  },
);

Then(
  'the settings step shows the effective generation {string} beside the base generation {string}',
  async ({ page }, effective: string, base: string) => {
    await openStep(page, 'Settings');
    await expect(page.getByRole('status', { name: 'Effective generation', exact: true })).toHaveText(effective);
    await expect(page.getByRole('combobox', { name: 'Base generation' }).locator('option:checked')).toHaveText(base);
  },
);

Then('the effective generation is {string}', async ({ page }, effective: string) => {
  await openStep(page, 'Settings');
  await expect(page.getByRole('status', { name: 'Effective generation', exact: true })).toHaveText(effective);
});

Then('they are told the effective generation cannot be better than 4th', async ({ page }) => {
  await expect(noticeWith(page, 'The effective generation cannot be better than 4th.')).toBeVisible();
});

Then(
  /^they are told to (lower .+|remove .+) first, with a link to (?:the )?(Attributes|Abilities|Advantages|Finishing touches)(?: step)?$/,
  async ({ page }, what: string, step: string) => {
    const sentence = `${what[0].toUpperCase()}${what.slice(1)} first.`;
    const notice = noticeWith(page, sentence);
    await expect(notice).toBeVisible();
    await expect(notice.getByRole('link', { name: `Go to ${step}` })).toBeVisible();
  },
);

Then('Conscience, Self-Control and Courage are each rated 1', async ({ page }) => {
  for (const name of ['Conscience', 'Self-Control', 'Courage']) await expectRated(await traitRating(page, name), 1);
});
