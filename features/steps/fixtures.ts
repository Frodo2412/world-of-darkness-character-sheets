import { test as base, createBdd } from 'playwright-bdd';

// Every step file imports Given/When/Then from here so scenarios share one
// set of fixtures.
export const test = base;
export const { Given, When, Then } = createBdd(test);
