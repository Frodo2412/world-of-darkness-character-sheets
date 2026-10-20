// The Attributes screen: three ranked groups, each with its priority select, pool and rows. Everything the
// groups show is drawn by the shared ranked screen from `rankedView`; this module only names the allotment.

import '../../../styles/builder/ranked.css';
import { createRankedScreen } from '../parts/ranked';
import type { ScreenModule } from './index';

export default {
  id: 'attributes',
  ...createRankedScreen('attributes'),
} satisfies ScreenModule;
