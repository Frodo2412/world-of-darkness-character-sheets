import { expect, type Locator, type Page } from '@playwright/test';
import { announcements } from './announcements';

/** Presses an unavailable (aria-disabled) control as a player would, with the pointer at its centre. */
export async function pressUnavailable(page: Page, control: Locator): Promise<void> {
  await control.scrollIntoViewIfNeeded();
  const box = (await control.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  // The click must reach the button itself, not something lying over it.
  const reached = await control.evaluate(
    (element, point) => element.contains(document.elementFromPoint(point.x, point.y)),
    { x, y },
  );
  expect(reached).toBe(true);

  const before = await announcements(page);
  await page.mouse.click(x, y);
  // Let any announcement the press would make arrive (two frames), then see that none did.
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  expect(await announcements(page)).toEqual(before);
}
