import { describe, expect, it } from "vitest";
import {
  SITEMAP_PATHS,
  buildRobotsTxt,
  buildSitemapXml,
  resolveSiteOrigin,
  xmlEscape,
} from "@/lib/sitemap";

describe("xmlEscape", () => {
  it("escapes XML special characters", () => {
    expect(xmlEscape(`<a b="c">&'`)).toBe("&lt;a b=&quot;c&quot;&gt;&amp;&apos;");
  });

  it("leaves plain values untouched", () => {
    expect(xmlEscape("https://example.com/path")).toBe("https://example.com/path");
  });
});

describe("resolveSiteOrigin", () => {
  it("falls back to the serving request origin", () => {
    const request = new Request("https://scan-test.local/sitemap.xml");
    expect(resolveSiteOrigin(request)).toBe("https://scan-test.local");
  });

  it("throws when no site URL and no request", () => {
    expect(() => resolveSiteOrigin()).toThrow();
  });
});

describe("buildSitemapXml", () => {
  it("contains an absolute loc for every public path", () => {
    const xml = buildSitemapXml("https://example.test", "2026-10-31");
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    for (const path of SITEMAP_PATHS) {
      expect(xml).toContain(`<loc>https://example.test${path}</loc>`);
    }
    expect(xml).toContain("<lastmod>2026-10-31</lastmod>");
  });

  it("escapes potentially unsafe origins", () => {
    const xml = buildSitemapXml("https://evil.test?a=<b>&c");
    expect(xml).toContain("https://evil.test?a=&lt;b&gt;&amp;c");
    expect(xml).not.toContain("<b>");
  });
});

describe("buildRobotsTxt", () => {
  it("advertises an absolute sitemap URL", () => {
    const txt = buildRobotsTxt("https://example.test");
    expect(txt).toContain("Sitemap: https://example.test/sitemap.xml");
    expect(txt).toContain("Disallow: /studio/");
    expect(txt).toContain("Disallow: /scan/");
    expect(txt).toContain("User-agent: *");
  });
});
