import { expect } from '@playwright/test';
import { abilitiesRanked, creation } from '../../src/domain/v20/creation/testing/play';
import { ABILITY_GROUPS } from '../../src/domain/v20/traits';
import { Given, Then } from './fixtures';
import { expectRated, groupBox, groupNotice, openPlayed, openStep, startBuild, traitRating } from './support/builder';

Given('a player on the abilities step', async ({ page }) => {
  await startBuild(page);
  await openStep(page, 'Abilities');
});

Given('a build with ranked Ability groups and dots placed', async ({ page }) => {
  await openPlayed(page, ...abilitiesRanked, creation('ability:brawl', 3), creation('ability:stealth', 2), creation('ability:occult', 1));
  await openStep(page, 'Abilities');
});

Then('all thirty Abilities are rated 0', async ({ page }) => {
  const labels: string[] = ABILITY_GROUPS.flatMap((group) => group.traits.map((trait) => trait.label));
  expect(labels).toHaveLength(30);
  for (const label of labels) await expectRated(await traitRating(page, label), 0);
});

Then(
  'they are told Abilities cannot go above 3 before freebie points, which are spent on Finishing touches',
  async ({ page }) => {
    const notice = await groupNotice(page, 'Talents');
    await expect(notice).toContainText('Abilities cannot go above 3 before freebie points, which are spent on Finishing touches.');
    await expect(notice.getByRole('link', { name: 'Go to Finishing touches' })).toBeVisible();
  },
);

Then(
  "with a group's last row scrolled into view, that group's remaining-dots readout is inside the viewport",
  async ({ page }) => {
    const group = await groupBox(page, 'Knowledges');
    await group.getByRole('slider').last().scrollIntoViewIfNeeded();
    const readout = group.locator('[data-allotment-status]');
    const box = (await readout.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  },
);
