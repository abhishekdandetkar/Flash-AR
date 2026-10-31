/* Browser-only helpers around MindAR (loaded from CDN at runtime).
 * The CDN bundle ships no type declarations, so a minimal surface covering
 * everything this module actually calls is declared here. */
const VER = "1.2.5";
const CDN = `https://cdn.jsdelivr.net/npm/mind-ar@${VER}/dist`;

interface TrackingPoint {
  x: number;
  y: number;
}

interface MindarTrackingImage {
  width: number;
  height: number;
  points?: TrackingPoint[];
}

interface MindarMatchingData {
  maximaPoints?: TrackingPoint[];
  minimaPoints?: TrackingPoint[];
}

/** Per-target data returned by the MindAR compiler (best-effort typing). */
interface MindarTargetData {
  trackingData?: MindarTrackingImage[];
  matchingData?: MindarMatchingData[];
}

/** Shape of the compiler instance this module uses. */
export interface MindarCompiler {
  compileImageTargets(
    images: HTMLImageElement[],
    onProgress: (p: number) => void,
  ): Promise<MindarTargetData[]>;
  exportData(): Promise<ArrayBuffer>;
  data?: MindarTargetData[];
}

export type MindarCompilerCtor = new () => MindarCompiler;

interface MindarGlobal {
  IMAGE?: { Compiler?: MindarCompilerCtor };
}

interface AframeGlobal {
  shaders?: Record<string, unknown>;
  registerShader(name: string, definition: Record<string, unknown>): void;
}

declare global {
  interface Window {
    MINDAR?: MindarGlobal;
    AFRAME?: AframeGlobal;
  }
}

export async function loadCompiler(): Promise<MindarCompilerCtor | undefined> {
  const mod = (await import(/* @vite-ignore */ `${CDN}/mindar-image.prod.js`)) as {
    Compiler?: MindarCompilerCtor;
  };
  return mod.Compiler ?? window.MINDAR?.IMAGE?.Compiler;
}

function loadScript(src: string) {
  return new Promise<void>((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => res();
    s.onerror = () => rej(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

export async function loadAframe() {
  if (!window.AFRAME) await loadScript("https://aframe.io/releases/1.5.0/aframe.min.js");
  await loadScript(`${CDN}/mindar-image-aframe.prod.js`);
  registerChroma();
}

function registerChroma() {
  const A = window.AFRAME;
  if (!A || A.shaders?.["chromakey"]) return;
  A.registerShader("chromakey", {
    schema: {
      src: { type: "map", is: "uniform" },
      color: { type: "color", is: "uniform", default: "#00ff00" },
      threshold: { type: "number", is: "uniform", default: 0.4 },
      opacity: { type: "number", is: "uniform", default: 1 },
      transparent: { default: true, is: "uniform" },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform sampler2D src; uniform vec3 color; uniform float threshold; uniform float opacity; varying vec2 vUv;
      void main(){ vec4 c=texture2D(src,vUv); float d=distance(c.rgb,color); float a=smoothstep(threshold*0.6,threshold,d);
      gl_FragColor=vec4(c.rgb,c.a*a*opacity);} `,
  });
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

export interface CompileResult {
  buffer: ArrayBuffer;
  points: { x: number; y: number }[]; // normalized 0..1
  featureCount: number;
}

export async function compileTarget(
  src: string,
  onProgress: (p: number) => void,
): Promise<CompileResult> {
  return compileMultipleTargets([src], onProgress);
}

export async function compileMultipleTargets(
  srcs: string[],
  onProgress: (p: number) => void,
): Promise<CompileResult> {
  const Compiler = await loadCompiler();
  if (!Compiler) throw new Error("MindAR compiler could not be loaded from CDN.");
  const images = await Promise.all(srcs.map((src) => loadImage(src)));
  const compiler = new Compiler();
  const dataList: MindarTargetData[] = await compiler.compileImageTargets(images, (p: number) =>
    onProgress(Math.min(100, p)),
  );
  const buffer: ArrayBuffer = await compiler.exportData();
  const points: { x: number; y: number }[] = [];
  let featureCount = 0;
  try {
    const d = dataList?.[0] ?? compiler.data?.[0];
    const t = d?.trackingData?.[0];
    if (t?.points) {
      for (const p of t.points) points.push({ x: p.x / t.width, y: p.y / t.height });
    }
    for (const dItem of dataList || compiler.data || []) {
      for (const m of dItem?.matchingData ?? []) {
        featureCount += (m.maximaPoints?.length ?? 0) + (m.minimaPoints?.length ?? 0);
      }
    }
    if (!featureCount) featureCount = points.length;
  } catch {
    /* visualization is best-effort */
  }
  return { buffer, points, featureCount };
}

/** Contrast and edge density estimates (0-100). */
export async function analyzeImage(src: string) {
  const img = await loadImage(src);
  const N = 256;
  const c = document.createElement("canvas");
  c.width = N;
  c.height = Math.round((N * img.height) / img.width);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  const L = new Float32Array(width * height);
  let sum = 0;
  for (let i = 0; i < L.length; i++) {
    const r = data[i * 4] ?? 0;
    const g = data[i * 4 + 1] ?? 0;
    const b = data[i * 4 + 2] ?? 0;
    const v = 0.299 * r + 0.587 * g + 0.114 * b;
    L[i] = v;
    sum += v;
  }
  const mean = sum / L.length;
  let varSum = 0;
  for (const v of L) varSum += (v - mean) ** 2;
  const std = Math.sqrt(varSum / L.length);
  let edges = 0;
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx = (L[i + 1] ?? 0) - (L[i - 1] ?? 0);
      const gy = (L[i + width] ?? 0) - (L[i - width] ?? 0);
      if (Math.hypot(gx, gy) > 40) edges++;
    }
  const contrast = Math.min(100, (std / 70) * 100);
  const density = Math.min(100, (edges / (width * height) / 0.18) * 100);
  return {
    contrast: Math.round(contrast),
    density: Math.round(density),
    aspect: img.height / img.width,
  };
}

export function qualityScore(contrast: number, density: number, features: number) {
  const f = Math.min(100, (features / 600) * 100);
  return Math.round(contrast * 0.35 + density * 0.4 + f * 0.25);
}
