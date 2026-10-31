const configuredUrl = import.meta.env["VITE_SITE_URL"]?.trim();

export const siteUrl = configuredUrl?.replace(/\/+$/, "") ?? "";
export const siteName = "Flash AR";

export function absoluteUrl(path = "/"): string | undefined {
  if (!siteUrl) return undefined;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Canonical link entries for route heads (empty until the canonical origin
 * is configured via VITE_SITE_URL, e.g. in dev/preview). */
export function canonicalLinks(path = "/"): { rel: string; href: string }[] {
  const href = absoluteUrl(path);
  return href ? [{ rel: "canonical", href }] : [];
}
