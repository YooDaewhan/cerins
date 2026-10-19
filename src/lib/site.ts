// The one host allowed in search results. NEXT_PUBLIC_SITE_URL overrides it
// (e.g. for staging); everything else — bare IP, cerins.net — gets noindex.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cerins.net";
export const CANONICAL_HOST = new URL(SITE_URL).host;

export function isCanonicalHost(host: string | null): boolean {
  return host === CANONICAL_HOST;
}
