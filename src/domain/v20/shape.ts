// Small checks for the shape of stored data, composed by the validators that
// sit next to each family of types. A check says whether a value is usable as
// stored; it never repairs.

export type Check = (value: unknown) => boolean;

export const isText: Check = (value) => typeof value === 'string';
export const isNumber: Check = (value) => typeof value === 'number' && Number.isFinite(value);
export const isFlag: Check = (value) => typeof value === 'boolean';

/** A value that may be absent but, when present, passes `check`. */
export const optional =
  (check: Check): Check =>
  (value) =>
    value === undefined || check(value);

export const oneOf =
  (options: readonly string[]): Check =>
  (value) =>
    typeof value === 'string' && options.includes(value);

export const listOf =
  (check: Check): Check =>
  (value) =>
    Array.isArray(value) && value.every(check);

/** An object with every listed field passing its check; other fields are left alone. */
export const objectOf =
  (fields: Record<string, Check>): Check =>
  (value) =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.entries(fields).every(([key, check]) => check((value as Record<string, unknown>)[key]));
