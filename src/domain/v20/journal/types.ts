// The stored shapes behind the Journal tab: sessions, notes, the experience
// ledger and the character record. All additive and blank by default.

export interface Session {
  id: string;
  title: string;
  summary: string;
  /** Exactly one session is current once any exist. */
  current: boolean;
}

export interface Note {
  id: string;
  sessionId: string;
  title: string;
  category: string;
  tags: string[];
  pinned: boolean;
  /** A small Markdown subset, rendered without raw HTML. */
  body: string;
  createdAt: number;
  editedAt: number;
}

export interface Award {
  id: string;
  sessionId: string;
  /** Whole experience points; negative is a correction. */
  amount: number;
  note: string;
}

export interface Spending {
  id: string;
  sessionId: string;
  label: string;
  kind: string;
  from: number;
  to: number;
  cost: number;
}

export interface ItemEntry {
  item: string;
  detail: string;
}

export interface BloodBond {
  name: string;
  relation: string;
  rating: number;
  type: string;
}

export interface Derangement {
  name: string;
  status: string;
  note: string;
}

export interface Goal {
  text: string;
  kind: string;
}

export interface Description {
  apparentAge: string;
  dateOfBirth: string;
  rip: string;
  hair: string;
  eyes: string;
  nationality: string;
  heightWeight: string;
  sex: string;
}

export interface CharacterRecord {
  gear: ItemEntry[];
  equipment: ItemEntry[];
  bloodBonds: BloodBond[];
  derangements: Derangement[];
  goals: Goal[];
  description: Description;
}

export interface Journal {
  sessions: Session[];
  notes: Note[];
  xp: { awards: Award[]; spendings: Spending[] };
  record: CharacterRecord;
}

export function blankJournal(): Journal {
  return {
    sessions: [],
    notes: [],
    xp: { awards: [], spendings: [] },
    record: {
      gear: [],
      equipment: [],
      bloodBonds: [],
      derangements: [],
      goals: [],
      description: {
        apparentAge: '',
        dateOfBirth: '',
        rip: '',
        hair: '',
        eyes: '',
        nationality: '',
        heightWeight: '',
        sex: '',
      },
    },
  };
}
