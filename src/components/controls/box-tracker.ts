import { RatingControl } from './rating-control';

/** A pool that is spent and regained, drawn as square boxes in rows of ten. */
export class BoxTracker extends RatingControl {}

customElements.define('box-tracker', BoxTracker);
