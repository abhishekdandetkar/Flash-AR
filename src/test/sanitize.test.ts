import { describe, expect, it } from "vitest";
import {
  sanitizeCtaUrl,
  sanitizeAssetUrl,
  sanitizeNumber,
  sanitizeColor,
  sanitizeText,
} from "@/lib/sanitize";

describe("Sanitization & Security Utilities", () => {
  describe("sanitizeCtaUrl", () => {
    it("allows valid https and http URLs", () => {
      expect(sanitizeCtaUrl("https://spotify.com/album/123")).toBe("https://spotify.com/album/123");
      expect(sanitizeCtaUrl("http://example.com/music")).toBe("http://example.com/music");
    });

    it("rejects malicious javascript: URLs", () => {
      expect(sanitizeCtaUrl("javascript:alert(1)")).toBeNull();
      expect(sanitizeCtaUrl("  javascript:void(0) ")).toBeNull();
      expect(sanitizeCtaUrl("JAVASCRIPT:alert('xss')")).toBeNull();
    });

    it("rejects data: and vbscript: URLs for CTAs", () => {
      expect(sanitizeCtaUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
      expect(sanitizeCtaUrl("vbscript:msgbox(1)")).toBeNull();
    });

    it("handles empty or invalid values safely", () => {
      expect(sanitizeCtaUrl("")).toBeNull();
      expect(sanitizeCtaUrl(undefined)).toBeNull();
      expect(sanitizeCtaUrl("   ")).toBeNull();
    });
  });

  describe("sanitizeAssetUrl", () => {
    it("allows safe https, blob and data URLs", () => {
      expect(sanitizeAssetUrl("https://res.cloudinary.com/demo.mp4")).toBe(
        "https://res.cloudinary.com/demo.mp4",
      );
      expect(sanitizeAssetUrl("blob:http://localhost:3000/1234")).toBe(
        "blob:http://localhost:3000/1234",
      );
      expect(sanitizeAssetUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(
        "data:image/png;base64,iVBORw0KGgo=",
      );
      expect(sanitizeAssetUrl("synth:nightdrive")).toBe("synth:nightdrive");
    });

    it("allows safe root-relative endpoints", () => {
      expect(sanitizeAssetUrl("/api/public/assets/owner/campaign/cover.jpg")).toBe(
        "/api/public/assets/owner/campaign/cover.jpg",
      );
    });

    it("rejects protocol-relative and unsafe protocols", () => {
      expect(sanitizeAssetUrl("//evil.com/payload.js")).toBeNull();
      expect(sanitizeAssetUrl("javascript:alert(1)")).toBeNull();
    });
  });

  describe("sanitizeNumber", () => {
    it("preserves valid numbers within range", () => {
      expect(sanitizeNumber(1.5, 1, 0, 5)).toBe(1.5);
      expect(sanitizeNumber(-2, 0, -5, 5)).toBe(-2);
    });

    it("clamps out of bounds numbers", () => {
      expect(sanitizeNumber(10, 1, 0, 5)).toBe(5);
      expect(sanitizeNumber(-10, 1, 0, 5)).toBe(0);
    });

    it("falls back for non-finite or invalid inputs", () => {
      expect(sanitizeNumber(NaN, 1)).toBe(1);
      expect(sanitizeNumber(Infinity, 1)).toBe(1);
      expect(sanitizeNumber("123", 1)).toBe(1);
      expect(sanitizeNumber(null, 1)).toBe(1);
    });
  });

  describe("sanitizeColor", () => {
    it("accepts valid hex colors", () => {
      expect(sanitizeColor("#fff")).toBe("#fff");
      expect(sanitizeColor("#1ed760")).toBe("#1ed760");
      expect(sanitizeColor("#FF3D9A")).toBe("#FF3D9A");
    });

    it("accepts standard CSS color names", () => {
      expect(sanitizeColor("red")).toBe("red");
      expect(sanitizeColor("magenta")).toBe("magenta");
    });

    it("falls back when injection or broken color is provided", () => {
      expect(sanitizeColor("url('evil.css')", "#000")).toBe("#000");
      expect(sanitizeColor("<script>", "#fff")).toBe("#fff");
      expect(sanitizeColor(undefined, "#111")).toBe("#111");
    });
  });

  describe("sanitizeText", () => {
    it("strips control characters and trims", () => {
      expect(sanitizeText("  Listen Now!  ")).toBe("Listen Now!");
      expect(sanitizeText("Hello\x00World")).toBe("HelloWorld");
    });

    it("safely handles non-string inputs", () => {
      expect(sanitizeText(null, "fallback")).toBe("fallback");
      expect(sanitizeText(undefined, "fallback")).toBe("fallback");
    });
  });
});
