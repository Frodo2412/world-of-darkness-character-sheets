import type { TabDescriptor } from '../../scripts/tabs/descriptor';

const descriptor: TabDescriptor = {
  key: 'combat',
  label: 'Combat',
  order: 30,
  showsResources: true,
  mount: () => import('./mount'),
};

export default descriptor;
