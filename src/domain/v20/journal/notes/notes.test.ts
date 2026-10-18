import { describe, expect, test } from 'vitest';
import { startSession } from '../sessions';
import { counterStamp } from '../testing/stamp';
import { blankJournal, type Journal } from '../types';
import {
  addMention,
  addNote,
  addTag,
  categoryOf,
  editNote,
  excerptOf,
  mentionedNames,
  mentionsOf,
  noteSearchFields,
  noteTitle,
  removeMention,
  removeTag,
  togglePin,
  uniqueTags,
  UNTITLED,
} from './notes';

const started = (stamp = counterStamp()): { journal: Journal; stamp: ReturnType<typeof counterStamp> } => ({
  journal: startSession(blankJournal(), 'Session 12', stamp),
  stamp,
});

function withNote(fields: Parameters<typeof addNote>[1] = {}): { journal: Journal; id: string; stamp: ReturnType<typeof counterStamp> } {
  const { journal, stamp } = started();
  const added = addNote(journal, fields, stamp);
  if (!added.ok) throw new Error(added.reason);
  return { journal: added.journal, id: added.id, stamp };
}

describe('addNote', () => {
  test('writes a note in the current session, unpinned, stamped with the time', () => {
    const { journal, stamp } = started();

    const added = addNote(journal, { title: 'The portrait', category: 'Clues', tags: ['portrait'], body: 'Text' }, stamp);

    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.journal.notes).toEqual([
      {
        id: added.id,
        sessionId: journal.sessions[0].id,
        title: 'The portrait',
        category: 'Clues',
        tags: ['portrait'],
        pinned: false,
        body: 'Text',
        createdAt: added.journal.notes[0].editedAt,
        editedAt: added.journal.notes[0].createdAt,
      },
    ]);
  });

  test('fails without a current session and writes nothing', () => {
    expect(addNote(blankJournal(), { title: 'x' }, counterStamp())).toEqual({ ok: false, reason: 'no-session' });
  });

  test('refuses a category that is not one of the five', () => {
    const { journal, stamp } = started();

    expect(addNote(journal, { category: 'Secrets' }, stamp)).toEqual({ ok: false, reason: 'unknown-category' });
  });

  test('a note with nothing given is Unsorted and untitled', () => {
    const { journal, stamp } = started();
    const added = addNote(journal, {}, stamp);

    if (!added.ok) throw new Error('not added');
    expect(added.journal.notes[0]).toMatchObject({ title: '', category: 'Unsorted', tags: [], body: '' });
    expect(noteTitle(added.journal.notes[0])).toBe(UNTITLED);
  });

  test('keeps a duplicate tag once', () => {
    const { journal, stamp } = started();
    const added = addNote(journal, { tags: ['portrait', 'Portrait', ' portrait '] }, stamp);

    if (!added.ok) throw new Error('not added');
    expect(added.journal.notes[0].tags).toEqual(['portrait']);
  });

  test('does not change the journal it was given', () => {
    const { journal, stamp } = started();
    addNote(journal, { title: 'x' }, stamp);

    expect(journal.notes).toEqual([]);
  });

  test('a later note is in the session that is current then, and the earlier one stays where it was', () => {
    const { journal, stamp } = started();
    const first = addNote(journal, { title: 'one' }, stamp);
    if (!first.ok) throw new Error('not added');
    const next = startSession(first.journal, 'Session 13', stamp);
    const second = addNote(next, { title: 'two' }, stamp);
    if (!second.ok) throw new Error('not added');

    expect(second.journal.notes.map((note) => note.sessionId)).toEqual([journal.sessions[0].id, next.sessions[1].id]);
  });
});

describe('editNote', () => {
  test('changes the fields given and stamps the edit', () => {
    const { journal, id, stamp } = withNote({ title: 'Old' });

    const edited = editNote(journal, id, { title: 'New', body: 'Text', category: 'Places' }, stamp);

    expect(edited.notes[0]).toMatchObject({ title: 'New', body: 'Text', category: 'Places' });
    expect(edited.notes[0].editedAt).toBeGreaterThan(journal.notes[0].editedAt);
    expect(edited.notes[0].createdAt).toBe(journal.notes[0].createdAt);
  });

  test('a change to nothing is not an edit', () => {
    const { journal, id, stamp } = withNote({ title: 'Same' });

    expect(editNote(journal, id, { title: 'Same' }, stamp)).toBe(journal);
  });

  test('leaves the category alone when it is not one of the five', () => {
    const { journal, id, stamp } = withNote({ category: 'Clues' });

    expect(editNote(journal, id, { category: 'Secrets' }, stamp)).toBe(journal);
  });

  test('a note that is not there changes nothing', () => {
    const { journal, stamp } = withNote();

    expect(editNote(journal, 'missing', { title: 'x' }, stamp)).toBe(journal);
  });

  test('keeps the body exactly, including its line endings and spaces', () => {
    const { journal, id, stamp } = withNote();

    expect(editNote(journal, id, { body: '  a\r\n\r\n b  ' }, stamp).notes[0].body).toBe('  a\r\n\r\n b  ');
  });
});

describe('togglePin', () => {
  test('pins and unpins without touching the edit time', () => {
    const { journal, id } = withNote();

    const pinned = togglePin(journal, id);
    expect(pinned.notes[0].pinned).toBe(true);
    expect(pinned.notes[0].editedAt).toBe(journal.notes[0].editedAt);
    expect(togglePin(pinned, id).notes[0].pinned).toBe(false);
  });

  test('a note that is not there changes nothing', () => {
    const { journal } = withNote();

    expect(togglePin(journal, 'missing')).toBe(journal);
  });
});

describe('tags', () => {
  test('adds a tag, and says nothing for a blank or repeated one', () => {
    const { journal, id, stamp } = withNote({ tags: ['portrait'] });

    expect(addTag(journal, id, 'Elysium', stamp).notes[0].tags).toEqual(['portrait', 'Elysium']);
    expect(addTag(journal, id, '   ', stamp)).toBe(journal);
    expect(addTag(journal, id, 'PORTRAIT', stamp)).toBe(journal);
  });

  test('drops a leading # and collapses spaces', () => {
    const { journal, id, stamp } = withNote();

    expect(addTag(journal, id, '#  follow   up', stamp).notes[0].tags).toEqual(['follow up']);
  });

  test('removes a tag whatever its case', () => {
    const { journal, id, stamp } = withNote({ tags: ['portrait', 'museum'] });

    expect(removeTag(journal, id, 'PORTRAIT', stamp).notes[0].tags).toEqual(['museum']);
    expect(removeTag(journal, id, 'absent', stamp)).toBe(journal);
  });

  test('uniqueTags keeps the first spelling and the order', () => {
    expect(uniqueTags(['b', 'A', 'a', '', 'B'])).toEqual(['b', 'A']);
  });
});

describe('mentionedNames', () => {
  test.each([
    ['@Camille Arnaud met Lucien', ['Camille Arnaud']],
    ['@[Dr. Laurent] called', ['Dr. Laurent']],
    ['no mention here', []],
    ['@Lucien, then @Mara.', ['Lucien', 'Mara']],
    ['@Camille and @camille', ['Camille']],
    ['@lowercase is not a name', []],
    ['mail me at a@b.example', []],
    ['mail bob@Example.com', []],
    ['(@Lucien) and "@Mara"', ['Lucien', 'Mara']],
    ['@[]', []],
    ['@Éloïse Voss', ['Éloïse Voss']],
    ["@D'Arcy Smith-Jones", ["D'Arcy Smith-Jones"]],
    ['@Camille Arnaud @Lucien Delacroix', ['Camille Arnaud', 'Lucien Delacroix']],
    ['@Camille\nArnaud', ['Camille']],
  ])('%j gives %j', (body, names) => {
    expect(mentionedNames(body)).toEqual(names);
  });
});

describe('mentions added by hand', () => {
  test('are listed after the names in the body, once, and say which is which', () => {
    const { journal, id, stamp } = withNote({ body: '@Camille Arnaud met Lucien' });

    const added = addMention(addMention(journal, id, 'Mara Klein', stamp), id, 'camille arnaud', stamp);

    expect(mentionsOf(added.notes[0])).toEqual([
      { name: 'Camille Arnaud', manual: false },
      { name: 'Mara Klein', manual: true },
    ]);
  });

  test('a blank name or a repeated one adds nothing', () => {
    const { journal, id, stamp } = withNote();
    const once = addMention(journal, id, 'Mara', stamp);

    expect(addMention(once, id, '  ', stamp)).toBe(once);
    expect(addMention(once, id, 'MARA', stamp)).toBe(once);
  });

  test('are removed by hand, and a name the body gives is not removed that way', () => {
    const { journal, id, stamp } = withNote({ body: '@Camille Arnaud' });
    const added = addMention(journal, id, 'Mara', stamp);

    expect(mentionsOf(removeMention(added, id, 'Mara', stamp).notes[0]).map((mention) => mention.name)).toEqual(['Camille Arnaud']);
    expect(removeMention(added, id, 'Camille Arnaud', stamp)).toBe(added);
  });

  test('a note without any is read as having none', () => {
    expect(mentionsOf({ body: '', mentions: undefined })).toEqual([]);
  });
});

describe('search fields and excerpts', () => {
  test('search looks in title, body, tags and mentioned names', () => {
    const { journal, id, stamp } = withNote({ title: 'Alpha', body: 'Beta text', tags: ['gamma'] });
    const note = addMention(journal, id, 'Delta', stamp).notes[0];

    expect(noteSearchFields(note)).toEqual(['Alpha', 'Beta text', 'gamma', 'Delta']);
  });

  test('an excerpt is plain text without list or quote markers', () => {
    expect(excerptOf('- [ ] one\n- two\n1. three\n> four')).toBe('one two three four');
  });

  test('an excerpt is cut at the limit with an ellipsis', () => {
    expect(excerptOf('word '.repeat(100), 20)).toBe('word word word word…');
    expect(excerptOf('short')).toBe('short');
  });

  test('a note whose category is not one of the five is read as Unsorted', () => {
    expect(categoryOf({ category: 'Secrets' })).toBe('Unsorted');
    expect(categoryOf({ category: 'Clues' })).toBe('Clues');
  });
});
