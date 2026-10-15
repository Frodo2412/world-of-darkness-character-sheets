import '../../components/controls/dot-rating';

/**
 * A rating drawn as read-only dots. The dots carry no meaning of their own: whoever draws them writes
 * the rating beside them as text, so they are hidden from assistive technology.
 */
export function readOnlyDots(name: string, value: number, max: number): HTMLElement {
  const dots = document.createElement('dot-rating');
  dots.className = 'dossier-dots';
  dots.setAttribute('aria-hidden', 'true');
  dots.setAttribute('name', name);
  dots.setAttribute('max', String(max));
  dots.setAttribute('value', String(value));
  dots.setAttribute('readonly', '');
  return dots;
}
