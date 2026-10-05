/** The text with every character a regular expression treats as special made literal. */
export const escaped = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
