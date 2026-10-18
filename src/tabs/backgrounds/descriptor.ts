import type { TabDescriptor } from '../../scripts/tabs/descriptor';

const descriptor: TabDescriptor = {
  key: 'backgrounds',
  label: 'Backgrounds',
  order: 20,
  showsResources: true,
  mount: () => import('./mount'),
};

export default descriptor;
