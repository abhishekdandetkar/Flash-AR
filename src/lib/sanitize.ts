/**
 * Sanitization, validation, and safe URL helpers for WebAR layers and assets.
 */

const SAFE_PROTOCOLS = new Set(["https:", "http:", "blob:", "data:"]);

/**
 * Validate and sanitize an external URL (e.g. for CTAs).
 * Strictly forbids javascript:, data:, vbscript:, and relative malicious vectors.
 * Only permits valid HTTPS (and HTTP if permitted).
 */
export function sanitizeCtaUrl(rawUrl?: string): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed, window.location.href);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate an asset media URL (images, video, audio).
 * Permits https:, http:, blob:, data:, and safe root-relative paths like /api/public/assets/...
 */
export function sanitizeAssetUrl(rawUrl?: string): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("synth:")) return trimmed;

  // Root-relative paths
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//")) return null; // Avoid protocol-relative tricks
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (SAFE_PROTOCOLS.has(parsed.protocol)) {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clamps and safely normalizes a numeric value with defaults.
 */
export function sanitizeNumber(val: unknown, fallback: number, min?: number, max?: number): number {
  if (typeof val !== "number" || !Number.isFinite(val)) {
    return fallback;
  }
  let res = val;
  if (typeof min === "number" && res < min) res = min;
  if (typeof max === "number" && res > max) res = max;
  return res;
}

/**
 * Validates a CSS/Hex/RGB color string. Returns fallback if invalid.
 */
export function sanitizeColor(rawColor: unknown, fallback = "#ffffff"): string {
  if (typeof rawColor !== "string") return fallback;
  const trimmed = rawColor.trim();
  // Accepts #RGB, #RGBA, #RRGGBB, #RRGGBBAA, or basic alphanumeric names
  if (/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return trimmed;
  }
  if (/^[a-zA-Z]{3,20}$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

/**
 * Cleans string content for DOM text or labels.
 */
export function sanitizeText(rawText: unknown, fallback = ""): string {
  if (typeof rawText !== "string") return fallback;
  // Replace control characters (the regex intentionally matches them)
  // eslint-disable-next-line no-control-regex
  return rawText.replace(/[\x00-\x1F\x7F]/g, "").trim();
}
