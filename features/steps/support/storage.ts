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
    const found = keys.find((key) => key.endsWith(suffix));
    if (found === undefined) throw new Error(`no stored record has the id ${suffix.slice(1)}`);
    return found;
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

/** Makes every write to storage fail the way a full or blocked storage does. */
export async function refuseWrites(page: Page): Promise<void> {
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as unknown as { restoreStorage: () => void }).restoreStorage = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    };
  });
}

export async function acceptWrites(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as { restoreStorage: () => void }).restoreStorage());
}

/** From the next page load on, the browser withholds storage from the page entirely. */
export async function withholdStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
  });
}

/** The keys of every stored record whose key starts with `prefix`. */
export async function storedKeys(page: Page, prefix: string): Promise<string[]> {
  return page.evaluate(
    (start) =>
      Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index)!)
        .filter((key) => key.startsWith(start)),
    prefix,
  );
}

/** Every stored record, by key, exactly as stored. */
export async function storedRecords(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() =>
    Object.fromEntries(
      Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index)!).map(
        (key) => [key, window.localStorage.getItem(key)!],
      ),
    ),
  );
}

/** The records an earlier step remembered; a step that compares against them needs a Given that seeded storage. */
export function currentStored(memory: { stored?: Record<string, string> }): Record<string, string> {
  if (memory.stored === undefined) {
    throw new Error('no stored records remembered: a Given that seeds storage must come first');
  }
  return memory.stored;
}
