import { useEffect, useRef } from "react";
import type { Campaign, Layer, TargetItem } from "@/lib/store";
import { sanitizeCtaUrl } from "@/lib/sanitize";

function hexToRgb(h: string) {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function VideoLayer({ layer, playing }: { layer: Layer; playing: boolean }) {
  const v = useRef<HTMLVideoElement>(null);
  const c = useRef<HTMLCanvasElement>(null);
  const chroma = layer.chroma?.enabled;

  useEffect(() => {
    const el = v.current;
    if (!el) return;
    if (playing) el.play().catch(() => {});
    else el.pause();
  }, [playing, layer.src]);

  useEffect(() => {
    const chroma = layer.chroma;
    if (!chroma?.enabled) return;
    let raf = 0;
    const [r, g, b] = hexToRgb(chroma.color) as [number, number, number];
    const th = chroma.threshold * 441;
    const draw = () => {
      const el = v.current,
        cv = c.current;
      if (el && cv && el.videoWidth) {
        cv.width = 320;
        cv.height = Math.round((320 * el.videoHeight) / el.videoWidth);
        const ctx = cv.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(el, 0, 0, cv.width, cv.height);
        try {
          const img = ctx.getImageData(0, 0, cv.width, cv.height);
          const d = img.data;
          for (let i = 0; i < d.length; i += 4) {
            const dist = Math.hypot(d[i]! - r, d[i + 1]! - g, d[i + 2]! - b);
            if (dist < th) d[i + 3] = Math.max(0, ((dist - th * 0.6) / (th * 0.4)) * 255);
          }
          ctx.putImageData(img, 0, 0);
        } catch {
          /* cross-origin video: show unkeyed */
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [layer.chroma]);

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black/40">
      <video
        ref={v}
        src={layer.src}
        playsInline
        webkit-playsinline=""
        muted
        loop={layer.loop ?? true}
        crossOrigin="anonymous"
        className={chroma ? "hidden" : "h-full w-full object-cover"}
      />
      {chroma && <canvas ref={c} className="h-full w-full object-cover" />}
    </div>
  );
}

function VinylModel({ coverSrc }: { coverSrc: string }) {
  return (
    <div className="relative aspect-square w-full">
      <div className="absolute inset-0 animate-spin-slow rounded-full bg-[radial-gradient(circle,#111_0%,#1a1a1a_35%,#0a0a0a_38%,#222_42%,#111_60%,#050505_100%)] shadow-2xl">
        <div className="absolute inset-[30%] overflow-hidden rounded-full border-2 border-amber-900/60 shadow-inner">
          <img src={coverSrc} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-[46%] rounded-full bg-black border border-white/20" />
      </div>
    </div>
  );
}

function SleeveModel({ coverSrc }: { coverSrc: string }) {
  return (
    <div className="relative aspect-square w-full [perspective:600px]">
      <div className="h-full w-full animate-sleeve rounded-sm border border-white/20 shadow-2xl">
        <img src={coverSrc} alt="" className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

function LayerContent({
  layer,
  target,
  playing,
}: {
  layer: Layer;
  target: TargetItem;
  playing: boolean;
}) {
  switch (layer.type) {
    case "video":
      return <VideoLayer layer={layer} playing={playing} />;
    case "image":
      return layer.src ? (
        <img src={layer.src} alt="" className="h-full w-full object-contain" />
      ) : (
        <div className="h-full w-full bg-white/20" />
      );
    case "model":
      return layer.modelKind === "sleeve" ? (
        <SleeveModel coverSrc={target.image} />
      ) : (
        <VinylModel coverSrc={target.image} />
      );
    case "cta":
      return (
        <div
          className="flex h-full w-full items-center justify-center px-3 py-2 text-center text-xs font-bold shadow-lg"
          style={{ background: layer.color || "#1ed760", color: "#111" }}
        >
          {layer.label || "Listen"}
        </div>
      );
    default:
      return null;
  }
}

export function LayerStage({
  campaign,
  target,
  playing,
  selected,
  onSelect,
  onDrag,
}: {
  campaign: Campaign;
  target: TargetItem;
  playing: boolean;
  selected?: string | undefined;
  onSelect?: (id: string) => void;
  onDrag?: (id: string, x: number, y: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const startDrag = (e: React.PointerEvent, l: Layer) => {
    if (!onDrag || !ref.current) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(l.id);
    const rect = ref.current.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY,
      ox = l.x,
      oy = l.y;
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / rect.width;
      const dy = (ev.clientY - sy) / rect.width;
      onDrag(l.id, +(ox + dx).toFixed(3), +(oy - dy).toFixed(3));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Only display layers linked to this active target image
  const targetLayers = campaign.layers.filter(
    (l) => l.visible && l.type !== "audio" && (l.targetId === target.id || !l.targetId),
  );

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 [container-type:inline-size]">
      {targetLayers.map((l) => (
        <div
          key={l.id}
          onPointerDown={(e) => startDrag(e, l)}
          className={`absolute ${onDrag ? "pointer-events-auto cursor-move" : ""} ${
            selected === l.id ? "outline outline-2 outline-offset-2 outline-accent" : ""
          } ${l.type === "cta" && !onDrag ? "pointer-events-auto cursor-pointer" : ""}`}
          onClick={() => {
            const safeUrl = l.type === "cta" ? sanitizeCtaUrl(l.url) : null;
            if (!onDrag && safeUrl) window.open(safeUrl, "_blank", "noopener,noreferrer");
          }}
          style={{
            left: `${50 + l.x * 100}%`,
            top: `${50 - (l.y / target.aspect) * 100}%`,
            width: `${l.w * l.scale * 100}%`,
            opacity: l.opacity,
            transform: `translate(-50%,-50%) rotate(${-l.rotation}deg)`,
          }}
        >
          <LayerContent layer={l} target={target} playing={playing} />
        </div>
      ))}
    </div>
  );
}
