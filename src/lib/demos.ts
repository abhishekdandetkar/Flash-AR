import synth from "@/assets/demo-synthwave.jpg";
import photo from "@/assets/demo-photo.jpg";
import { getCampaign, newLayer, saveCampaign, type Campaign } from "./store";

const VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

function demos(): Campaign[] {
  const now = Date.now();
  return [
    {
      id: "demo-night-drive",
      name: "Night Drive",
      artist: "Neon Sky Records",
      kind: "vinyl",
      targetImage: synth,
      aspect: 1,
      isDemo: true,
      createdAt: now,
      updatedAt: now,
      layers: [
        newLayer("model", { id: "nd-vinyl", name: "Spinning vinyl", x: 0.32, y: 0.05, w: 0.75 }),
        newLayer("video", {
          id: "nd-video",
          name: "Animated artwork",
          src: VIDEO,
          x: -0.2,
          y: 0.25,
          w: 0.5,
          opacity: 0.9,
        }),
        newLayer("audio", {
          id: "nd-audio",
          name: "Track: Night Drive (preview)",
          src: "synth:nightdrive",
        }),
        newLayer("cta", { id: "nd-cta1", label: "Stream on Spotify", x: -0.26, y: -0.62, w: 0.46 }),
        newLayer("cta", {
          id: "nd-cta2",
          label: "Buy Vinyl",
          color: "#ff3d9a",
          url: "https://example.com/shop",
          x: 0.26,
          y: -0.62,
          w: 0.46,
        }),
      ],
    },
    {
      id: "demo-summer-98",
      name: "Summer '98",
      artist: "Family photo album",
      kind: "photo",
      targetImage: photo,
      aspect: 1,
      isDemo: true,
      createdAt: now - 1,
      updatedAt: now - 1,
      layers: [
        newLayer("video", {
          id: "s98-video",
          name: "Memory clip",
          src: VIDEO,
          x: 0,
          y: 0.05,
          w: 0.7,
        }),
        newLayer("cta", {
          id: "s98-cta",
          label: "View full gallery",
          color: "#f5b942",
          url: "https://example.com/gallery",
          x: 0,
          y: -0.6,
          w: 0.55,
        }),
      ],
    },
  ];
}

export async function seedDemos() {
  for (const d of demos()) {
    if (!(await getCampaign(d.id))) await saveCampaign(d);
  }
}
