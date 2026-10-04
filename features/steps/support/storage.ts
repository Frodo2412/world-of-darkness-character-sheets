import type { Page } from '@playwright/test';

export interface StoredRecord {
  key: string;
  text: string;
}

/** The storage key holding the record for `id`. */
async function keyFor(page: Page, id: string): Promise<string> {
  return page.evaluate((suffix) => {
    const keys = Array.from({ length: window.localStorage.length }, (_, index) =>
      window.localStorage.key(index)!,
    );
    return keys.find((key) => key.endsWith(suffix))!;
  }, `:${id}`);
}

/** Replaces a saved character's record with `text`, as damage or a foreign writer would. */
export async function overwriteRecord(page: Page, id: string, text: string): Promise<StoredRecord> {
  const key = await keyFor(page, id);
  await page.evaluate(([k, value]) => window.localStorage.setItem(k, value), [key, text]);
  return { key, text };
}

export async function storedText(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => window.localStorage.getItem(k), key);
}
