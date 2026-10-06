import type { Page } from '@playwright/test';

/**
 * Records what each live region says every time it changes, as assistive
 * technology would hear it: one entry per region per change.
 */
export async function watchAnnouncements(page: Page): Promise<void> {
  await page.evaluate(() => {
    const log: string[] = [];
    (window as unknown as { announcements: string[] }).announcements = log;
    const regions = document.querySelectorAll('[role="status"], [role="alert"], output');
    const observer = new MutationObserver((records) => {
      const changed = new Set<Element>();
      for (const record of records) {
        const target = record.target instanceof Element ? record.target : record.target.parentElement;
        const region = target?.closest('[role="status"], [role="alert"], output');
        if (region) changed.add(region);
      }
      for (const region of changed) {
        const text = (region.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text !== '') log.push(text);
      }
    });
    for (const region of regions) observer.observe(region, { childList: true, characterData: true, subtree: true });
  });
}

/**
 * Everything announced since the page was watched. A page that was never watched (or was
 * navigated since) would report nothing whatever happened, so asking for it is an error.
 */
export async function announcements(page: Page): Promise<string[]> {
  const log = await page.evaluate(() => (window as unknown as { announcements?: string[] }).announcements);
  if (log === undefined) {
    throw new Error('announcements() was read on a page that is not being watched: call watchAnnouncements(page) after opening it');
  }
  return log;
}
