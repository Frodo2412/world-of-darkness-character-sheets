import type { TabDescriptor } from '../../scripts/tabs/descriptor';

/** The Disciplines tab: the character's Disciplines and the powers their ratings unlock. */
const descriptor: TabDescriptor = {
  key: 'disciplines',
  label: 'Disciplines',
  order: 10,
  showsResources: true,
  mount: () => import('./mount'),
};

export default descriptor;
