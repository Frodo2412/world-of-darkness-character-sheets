// Wording shared by the messages the creation rules write.

/** "1 dot", "3 dots": a count with its noun in the right number. */
export const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;

/** What a value the player has not chosen yet reads. */
export const NOT_CHOSEN = 'Not chosen';
