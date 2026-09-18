// The one host allowed in search results, e.g. "www.cerins.net".
// null until NEXT_PUBLIC_SITE_URL is set — which means no host is indexable.
export const CANONICAL_HOST = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host
  : null;

export function isCanonicalHost(host: string | null): boolean {
  return CANONICAL_HOST != null && host === CANONICAL_HOST;
}
