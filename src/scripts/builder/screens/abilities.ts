// The Abilities screen: Talents, Skills and Knowledges, ranked 13 / 9 / 5 and capped at 3 before freebie points.
// Everything the groups show is drawn by the shared ranked screen from `rankedView`; this module only names the
// allotment.

import '../../../styles/builder/ranked.css';
import { createRankedScreen } from '../parts/ranked';
import type { ScreenModule } from './index';

export default {
  id: 'abilities',
  ...createRankedScreen('abilities'),
} satisfies ScreenModule;
