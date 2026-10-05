// What every store shares: the storage it writes to, id generation, record
// shape checks and the scan for the records under one key prefix. Stores
// depend on this module, never on one another.

/** The part of the Web Storage API the stores need; `localStorage` satisfies it. */
export interface StoragePort {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Whether `value` has every field of `template`, each of the same kind, all the way down. */
export function hasShapeOf(value: unknown, template: unknown): boolean {
  if (Array.isArray(template)) {
    return (
      Array.isArray(value) &&
      value.length === template.length &&
      value.every((item) => hasShapeOf(item, template[0]))
    );
  }
  if (typeof template === 'object' && template !== null) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const fields = value as Record<string, unknown>;
    return Object.entries(template).every(([key, expected]) => hasShapeOf(fields[key], expected));
  }
  if (typeof template === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === typeof template;
}

/** The ids stored under `prefix`, oldest first. */
export function storedIds(storage: StoragePort, prefix: string): string[] {
  const ids: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) ids.push(key.slice(prefix.length));
  }
  // Generated ids sort in creation order, so sorting them gives oldest first
  // whatever order the browser enumerates keys in.
  return ids.sort();
}

const TIMESTAMP_WIDTH = 9;

function randomHex(bytes: number): string {
  // getRandomValues, unlike randomUUID, also exists on plain-HTTP origins.
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
}

/**
 * A unique id that sorts after `latestId`, the newest id already in use.
 * It is the creation time unless the clock has not moved past `latestId`
 * (two creates in one millisecond, or a clock set backwards).
 */
export function generateId(latestId?: string): string {
  const latest = latestId === undefined ? NaN : parseInt(latestId.slice(0, TIMESTAMP_WIDTH), 36);
  const createdAt = Number.isNaN(latest) ? Date.now() : Math.max(Date.now(), latest + 1);
  return `${createdAt.toString(36).padStart(TIMESTAMP_WIDTH, '0')}-${randomHex(4)}`;
}

/** The browser's storage, or undefined where the browser withholds it from the page. */
export function browserStorage(): StoragePort | undefined {
  try {
    const storage = globalThis.localStorage;
    // Some browsers hand over the object and only refuse when it is used.
    void storage.length;
    return storage;
  } catch {
    return undefined;
  }
}
