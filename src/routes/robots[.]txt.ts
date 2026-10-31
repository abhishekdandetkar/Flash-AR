import { createFileRoute } from "@tanstack/react-router";
import { buildRobotsTxt, resolveSiteOrigin, TEXT_HEADERS } from "@/lib/sitemap";

/* Served dynamically so the Sitemap URL can be absolute (the sitemaps spec
 * requires it), without hard-coding the production domain. */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => {
        const origin = resolveSiteOrigin(request);
        return new Response(buildRobotsTxt(origin), { headers: TEXT_HEADERS });
      },
    },
  },
});
