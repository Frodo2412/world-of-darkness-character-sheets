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

/**
 * Starts counting how often the element at `selector` is given text after having been empty, which
 * is what makes a live region speak: the same text written over itself is not spoken again. Install it
 * before the action under test.
 */
export async function watchWrites(page: Page, selector: string): Promise<void> {
  await page.evaluate((target) => {
    const region = document.querySelector(target)!;
    const writes = { count: 0, empty: (region.textContent ?? '').trim() === '' };
    (window as unknown as { regionWrites: typeof writes }).regionWrites = writes;
    new MutationObserver(() => {
      const empty = (region.textContent ?? '').trim() === '';
      if (!empty && writes.empty) writes.count += 1;
      writes.empty = empty;
    }).observe(region, { childList: true, characterData: true, subtree: true });
  }, selector);
}

/** How many times the region watched by `watchWrites` was written to after being empty. */
export async function writeCount(page: Page): Promise<number> {
  const writes = await page.evaluate(
    () => (window as unknown as { regionWrites?: { count: number } }).regionWrites,
  );
  if (writes === undefined) {
    throw new Error('writeCount() was read on a page whose region is not being watched: call watchWrites(page, selector) first');
  }
  return writes.count;
}
