import { expect } from '@playwright/test';
import type { V20Character } from '../../src/domain/v20/character';
import { Given, Then, When } from './fixtures';
import { announcements } from './support/announcements';
import {
  addButton,
  backgroundsPanel,
  emptyState,
  entriesOf,
  entryNamed,
  expectBackgroundsShown,
  fieldNamed,
  headingCount,
  indexItem,
  type Section,
} from './support/backgrounds';
import { characterArranged, givenSaved } from './support/seed';
import { enterEditMode, openSavedSheet } from './support/sheet';
import { showTab } from './support/tabs';

// Step phrases for the Backgrounds tab. Each is specific to it, so none overlaps another tab's.

const HEADER = { name: 'Marguerite', clan: 'Toreador' };

const named = (names: readonly string[]): V20Character['backgrounds'] => names.map((name, index) => ({ name, rating: (index % 3) + 1 }));

/** Saves a character, opens its sheet and enters edit mode: where the editing scenarios begin. */
async function givenEditing(
  page: Parameters<typeof openSavedSheet>[0],
  memory: { saved: V20Character[] },
  arrange: (character: V20Character) => void,
): Promise<void> {
  memory.saved = [characterArranged(HEADER, arrange)];
  await openSavedSheet(page, memory.saved[0]);
  await enterEditMode(page);
}

const MERITS: V20Character['merits'] = [
  { name: 'Acute Sense', category: 'Physical', points: 1, note: 'She studies brushwork.' },
  { name: 'Eidetic Memory', category: 'Mental', points: 2, note: 'Faces linger.' },
];
const FLAW: V20Character['flaws'][number] = { name: 'Dark Secret', category: 'Social', points: 1, note: 'A stolen painting.' };

/** Shows the Backgrounds tab as a player does when a sheet is open, or by its address when none is. */
async function showBackgrounds(page: Parameters<typeof showTab>[0], memory: { saved: V20Character[] }): Promise<void> {
  if (/\/sheet\//.test(page.url())) await showTab(page, 'Backgrounds');
  else {
    await page.goto(`/sheet/?id=${encodeURIComponent(memory.saved[0].id)}&tab=backgrounds`);
  }
  await expectBackgroundsShown(page);
}

// Arranging

Given(
  /^a character with Allies (\d) summarised "([^"]+)" and two named allies$/,
  async ({ page, memory }, rating: string, summary: string) => {
    await givenSaved(page, memory, HEADER, (character) => {
      character.backgrounds[0] = {
        name: 'Allies',
        rating: Number(rating),
        summary,
        note: 'Arranges private viewings and introductions.',
        people: [
          { name: 'Camille Arnaud', role: 'curator' },
          { name: 'Dr. Laurent', role: 'conservator' },
        ],
      };
    });
  },
);

Given('a character with two named backgrounds and four blank rows', async ({ page, memory }) => {
  await givenSaved(page, memory, HEADER, (character) => {
    character.backgrounds[0] = { name: 'Allies', rating: 2 };
    character.backgrounds[1] = { name: 'Mentor', rating: 1 };
  });
});

Given('a character in edit mode with two named backgrounds and four blank rows', async ({ page, memory }) => {
  await givenEditing(page, memory, (character) => {
    character.backgrounds[0] = { name: 'Allies', rating: 2 };
    character.backgrounds[1] = { name: 'Mentor', rating: 1 };
  });
});

Given('a character in edit mode with a background row holding a note but no name', async ({ page, memory }) => {
  await givenEditing(page, memory, (character) => {
    character.backgrounds[0] = { name: '', rating: 0, note: 'Owes her a recovered portrait.' };
  });
});

Given('a character with merits of 1 and 2 points and a flaw of 1 point', async ({ page, memory }) => {
  await givenSaved(page, memory, HEADER, (character) => {
    character.merits = MERITS.map((merit) => ({ ...merit }));
    character.flaws = [{ ...FLAW }];
  });
});

Given(
  /^a character with a Primary haven and a Secondary haven and an unrated trait "([^"]+)" noted "([^"]+)"$/,
  async ({ page, memory }, trait: string, note: string) => {
    await givenSaved(page, memory, HEADER, (character) => {
      character.havens = [
        { name: 'The Atelier', kind: 'Primary', description: 'A converted studio above a gallery.', location: 'Rue Morgue', access: 'Key and password', security: 'Alarmed, two ghouls' },
        { name: 'Saint-Agnès archive', kind: 'Secondary', description: 'A disused archive beneath a chapel.', location: 'Riverside', access: 'Service door', security: 'No windows' },
      ];
      character.otherTraits = [{ name: trait, kind: 'Narrative', note }];
    });
  },
);

Given('a character in play mode with backgrounds', async ({ page, memory }) => {
  memory.saved = [
    characterArranged(HEADER, (character) => {
      character.backgrounds[0] = { name: 'Allies', rating: 2, summary: 'Camille Arnaud · museum curator' };
      character.merits = [{ ...MERITS[0] }];
    }),
  ];
  await openSavedSheet(page, memory.saved[0]);
});

Given('a character in edit mode with one merit of 1 point', async ({ page, memory }) => {
  await givenEditing(page, memory, (character) => {
    character.merits = [{ ...MERITS[0] }];
  });
});

Given('a character in edit mode on the Backgrounds tab with a merit', async ({ page, memory }) => {
  await givenEditing(page, memory, (character) => {
    character.merits = [{ ...MERITS[0] }];
  });
  await showBackgrounds(page, memory);
});

Given('a character in edit mode with one flaw of 1 point', async ({ page, memory }) => {
  await givenEditing(page, memory, (character) => {
    character.flaws = [{ ...FLAW }];
  });
});

Given('a character in edit mode with six named backgrounds', async ({ page, memory }) => {
  await givenEditing(page, memory, (character) => {
    character.backgrounds = named(['Allies', 'Contacts', 'Resources', 'Fame', 'Retainers', 'Herd']);
  });
});

Given('a character with no backgrounds, havens, merits, flaws or other traits', async ({ page, memory }) => {
  await givenSaved(page, memory, HEADER);
});

Given(
  'a character with five backgrounds, two havens, two merits, one flaw and three other traits',
  async ({ page, memory }) => {
    await givenSaved(page, memory, HEADER, (character) => {
      character.backgrounds = [...named(['Allies', 'Mentor', 'Resources', 'Fame', 'Herd']), { name: '', rating: 0 }];
      character.havens = [
        { name: 'Atelier', kind: 'Primary', description: '', location: '', access: '', security: '' },
        { name: 'Archive', kind: 'Secondary', description: '', location: '', access: '', security: '' },
      ];
      character.merits = MERITS.map((merit) => ({ ...merit }));
      character.flaws = [{ ...FLAW }];
      character.otherTraits = ['Languages', 'Restoration', 'Provenance'].map((name) => ({ name, kind: 'Narrative', note: '' }));
    });
  },
);

Given('a character in edit mode with eight backgrounds', async ({ page, memory }) => {
  await givenEditing(page, memory, (character) => {
    character.backgrounds = named([
      'Allies', 'Contacts', 'Resources', 'Fame', 'Retainers', 'Herd', 'Domain of the Voss Antiquities Trade', 'Supercalifragilisticexpialidocious Influence',
    ]);
    character.backgrounds[0].people = [{ name: 'Camille Arnaud of the Old Quarter', role: 'museum curator and restorer' }];
  });
});

// Using the tab

When(/^the player adds the merit "([^"]+)" of (\d+) points on the Backgrounds tab$/, async ({ page, memory }, name: string, points: string) => {
  await showBackgrounds(page, memory);
  await addButton(page, 'Add merit').click();
  const nameField = backgroundsPanel(page).getByRole('textbox', { name: /^Merit \d+ name$/ }).last();
  await expect(nameField).toBeFocused();
  await nameField.fill(name);
  const pointsField = backgroundsPanel(page).getByRole('spinbutton', { name: /^Merit \d+ points$/ }).last();
  await pointsField.fill(String(points));
  await pointsField.press('Tab');
});

When('the player removes the flaw on the Backgrounds tab', async ({ page, memory }) => {
  await showBackgrounds(page, memory);
  await entriesOf(page, 'flaws').first().getByRole('button', { name: /^Remove / }).click();
});

When('the player presses Undo on the Backgrounds tab', async ({ page }) => {
  await backgroundsPanel(page).getByRole('button', { name: 'Undo', exact: true }).click();
});

When(/^the player adds the background "([^"]+)" on the Backgrounds tab$/, async ({ page, memory }, name: string) => {
  await showBackgrounds(page, memory);
  await addButton(page, 'Add background').click();
  const nameField = backgroundsPanel(page).getByRole('textbox', { name: /^Background \d+ name$/ }).last();
  await expect(nameField).toBeFocused();
  await nameField.fill(name);
});

When(/^the player enters (-?\d+) points on the Backgrounds tab$/, async ({ page, memory }, points: string) => {
  await showBackgrounds(page, memory);
  const field = fieldNamed(page, 'Merit 1 points');
  await field.fill(String(points));
  await field.press('Tab');
});

// What the tab shows

Then('Allies shows 2 of 5 dots, its summary, its note and both people with their roles', async ({ page }) => {
  const card = entryNamed(page, 'backgrounds', 'Allies');
  const dots = card.locator('.bg-view dot-rating');
  await expect(dots).toHaveAttribute('value', '2');
  await expect(dots).toHaveAttribute('max', '5');
  await expect(card.locator('.bg-card-number')).toHaveText('2');
  await expect(card.locator('.bg-card-summary')).toHaveText('Camille Arnaud · museum curator');
  await expect(card.locator('.bg-card-note')).toHaveText('Arranges private viewings and introductions.');
  await expect(card.locator('.bg-pill-name')).toHaveText(['Camille Arnaud', 'Dr. Laurent']);
  await expect(card.locator('.bg-pill-role')).toHaveText(['curator', 'conservator']);
});

Then('two background cards are shown', async ({ page }) => {
  await expect(entriesOf(page, 'backgrounds')).toHaveCount(2);
});

Then('six background rows are shown, four of them empty', async ({ page }) => {
  await expect(entriesOf(page, 'backgrounds')).toHaveCount(6);
  await expect(backgroundsPanel(page).locator('[data-list="backgrounds"] > li[data-blank="true"]')).toHaveCount(4);
});

Then('an "Add background" control is shown', async ({ page }) => {
  await expect(addButton(page, 'Add background')).toBeVisible();
});

Then('that row says "Name needed to show in play mode"', async ({ page }) => {
  await expect(entriesOf(page, 'backgrounds').first().getByText('Name needed to show in play mode', { exact: true })).toBeVisible();
});

Then('the Merits heading reads {string} and the Flaws heading {string}', async ({ page }, merits: string, flaws: string) => {
  await expect(headingCount(page, 'merits')).toHaveText(merits);
  await expect(headingCount(page, 'flaws')).toHaveText(flaws);
});

Then('the Merits heading reads {string}', async ({ page }, merits: string) => {
  await expect(headingCount(page, 'merits')).toHaveText(merits);
});

Then('the merits show "1 pt" and "2 pts" and each entry shows its category', async ({ page }) => {
  const merits = entriesOf(page, 'merits');
  await expect(merits.locator('.bg-points')).toHaveText(['1 pt', '2 pts']);
  await expect(merits.locator('.bg-trait-kind')).toHaveText(['Physical', 'Mental']);
  await expect(entriesOf(page, 'flaws').locator('.bg-points')).toHaveText(['1 pt']);
});

Then('each haven shows its kind, name, description, location, access and security', async ({ page }) => {
  const havens = entriesOf(page, 'havens');
  await expect(havens).toHaveCount(2);
  await expect(havens.locator('.bg-haven-kind')).toHaveText(['Primary haven', 'Secondary haven']);
  await expect(havens.locator('.bg-haven-name')).toHaveText(['The Atelier', 'Saint-Agnès archive']);
  await expect(havens.locator('.bg-haven-description')).toHaveText(['A converted studio above a gallery.', 'A disused archive beneath a chapel.']);
  const first = havens.first();
  await expect(first.locator('[data-detail="location"]')).toHaveText('Rue Morgue');
  await expect(first.locator('[data-detail="access"]')).toHaveText('Key and password');
  await expect(first.locator('[data-detail="security"]')).toHaveText('Alarmed, two ghouls');
});

Then(/^"([^"]+)" shows its kind and note without dots$/, async ({ page }, name: string) => {
  const trait = entryNamed(page, 'otherTraits', name);
  await expect(trait.locator('.bg-other-kind')).toHaveText('Narrative');
  await expect(trait.locator('.bg-trait-note')).toHaveText('French · native');
  await expect(trait.locator('dot-rating')).toHaveCount(0);
});

Then('the note {string} is shown', async ({ page }, note: string) => {
  await expect(backgroundsPanel(page).getByText(note, { exact: true })).toBeVisible();
});

Then('the section index reads {string}', async ({ page }, text: string) => {
  const section = (
    { Merits: 'merits', Havens: 'havens', Flaws: 'flaws' } as Record<string, Section>
  )[text.split(' · ')[0]];
  await expect(indexItem(page, section)).toHaveText(text);
});

Then(
  'the section index reads {string}, {string}, {string}, {string} and {string}',
  async ({ page }, first: string, second: string, third: string, fourth: string, fifth: string) => {
    const sections: Section[] = ['backgrounds', 'havens', 'merits', 'flaws', 'otherTraits'];
    for (const [at, section] of sections.entries()) {
      await expect(indexItem(page, section)).toHaveText([first, second, third, fourth, fifth][at]);
    }
  },
);

Then('each section shows an empty-state message', async ({ page }) => {
  for (const section of ['backgrounds', 'havens', 'merits', 'flaws', 'otherTraits'] as const) {
    await expect(emptyState(page, section)).toBeVisible();
  }
});

// Editing

Then('it is the same after a reload', async ({ page }) => {
  const before = await headingCount(page, 'merits').textContent();
  await page.reload();
  await expectBackgroundsShown(page);
  await expect(headingCount(page, 'merits')).toHaveText(before!);
});

Then('the Flaws section shows its empty state', async ({ page }) => {
  await expect(emptyState(page, 'flaws')).toBeVisible();
  await expect(entriesOf(page, 'flaws')).toHaveCount(0);
});

Then('the flaw is back with its 1 point and focus is on it', async ({ page }) => {
  await expect(entriesOf(page, 'flaws')).toHaveCount(1);
  await expect(fieldNamed(page, 'Flaw 1 points')).toHaveValue('1');
  await expect(fieldNamed(page, 'Flaw 1 name')).toBeFocused();
});

Then('seven background rows are shown and it survives a reload', async ({ page }) => {
  await expect(entriesOf(page, 'backgrounds')).toHaveCount(7);
  await page.reload();
  await expectBackgroundsShown(page);
  await expect(entriesOf(page, 'backgrounds')).toHaveCount(7);
  await expect(entryNamed(page, 'backgrounds', 'Domain')).toBeVisible();
});

Then('the points show 0 and {string} is shown', async ({ page }, message: string) => {
  await expect(fieldNamed(page, 'Merit 1 points')).toHaveValue('0');
  await expect(backgroundsPanel(page).locator('#bg-hint-merits-0')).toHaveText(message);
  await expect.poll(() => announcements(page)).toContain(message);
});
