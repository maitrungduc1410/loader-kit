/** The `q` search parameter of the page URL, which prefills the gallery filters; browser only. */
export function queryFromUrl(): string | null {
  if (typeof location === 'undefined') return null;
  return new URLSearchParams(location.search).get('q');
}
