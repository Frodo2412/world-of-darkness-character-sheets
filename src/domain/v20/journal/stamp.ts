/** Where a new record's id and time come from, so the model stays pure and tests can fix both. */
export interface Stamp {
  newId(): string;
  now(): number;
}
