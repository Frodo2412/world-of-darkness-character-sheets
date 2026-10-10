import type { TabDescriptor } from '../../scripts/tabs/descriptor';

/** The Combat tab: the V20 manoeuvres and weapons with the character's pools, and the Weapon roll panel. */
const descriptor: TabDescriptor = {
  key: 'combat',
  label: 'Combat',
  order: 30,
  showsResources: true,
  mount: () => import('./mount'),
};

export default descriptor;
