import type { TabDescriptor } from '../../scripts/tabs/descriptor';

const descriptor: TabDescriptor = {
  key: 'disciplines',
  label: 'Disciplines',
  order: 10,
  showsResources: true,
  mount: () => import('./mount'),
};

export default descriptor;
