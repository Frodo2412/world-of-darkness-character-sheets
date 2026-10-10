import { displayName, type V20Character } from '../../domain/v20/character';
import { SHEET_KEY, type TabKey } from './descriptor';

const TAB_PARAM = 'tab';

/** The tab an address asks for; the Character sheet when it names none, or one that is not there. */
export function tabFromUrl(url: URL, keys: readonly TabKey[]): TabKey {
  const asked = url.searchParams.get(TAB_PARAM);
  return asked !== null && keys.includes(asked) ? asked : SHEET_KEY;
}

/**
 * The address of the same character on `key`'s tab: the page and `id` as they are, `tab` set (or
 * dropped for the Character sheet). The `#edit` marker is never carried, so a link opens in play mode.
 */
export function hrefFor(url: URL, key: TabKey): string {
  const params = new URLSearchParams(url.search);
  if (key === SHEET_KEY) params.delete(TAB_PARAM);
  else params.set(TAB_PARAM, key);
  const query = params.toString();
  return query === '' ? url.pathname : `${url.pathname}?${query}`;
}

/** The page title on a tab: "Combat · Ada Lovelace". */
export function titleFor(tab: string, character: V20Character): string {
  return `${tab} · ${displayName(character)}`;
}
