import type { TabDescriptor } from '../../scripts/tabs/descriptor';

const descriptor: TabDescriptor = {
  key: 'journal',
  label: 'Journal',
  order: 40,
  showsResources: true,
  mount: () => import('./mount'),
};

export default descriptor;
