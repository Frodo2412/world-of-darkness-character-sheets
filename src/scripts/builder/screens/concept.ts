import type { ConceptField } from '../../../domain/v20/creation/build';
import { conceptReport } from '../../../domain/v20/creation/progress';
import { setConceptText } from '../../../domain/v20/creation/updates';
import type { ScreenModule } from './index';

export default {
  id: 'concept',
  wire(root, { commit }) {
    // Free text is kept as it is typed, as on the sheet. Every `[data-concept]` field is handled here,
    // those of the Nature & Demeanor screen too: they are the same header fields of the build.
    for (const input of root.querySelectorAll<HTMLInputElement>('[data-concept]')) {
      input.addEventListener('input', () => {
        const field = input.dataset.concept as ConceptField;
        commit((build) => setConceptText(build, field, input.value), input);
      });
    }
  },
  render(build, root) {
    const { fields } = conceptReport(build);
    // Leave a matching input alone so typing does not move the caret.
    for (const input of root.querySelectorAll<HTMLInputElement>('[data-concept]')) {
      const text = fields[input.dataset.concept as ConceptField];
      if (input.value !== text) input.value = text;
    }
  },
} satisfies ScreenModule;
