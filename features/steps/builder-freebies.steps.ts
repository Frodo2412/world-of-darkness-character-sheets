import { expect, type Locator, type Page } from '@playwright/test';
import { buyDiscipline, creation, extra, fresh, generation, rank } from '../../src/domain/v20/creation/testing/play';
import { buyDots, leaveFreebies, refFor, seedSteps } from './builder-seeding.steps';
import { Given, Then, When } from './fixtures';
import {
  expectRated,
  freebieBar,
  groupBox,
  groupReadout,
  openFreebieSections,
  openPlayedFrom,
  openStep,
  requestRating,
  shownStep,
  traitName,
  traitRating,
} from './support/builder';

const KINDS: Record<string, string> = { Disciplines: 'Disciplines', Backgrounds: 'Backgrounds' };

const bloodPoolField = (page: Page) => page.getByRole('textbox', { name: 'Starting blood pool', exact: true });

async function onFinishing(page: Page): Promise<void> {
  await openStep(page, 'Finishing touches');
  await openFreebieSections(page);
}

async function rememberFreebies(page: Page, memory: { entered: Map<string, string> }): Promise<void> {
  memory.entered.set('freebies', (await (await freebieBar(page)).textContent()) ?? '');
}

/** Buys one dot of a trait on Finishing touches; a Discipline not shown yet is bought by name. */
async function buyOne(page: Page, name: string): Promise<void> {
  await onFinishing(page);
  const label = traitName(name);
  const control = shownStep(page).getByRole('slider', { name: label, exact: true });
  if ((await control.count()) === 0 && name.startsWith('the Discipline')) {
    await buyNamedDiscipline(page, label);
    return;
  }
  const current = Number(await control.getAttribute('aria-valuenow'));
  await requestRating(control, current + 1);
}

async function buyNamedDiscipline(page: Page, name: string): Promise<void> {
  await onFinishing(page);
  const group = await groupBox(page, 'Disciplines');
  await group.getByLabel('Discipline to buy', { exact: true }).fill(name);
  await group.getByRole('button', { name: 'Buy Discipline' }).click();
}

const noticeWith = (page: Page, text: string): Locator =>
  shownStep(page).locator('[data-notice]').filter({ hasText: text });

// Given

Given(
  /^a build where (\w+) is rated (\d+) from (creation dots|its free dot)( and has no freebie dots| plus one freebie dot)?(?:, with (\d+) freebie points remaining)?$/,
  async ({ page, memory }, name: string, value: string, source: string, freebies?: string, _remaining?: string) => {
    const ref = refFor(name);
    const steps = [];
    if (source === 'creation dots') {
      if (ref.startsWith('attribute:')) steps.push(rank('physical', 'primary'), rank('social', 'secondary'), rank('mental', 'tertiary'));
      else steps.push(rank('talents', 'primary'));
      steps.push(creation(ref, Number(value)));
    }
    if (freebies?.includes('plus one')) steps.push(buyDots(ref, 1));
    await openPlayedFrom(page, fresh(), ...steps);
    if (ref.startsWith('attribute:')) {
      const readout = await groupReadout(page, 'Physical');
      memory.entered.set('physical', (await readout.textContent()) ?? '');
    }
  },
);

Given(
  /^a (\d+)th generation build where (\w+) is rated (\d+) and (\d+) freebie points remain$/,
  async ({ page }, base: string, name: string, value: string, points: string) => {
    await openPlayedFrom(page, fresh(), generation(Number(base)), creation(refFor(name), Number(value)), extra(Number(points) - 15));
  },
);

Given(
  /^a Brujah build with Potence rated 2: 1 from a creation dot and 1 from a freebie dot$/,
  async ({ page }) => {
    await openPlayedFrom(page, fresh(), ...seedSteps(undefined, 'Brujah'), creation('discipline:Potence', 1), buyDots('discipline:Potence', 1));
  },
);

Given(
  /^a build that holds five (Disciplines|Backgrounds) and has 100 freebie points remaining$/,
  async ({ page, memory }, kind: string) => {
    memory.entered.set('kind', kind);
    const steps =
      kind === 'Disciplines'
        ? ['Auspex', 'Dominate', 'Fortitude', 'Obfuscate', 'Protean'].map(buyDiscipline)
        : ['Allies', 'Contacts', 'Domain', 'Fame', 'Herd'].map((name) => creation(refFor(name), 1));
    await openPlayedFrom(page, fresh(), extra(200), ...steps, leaveFreebies(100));
  },
);

Given('a build with freebie dots in every section, a freebie Discipline and a blood pool', async ({ page }) => {
  await openPlayedFrom(
    page,
    fresh(),
    ...seedSteps(undefined, 'Brujah'),
    extra(100),
    buyDots('attribute:strength', 1),
    buyDots('ability:brawl', 1),
    buyDots('discipline:Celerity', 1),
    buyDiscipline('Auspex'),
    buyDots('background:Resources', 1),
    buyDots('virtue:courage', 1),
    buyDots('humanity', 1),
    buyDots('willpower', 1),
    (build) => ({ status: 'applied', build: { ...build, bloodPool: 4 }, notices: [] }),
  );
});

// When

When(/^they (?:try to )?buy one dot of (.+?) with freebie points$/, async ({ page, memory }, name: string) => {
  await rememberFreebies(page, memory);
  await buyOne(page, name);
});

When(/^they remove the freebie dot of (.+)$/, async ({ page }, name: string) => {
  await onFinishing(page);
  const control = await traitRating(page, name);
  const current = Number(await control.getAttribute('aria-valuenow'));
  await requestRating(control, current - 1);
});

When(/^they look at (.+?) on the (finishing touches|attributes) step$/, async ({ page }, name: string, step: string) => {
  if (step === 'attributes') {
    await openStep(page, 'Attributes');
    return;
  }
  await onFinishing(page);
  // A Discipline the build does not hold has no row until one dot of it is bought.
  const label = traitName(name);
  const shown = await shownStep(page).getByRole('slider', { name: label, exact: true }).count();
  if (name.startsWith('the Discipline') && shown === 0) await buyNamedDiscipline(page, label);
});

When(/^they (?:try to )?add (?:the|a write-in) Discipline "([^"]+)" with freebie points$/, async ({ page, memory }, name: string) => {
  await rememberFreebies(page, memory);
  await buyNamedDiscipline(page, name);
});

When('they buy a sixth with freebie points', async ({ page, memory }) => {
  if (memory.entered.get('kind') === 'Disciplines') await buyNamedDiscipline(page, 'Quietus');
  else await buyOne(page, 'the Background Influence');
});

When(/^they enter "?(-?[\w.]+)"? as the starting blood pool$/, async ({ page }, entry: string) => {
  await openStep(page, 'Finishing touches');
  await bloodPoolField(page).fill(entry);
  await bloodPoolField(page).blur();
});

// Then

Then(/^(?:the step shows|there are) (\d+) freebie points? remaining$/, async ({ page }, points: string) => {
  const bar = await freebieBar(page);
  await expect(bar).toBeVisible();
  await expect(bar).toHaveText(`${points} freebie ${Number(points) === 1 ? 'point' : 'points'} remaining`);
});

Then(/^the freebie points remaining are unchanged(?: by the refusal)?$/, async ({ page, memory }) => {
  await expect(await freebieBar(page)).toHaveText(memory.entered.get('freebies')!);
});

Then(
  'the sections show the costs Attributes 5, Abilities 2, Disciplines 7, Backgrounds 1, Virtues 2, Humanity 2 and Willpower 1',
  async ({ page }) => {
    for (const [section, cost] of [
      ['attributes', 5],
      ['abilities', 2],
      ['disciplines', 7],
      ['backgrounds', 1],
      ['virtues', 2],
    ] as const) {
      await expect(shownStep(page).locator(`[data-freebie-section="${section}"] summary`)).toContainText(
        `${cost} freebie ${cost === 1 ? 'point' : 'points'} per dot`,
      );
    }
    await expect(shownStep(page).getByRole('group', { name: 'Humanity and Willpower' })).toContainText('More dots cost 2 and 1 freebie points');
  },
);

Then(/^they are told a (\w+) dot costs (\d+) freebie points and only (\d+) remain$/, async ({ page }, noun: string, cost: string, left: string) => {
  await expect(noticeWith(page, `A ${noun} dot costs ${cost} freebie points and only ${left} remain.`)).toBeVisible();
});

Then(
  /^they are told (creation dots are changed on the \w+ step|freebie dots are removed on Finishing touches), with a link to it$/,
  async ({ page }, what: string) => {
    const step = /on the (\w+) step/.exec(what)?.[1];
    const sentence = `${what[0].toUpperCase()}${what.slice(1)}.`;
    const notice = noticeWith(page, sentence);
    await expect(notice).toBeVisible();
    await expect(notice.getByRole('link', { name: `Go to ${step ?? 'Finishing touches'}` })).toBeVisible();
  },
);

Then(/^(\w+) is announced as (\d+) from creation and (\d+) from freebie points$/, async ({ page }, name: string, creationDots: string, freebieDots: string) => {
  await expect(await traitRating(page, name)).toHaveAttribute(
    'aria-valuetext',
    new RegExp(`${creationDots} from creation, ${freebieDots} from freebie points`),
  );
});

Then('the Physical group has one more dot remaining than before', async ({ page, memory }) => {
  const before = Number(/(\d+) dots? remaining/.exec(memory.entered.get('physical')!)![1]);
  const dots = before + 1 === 1 ? 'dot' : 'dots';
  await expect(await groupReadout(page, 'Physical')).toHaveText(`Physical: ${before + 1} ${dots} remaining`);
});

Then(/^(\w+) is rated (\d+), from the freebie dot$/, async ({ page }, name: string, value: string) => {
  await onFinishing(page);
  const control = await traitRating(page, name);
  await expectRated(control, Number(value));
  await expect(control).toHaveAttribute('aria-valuetext', /0 from creation, 1 from freebie points/);
});

Then(/^(\w+) is no longer among the build's Disciplines$/, async ({ page }, name: string) => {
  await onFinishing(page);
  await expect((await groupBox(page, 'Disciplines')).getByRole('slider', { name, exact: true })).toHaveCount(0);
});

Then(/^the build holds six (Disciplines|Backgrounds)$/, async ({ page }, kind: string) => {
  const sliders = (await groupBox(page, KINDS[kind])).getByRole('slider');
  const values = await sliders.evaluateAll((all) => all.map((slider) => Number(slider.getAttribute('aria-valuenow'))));
  expect(values.filter((value) => value > 0)).toHaveLength(6);
});

Then(
  /^trying to buy a seventh is refused because a character holds at most six (Disciplines|Backgrounds)$/,
  async ({ page, memory }, kind: string) => {
    await rememberFreebies(page, memory);
    if (kind === 'Disciplines') await buyNamedDiscipline(page, 'Serpentis');
    else await buyOne(page, 'the Background Mentor');
    await expect(noticeWith(page, `A character holds at most six ${kind}.`)).toBeVisible();
  },
);

Then('the starting blood pool is {int}', async ({ page }, value: number) => {
  await openStep(page, 'Finishing touches');
  await expect(bloodPoolField(page)).toHaveValue(String(value));
});

Then('the starting blood pool is still {int}', async ({ page }, value: number) => {
  await expect(bloodPoolField(page)).not.toHaveValue(String(value));
  await page.reload();
  await openStep(page, 'Finishing touches');
  await expect(bloodPoolField(page)).toHaveValue(String(value));
});

Then(
  /^they are told, beside the field, that the blood pool must be a whole number from 0 to (\d+)$/,
  async ({ page }, max: string) => {
    await expect(bloodPoolField(page)).toHaveAccessibleDescription(new RegExp(`The blood pool must be a whole number from 0 to ${max}\\.`));
    await expect(bloodPoolField(page)).toHaveAttribute('aria-invalid', 'true');
  },
);

Then(
  /^they are told (\d+) freebie points are spent, so at least (\d+) points of purchases must be removed first, with a link to Finishing touches$/,
  async ({ page }, spent: string, at: string) => {
    const notice = noticeWith(page, `${spent} freebie points are spent, so at least ${at} points of purchases must be removed first.`);
    await expect(notice).toBeVisible();
    await expect(notice.getByRole('link', { name: 'Go to Finishing touches' })).toBeVisible();
  },
);
