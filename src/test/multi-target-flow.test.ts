import { describe, expect, it } from "vitest";
import { normalizeTargets, newLayer, MAX_TARGETS_PER_ALBUM, type Campaign } from "@/lib/store";
import { qualityScore } from "@/lib/mindar";

describe("Multi-Target and Album Workflow", () => {
  it("normalizes legacy campaign into targets array with primary target", () => {
    const legacyCamp: Campaign = {
      id: "test-camp-1",
      name: "Legacy Album",
      artist: "Test Artist",
      kind: "album",
      targetImage: "https://example.com/cover.jpg",
      aspect: 1,
      layers: [],
      createdAt: 1000,
      updatedAt: 1000,
    };

    const targets = normalizeTargets(legacyCamp);
    expect(targets).toHaveLength(1);
    expect(targets[0]?.id).toBe("target-1");
    expect(targets[0]?.name).toBe("Cover 1");
    expect(targets[0]?.image).toBe("https://example.com/cover.jpg");
    expect(targets[0]?.aspect).toBe(1);
  });

  it("preserves explicit multi-targets up to maximum limit", () => {
    const multiTargets = Array.from({ length: 25 }, (_, i) => ({
      id: `target-${i + 1}`,
      name: `Target Page ${i + 1}`,
      image: `https://example.com/page-${i + 1}.jpg`,
      aspect: 1.414,
    }));

    const camp: Campaign = {
      id: "multi-camp",
      name: "Booklet Album",
      artist: "Band",
      kind: "album",
      targetImage: "https://example.com/cover.jpg",
      aspect: 1,
      targets: multiTargets,
      layers: [],
      createdAt: 1000,
      updatedAt: 1000,
    };

    const targets = normalizeTargets(camp);
    expect(targets.length).toBe(MAX_TARGETS_PER_ALBUM);
    expect(targets.length).toBe(20);
    expect(targets[0]?.name).toBe("Target Page 1");
    expect(targets[19]?.name).toBe("Target Page 20");
  });

  it("links new layers to specific targetIds", () => {
    const videoLayer = newLayer("video", { targetId: "target-cover-2" });
    expect(videoLayer.type).toBe("video");
    expect(videoLayer.targetId).toBe("target-cover-2");
    expect(videoLayer.visible).toBe(true);

    const audioLayer = newLayer("audio", {
      targetId: "target-cover-2",
      src: "https://example.com/audio.mp3",
    });
    expect(audioLayer.type).toBe("audio");
    expect(audioLayer.targetId).toBe("target-cover-2");
    expect(audioLayer.src).toBe("https://example.com/audio.mp3");

    const ctaLayer = newLayer("cta", { targetId: "target-cover-3", label: "Buy Album" });
    expect(ctaLayer.type).toBe("cta");
    expect(ctaLayer.targetId).toBe("target-cover-3");
    expect(ctaLayer.label).toBe("Buy Album");
  });

  it("computes image tracking quality score accurately", () => {
    // contrast: 80, density: 75, features: 500
    const score = qualityScore(80, 75, 500);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(typeof score).toBe("number");

    // Perfect scores
    const perfectScore = qualityScore(100, 100, 600);
    expect(perfectScore).toBe(100);

    // Low contrast, low features
    const lowScore = qualityScore(10, 10, 20);
    expect(lowScore).toBeLessThan(20);
  });
});
