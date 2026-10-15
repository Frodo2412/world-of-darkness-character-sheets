import type { TabDescriptor } from '../../scripts/tabs/descriptor';

const descriptor: TabDescriptor = {
  key: 'levelup',
  label: 'Level up',
  order: 50,
  // The live resources are for playing; this tab is about experience.
  showsResources: false,
  mount: () => import('./mount'),
};

export default descriptor;
