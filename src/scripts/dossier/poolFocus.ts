/**
 * Moves keyboard focus to the Selected pool card's heading on the Character sheet, when the card is
 * shown (it is drawn in play mode only). Nothing when it is not, so focus stays where the tab put it.
 */
export function focusSelectedPool(): void {
  const heading = document.getElementById('pool-heading');
  if (heading === null || !heading.checkVisibility()) return;
  heading.tabIndex = -1;
  heading.focus();
}
