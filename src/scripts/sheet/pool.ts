import type { PoolSelection } from '../../domain/v20/resources';

/** A row that can join the pool: an attribute, or an ability fixed or custom. */
export type PoolRow = NonNullable<PoolSelection['attribute'] | PoolSelection['ability']>;

export interface Pool {
  /** What is selected now; a copy. */
  selection(): PoolSelection;
  /** Selects the row, replacing the selected one of its kind, or deselects it when it is the selected one. */
  toggle(row: PoolRow): void;
  clear(): void;
}

const isAttribute = (row: PoolRow): row is NonNullable<PoolSelection['attribute']> => row.startsWith('attributes.');

/** The selection behind the Selected pool card: at most one attribute and one ability. Never stored. */
export function createPool(): Pool {
  let selected: PoolSelection = {};

  return {
    selection: () => ({ ...selected }),
    toggle(row) {
      const kind = isAttribute(row) ? 'attribute' : 'ability';
      const { [kind]: current, ...rest } = selected;
      selected = current === row ? rest : { ...rest, [kind]: row };
    },
    clear() {
      selected = {};
    },
  };
}
