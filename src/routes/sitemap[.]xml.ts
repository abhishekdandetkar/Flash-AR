import { createFileRoute } from "@tanstack/react-router";
import { buildSitemapXml, resolveSiteOrigin, XML_HEADERS } from "@/lib/sitemap";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => {
        const origin = resolveSiteOrigin(request);
        return new Response(buildSitemapXml(origin), { headers: XML_HEADERS });
      },
    },
  },
});
