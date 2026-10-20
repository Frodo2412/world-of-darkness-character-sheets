import { expect, type Page } from '@playwright/test';
import { BACKGROUNDS } from '../../src/domain/v20/creation/rules';
import { Given, Then, When } from './fixtures';
import {
  baseGeneration,
  openCreationSettings,
  openPlayed,
  openStep,
  readout,
  setBaseGeneration,
  settingsDialog,
  shownStep,
} from './support/builder';
import { addDiscipline, disciplineNames } from './support/advantages';
import { clanNotice, clanPanel, clanRadio, expectClanChosen, focusedClan, openClanScreen } from './support/clan';
import { expectRated, groupBox, groupReadout, rateTrait, ratingsIn, traitRating } from './support/ranked';
import { seedSteps } from './builder-seeding.steps';
import { addCreationDiscipline, creation } from '../../src/domain/v20/creation/testing/play';

const PLURAL: Record<string, string> = { Discipline: 'Disciplines', Background: 'Backgrounds', Virtue: 'Virtues' };

/** The visible notice that holds `text`, wherever the refused control was. */
const noticeWith = (page: Page, text: string | RegExp) =>
  shownStep(page).locator('[data-notice]').or(settingsDialog(page).locator('[data-notice]')).filter({ hasText: text });

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
  await setBaseGeneration(page, label);
});

When(
  /^using only the keyboard they move through the clans past "([^"]+)" and "([^"]+)" and back to "([^"]+)"$/,
  async ({ page, memory }, first: string, second: string, back: string) => {
    await openClanScreen(page);
    await clanRadio(page, back).focus();
    const names = await page.locator('[data-clan-card]').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-clan-card')!));
    const start = names.indexOf(back);
    const far = Math.max(names.indexOf(first), names.indexOf(second));
    const keys = [...Array<string>(far - start).fill('ArrowDown'), ...Array<string>(far - start).fill('ArrowUp')];
    let inList = true;
    for (const key of keys) {
      await page.keyboard.press(key);
      inList &&= (await focusedClan(page)) !== '';
    }
    // Walked there and back: focus is on the clan it started from, and was on a clan the whole way.
    memory.entered.set('focus', inList && (await focusedClan(page)) === back ? 'clan list' : 'elsewhere');
  },
);

// Then

Then('they are told to choose a clan on the Clan step before placing Discipline dots', async ({ page }) => {
  const group = await groupBox(page, 'Disciplines');
  await expect(group).toContainText('Choose a clan on the Clan step before placing Discipline dots.');
  await expect(group.getByRole('link', { name: 'Go to Clan' })).toBeVisible();
});

Then('no Discipline dots can be placed', async ({ page }) => {
  await expect(ratingsIn(await groupBox(page, 'Disciplines'))).toHaveCount(0);
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
  await expectClanChosen(page, name);
  await expect(clanPanel(page)).toBeHidden();
  await expectRated(await traitRating(page, a), Number(ra));
  await expectRated(await traitRating(page, b), Number(rb));
});

Then('keyboard focus never left the clan list', async ({ memory }) => {
  expect(memory.entered.get('focus')).toBe('clan list');
});

Then('no clan-change notice is shown', async ({ page }) => {
  await openClanScreen(page);
  await expect(clanNotice(page)).toHaveText('');
});

Then('the choices are exactly', async ({ page }, table: import('playwright-bdd').DataTable) => {
  const rows = ratingsIn(await groupBox(page, 'Backgrounds'));
  const names = await rows.evaluateAll((elements) =>
    elements.map((row) => document.getElementById(row.getAttribute('data-label-id')!)!.textContent ?? ''),
  );
  expect(names).toEqual(table.raw().flat());
  expect(names).toEqual([...BACKGROUNDS]);
});

Then(
  /^they are told, beside Generation, that the effective generation is now (\d+th) with a Blood Pool maximum of (\d+)$/,
  async ({ page }, generation: string, pool: string) => {
    await expect((await groupBox(page, 'Backgrounds')).locator('[data-notice]')).toHaveText(
      `The effective generation is now ${generation}, with a Blood Pool maximum of ${pool}.`,
    );
  },
);

Then(
  'the Creation settings show the effective generation {string} beside the base generation {string}',
  async ({ page }, effective: string, base: string) => {
    await openCreationSettings(page);
    await expect(readout(page, 'Effective generation')).toHaveText(effective);
    await expect(baseGeneration(page).locator('option:checked')).toHaveText(base);
  },
);

Then('the effective generation is {string}', async ({ page }, effective: string) => {
  await openCreationSettings(page);
  await expect(readout(page, 'Effective generation')).toHaveText(effective);
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
