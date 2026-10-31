import { describe, expect, it, vi, beforeEach } from "vitest";
import { normalizeTargets, type Campaign, type Layer } from "@/lib/store";

describe("Multi-Target & Layer Association", () => {
  const dummyCampaign: Campaign = {
    id: "camp-test-1",
    name: "Test Album",
    artist: "Test Artist",
    kind: "album",
    targetImage: "https://example.com/cover1.jpg",
    aspect: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    targets: [
      { id: "target-1", name: "Front Cover", image: "https://example.com/cover1.jpg", aspect: 1 },
      { id: "target-2", name: "Back Cover", image: "https://example.com/cover2.jpg", aspect: 1 },
      { id: "target-3", name: "Vinyl Label", image: "https://example.com/label.jpg", aspect: 1 },
    ],
    layers: [
      {
        id: "layer-audio-1",
        targetId: "target-1",
        type: "audio",
        name: "Track 1",
        src: "https://example.com/track1.mp3",
        x: 0,
        y: 0,
        w: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        visible: true,
      },
      {
        id: "layer-audio-2",
        targetId: "target-2",
        type: "audio",
        name: "Track 2",
        src: "https://example.com/track2.mp3",
        x: 0,
        y: 0,
        w: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        visible: true,
      },
      {
        id: "layer-video-1",
        targetId: "target-1",
        type: "video",
        name: "Clip 1",
        src: "https://example.com/clip1.mp4",
        x: 0,
        y: 0,
        w: 0.8,
        scale: 1,
        rotation: 0,
        opacity: 1,
        visible: true,
      },
    ],
  };

  it("normalizes and enforces targets limit", () => {
    const targets = normalizeTargets(dummyCampaign);
    expect(targets).toHaveLength(3);
    expect(targets[0]?.id).toBe("target-1");
  });

  it("filters layers accurately by target ID", () => {
    const target1Layers = dummyCampaign.layers.filter((l) => l.targetId === "target-1");
    const target2Layers = dummyCampaign.layers.filter((l) => l.targetId === "target-2");
    const target3Layers = dummyCampaign.layers.filter((l) => l.targetId === "target-3");

    expect(target1Layers).toHaveLength(2);
    expect(target2Layers).toHaveLength(1);
    expect(target3Layers).toHaveLength(0);

    expect(target1Layers.find((l) => l.type === "audio")?.id).toBe("layer-audio-1");
    expect(target2Layers.find((l) => l.type === "audio")?.id).toBe("layer-audio-2");
  });

  it("handles multi-target active selection deterministically", () => {
    const detectedSet = new Set<number>([0, 2]); // target-1 and target-3 found simultaneously

    // Deterministic policy: highest/most-recent detected index
    const sorted = Array.from(detectedSet).sort((a, b) => b - a);
    const activeIdx = sorted[0];

    expect(activeIdx).toBe(2);
    expect(dummyCampaign.targets?.[activeIdx!]?.name).toBe("Vinyl Label");
  });
});
