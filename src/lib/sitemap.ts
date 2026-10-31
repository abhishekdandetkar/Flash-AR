import { siteUrl } from "@/lib/site";

/** Public, indexable routes. Auth-gated and per-campaign routes are excluded
 * (they are already disallowed in robots.txt). */
export const SITEMAP_PATHS = [
  "/",
  "/contact",
  "/privacy-policy",
  "/terms",
  "/refund-policy",
] as const;

/** The canonical site origin, falling back to the serving request origin so
 * the sitemap (and robots.txt) is always valid, even in preview/dev where
 * VITE_SITE_URL is not configured. */
export function resolveSiteOrigin(request?: Request): string {
  if (siteUrl) return siteUrl;
  const origin = request ? new URL(request.url).origin : "";
  if (!origin) throw new Error("No site origin configured and no request available.");
  return origin;
}

export function xmlEscape(value: string): string {
  return value.replace(
    /[<>&'"]/g,
    (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char]!,
  );
}

function isoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD, W3C Datetime subset for sitemaps
}

export function buildSitemapXml(origin: string, lastmod: string = isoDate()): string {
  const urls = SITEMAP_PATHS.map(
    (path) =>
      `  <url><loc>${xmlEscape(`${origin}${path}`)}</loc><lastmod>${lastmod}</lastmod></url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

const NON_INDEXABLE = [
  "/dashboard",
  "/studio/",
  "/scan/",
  "/print/",
  "/auth",
  "/forgot-password",
  "/reset-password",
] as const;

export function buildRobotsTxt(origin: string): string {
  const lines = ["User-agent: *", "Allow: /"];
  for (const path of NON_INDEXABLE) lines.push(`Disallow: ${path}`);
  lines.push("", `Sitemap: ${origin}/sitemap.xml`);
  return `${lines.join("\n")}\n`;
}

export const XML_HEADERS: Record<string, string> = {
  "content-type": "application/xml; charset=utf-8",
  "cache-control": "public, max-age=3600",
};

export const TEXT_HEADERS: Record<string, string> = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "public, max-age=3600",
};
