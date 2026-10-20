import type { ConceptField } from '../../../domain/v20/creation/build';
import { sampleConceptLine } from '../../../domain/v20/creation/sampleConcepts';
import { setConceptKind, setConceptText, setDrive } from '../../../domain/v20/creation/updates';
import '../../../styles/builder/concept.css';
import type { Update } from '../wiring';
import type { ScreenModule } from './index';

/** A free-text entry of the build: a header field, or "What keeps you going?". */
type TextField = ConceptField | 'drive';

const setting =
  (field: TextField, text: string): Update =>
  (build) =>
    field === 'drive' ? setDrive(build, text) : setConceptText(build, field, text);

export default {
  id: 'concept',
  wire(root, { commit }) {
    // Free text is kept as it is typed, as on the sheet. Every `[data-concept]` field is handled here,
    // those of the Nature & Demeanor screen too: they are the same entries of the build.
    for (const input of root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-concept]')) {
      input.addEventListener('input', () => commit(setting(input.dataset.concept as TextField, input.value), input));
    }
    // A sample concept is a prompt: choosing it again lets it go, and it never touches the player's own words.
    for (const chip of root.querySelectorAll<HTMLButtonElement>('[data-sample-concept]')) {
      chip.addEventListener('click', () => {
        const kind = chip.dataset.sampleConcept!;
        commit((build) => setConceptKind(build, build.concept.conceptKind === kind ? '' : kind), chip);
      });
    }
  },
  render(build, root) {
    // Leave a matching input alone so typing does not move the caret.
    for (const input of root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-concept]')) {
      const text = build.concept[input.dataset.concept as TextField];
      if (input.value !== text) input.value = text;
    }
    const chosen = build.concept.conceptKind;
    for (const chip of root.querySelectorAll<HTMLButtonElement>('[data-sample-concept]')) {
      const pressed = chip.dataset.sampleConcept === chosen;
      chip.setAttribute('aria-pressed', String(pressed));
      chip.querySelector<HTMLElement>('[data-sample-state]')!.hidden = !pressed;
    }
    // A status region, so the line is announced as it arrives; CSS hides it while it is empty.
    root.querySelector<HTMLElement>('[data-sample-line]')!.textContent = sampleConceptLine(chosen) ?? '';
  },
} satisfies ScreenModule;
