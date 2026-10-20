// The Advantages screen: the Discipline rows (the clan's own, then any written in).

import type { Page } from '@playwright/test';
import { openStep } from './builder';
import { groupBox } from './ranked';

/** The names of the Disciplines shown, in order. */
export async function disciplineNames(page: Page): Promise<string[]> {
  const group = await groupBox(page, 'Disciplines');
  return group.getByRole('slider').evaluateAll((sliders) =>
    sliders.map((slider) => document.getElementById(slider.getAttribute('aria-labelledby')!)!.textContent ?? ''),
  );
}

/** Writes a Discipline in by name on the Advantages screen. */
export async function addDiscipline(page: Page, name: string): Promise<void> {
  await openStep(page, 'Advantages');
  const group = await groupBox(page, 'Disciplines');
  await group.getByLabel('Discipline to add', { exact: true }).fill(name);
  await group.getByRole('button', { name: 'Add Discipline' }).click();
}
