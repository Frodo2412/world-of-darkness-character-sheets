import type { MountedTab, TabContext } from '../../../scripts/tabs/context';

/** The section's part of the Journal tab: `root` is its own element, and it only ever queries inside it. */
export function mount(_ctx: TabContext, _root: HTMLElement): MountedTab {
  return {
    render() {},
  };
}
