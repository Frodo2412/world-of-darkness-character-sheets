// Whether a stored journal is usable as stored. A damaged journal is reported
// by the store, never repaired.

import { isFlag, isNumber, isText, listOf, objectOf, type Check } from '../shape';

const session = objectOf({ id: isText, title: isText, summary: isText, current: isFlag });

const note = objectOf({
  id: isText,
  sessionId: isText,
  title: isText,
  category: isText,
  tags: listOf(isText),
  pinned: isFlag,
  body: isText,
  createdAt: isNumber,
  editedAt: isNumber,
});

const award = objectOf({ id: isText, sessionId: isText, amount: isNumber, note: isText });

const spending = objectOf({
  id: isText,
  sessionId: isText,
  label: isText,
  kind: isText,
  from: isNumber,
  to: isNumber,
  cost: isNumber,
});

const itemEntry = objectOf({ item: isText, detail: isText });

const description = objectOf({
  apparentAge: isText,
  dateOfBirth: isText,
  rip: isText,
  hair: isText,
  eyes: isText,
  nationality: isText,
  heightWeight: isText,
  sex: isText,
});

export const validJournal: Check = objectOf({
  sessions: listOf(session),
  notes: listOf(note),
  xp: objectOf({ awards: listOf(award), spendings: listOf(spending) }),
  record: objectOf({
    gear: listOf(itemEntry),
    equipment: listOf(itemEntry),
    bloodBonds: listOf(objectOf({ name: isText, relation: isText, rating: isNumber, type: isText })),
    derangements: listOf(objectOf({ name: isText, status: isText, note: isText })),
    goals: listOf(objectOf({ text: isText, kind: isText })),
    description,
  }),
});
