import type { TabDescriptor } from '../../scripts/tabs/descriptor';

/** The Backgrounds tab: the character's Backgrounds, Havens, Merits, Flaws and other traits. */
const descriptor: TabDescriptor = {
  key: 'backgrounds',
  label: 'Backgrounds',
  order: 20,
  showsResources: true,
  mount: () => import('./mount'),
};

export default descriptor;
