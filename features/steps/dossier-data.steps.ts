import { expect } from '@playwright/test';
import { DOSSIER_FIELDS, type DossierField, type V20Character } from '../../src/domain/v20/character';
import { BACKGROUNDS } from '../../src/domain/v20/creation/rules';
import { Given, Then, When, memoryFor, type ScenarioMemory } from './fixtures';
import type { BuildTraitRef } from '../../src/domain/v20/creation/build';
import { freebie, play } from '../../src/domain/v20/creation/testing/play';
import { buildWith, openBuildId, openSavedBuild, openStep } from './support/builder';
import { entryNamed, listedNames, openRoster, openSheetOf, sheetAddress, statusRegion, unreadableEntries } from './support/pages';
import { rating, setRating } from './support/ratings';
import { characterArranged, characterWith, saveCharacters } from './support/seed';
import { ensureEditing, expectRatingValue, identityName, savedCharacter } from './support/sheet';
import { overwriteRecord, storedText } from './support/storage';

// Step phrases for the stored-data scenarios. They name no tab: they are about what is kept, not a tab.

/** What this file's steps remember about the scenario. */
interface DossierData {
  /** The free text the legacy character was saved with, to compare against after an edit. */
  legacyText?: Pick<V20Character, 'notes' | 'experience' | 'weakness'>;
  /** The names the roster listed before the sheet was opened. */
  listedBefore: string[];
}

const dossierData = (memory: ScenarioMemory): DossierData =>
  memoryFor<DossierData>({ memory }, 'dossier-data', () => ({ listedBefore: [] }));

const NAME = 'Marguerite';

/** The most Backgrounds a build accepts. */
const MAX_BUILD_BACKGROUNDS = 6;

/** A record as it was saved before the dossier fields existed: the same record without them. */
function asSavedBeforeTheDossier(character: V20Character): string {
  const record: Record<string, unknown> = { ...character };
  for (const field of DOSSIER_FIELDS) delete record[field];
  return JSON.stringify(record);
}

/** What a damaged value looks like for each field a scenario damages. */
const DAMAGE: Partial<Record<DossierField, unknown>> = {
  journal: 'not a journal',
  merits: [{ name: 'Eidetic Memory', category: 'Mental', note: '' }],
  havens: [{ name: 'Cellar', kind: 'Tertiary', description: '', location: '', access: '', security: '' }],
};

// Arranging

Given(
  'a character saved before the dossier tabs existed, with text in its notes, experience and weakness fields',
  async ({ page, memory }) => {
    const text = {
      notes: 'Met Lucita at the Elysium.\n  Owes the Prince a boon — "no questions".\n',
      experience: '12 XP spent on Brawl\n(2 unspent)',
      weakness: ' Cannot enter a home uninvited ',
    };
    const character = characterArranged({ name: NAME, clan: 'Toreador' }, (arranged) => Object.assign(arranged, text));
    memory.saved = [character];
    await saveCharacters(page, memory.saved);
    await overwriteRecord(page, character.id, asSavedBeforeTheDossier(character));
    dossierData(memory).legacyText = text;
  },
);

Given('a saved character whose {word} data is damaged', async ({ page, memory }, field: string) => {
  const damage = DAMAGE[field as DossierField];
  if (damage === undefined) throw new Error(`no damage is arranged for the ${field} field`);
  const character = characterWith({ name: 'Fatima' });
  memory.saved = [character];
  await saveCharacters(page, memory.saved);
  const damaged = { ...JSON.parse(JSON.stringify(character)), [field]: damage };
  memory.damaged = { id: character.id, ...(await overwriteRecord(page, character.id, JSON.stringify(damaged))) };
});

Given('another undamaged saved character', async ({ page, memory }) => {
  const other = characterWith({ name: 'Lucita', clan: 'Lasombra' });
  memory.saved = [...memory.saved, other];
  await saveCharacters(page, [other]);
});

Given('a saved character with eight named backgrounds', async ({ page, memory }) => {
  memory.saved = [
    characterArranged({ name: NAME, clan: 'Toreador' }, (character) => {
      character.backgrounds = BACKGROUNDS.slice(0, 8).map((name, index) => ({
        name,
        rating: (index % 3) + 1,
        ...(index === 6 ? { summary: 'A seventh row keeps its details', people: [{ name: 'Joe', role: 'Sergeant' }] } : {}),
      }));
    }),
  ];
  await saveCharacters(page, memory.saved);
});

// Opening

When('its sheet is opened and a trait is changed', async ({ page, memory }) => {
  await page.goto(sheetAddress(memory.saved[0].id));
  await ensureEditing(page);
  await setRating(rating(page, 'Strength'), 4);
});

When("the damaged character's sheet is opened", async ({ page, memory }) => {
  await page.goto(sheetAddress(memory.damaged!.id));
});

When("the roster is opened and then the character's sheet", async ({ page, memory }) => {
  await openRoster(page);
  dossierData(memory).listedBefore = await listedNames(page);
  await openSheetOf(entryNamed(page, NAME));
});

// What is kept and shown

Then('the sheet shows the character as before', async ({ page, memory }) => {
  await expect(page.getByRole('heading', { name: 'Character could not be read' })).toBeHidden();
  await expect(identityName(page)).toHaveText(NAME);
  await expectRatingValue(rating(page, 'Strength'), 4);
  await expectRatingValue(rating(page, 'Dexterity'), memory.saved[0].attributes.dexterity);
});

Then('the saved notes, experience and weakness text is exactly what it was', async ({ page, memory }) => {
  const { id } = memory.saved[0];
  await expect.poll(async () => (await savedCharacter(page, id)).attributes.strength).toBe(4);
  const { notes, experience, weakness } = await savedCharacter(page, id);
  expect({ notes, experience, weakness }).toEqual(dossierData(memory).legacyText);
});

Then('the damaged record is not changed', async ({ page, memory }) => {
  expect(await storedText(page, memory.damaged!.key)).toBe(memory.damaged!.text);
});

Then('the roster still lists the other character', async ({ page }) => {
  await openRoster(page);
  await expect(entryNamed(page, 'Lucita')).toBeVisible();
  await expect(unreadableEntries(page, 'character')).toHaveCount(1);
});

Then('the character is listed and its sheet opens', async ({ page, memory }) => {
  expect(dossierData(memory).listedBefore).toContain(NAME);
  await expect(identityName(page)).toHaveText(NAME);
  await expect(page.getByRole('heading', { name: 'Character could not be read' })).toBeHidden();
});

// The builder opens builds, which are stored apart from characters: a character's own id is a
// "Build not found" there, and a build refuses more than six Backgrounds. So what is opened is a build
// that carries the character's id, name, clan and its first six Backgrounds. That the builder's
// progress counts more than six rated Backgrounds is a unit test (creation/progress.test.ts).
Then('a build carrying that character\'s id and first six Backgrounds opens in the builder and reports progress', async ({ page, memory }) => {
  const { id, header, backgrounds } = memory.saved[0];
  const build = play(
    { ...buildWith({ concept: { name: header.name }, clan: header.clan }), id },
    ...backgrounds.slice(0, MAX_BUILD_BACKGROUNDS).map(({ name: background }) => freebie(`background:${background}` as BuildTraitRef, 1)),
  );
  await openSavedBuild(page, build);
  expect(openBuildId(page)).toBe(id);
  await openStep(page, 'Finishing touches');
  await expect(page.locator('[data-outstanding-list]')).toBeVisible();
  await expect(statusRegion(page)).toBeHidden();
});
