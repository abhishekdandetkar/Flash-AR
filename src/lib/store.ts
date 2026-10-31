/* Hybrid data layer: IndexedDB for local/demo data, Cloudflare D1 via API
 * routes for user campaigns. Replaces the old Supabase-backed store.
 */

import { get, set, del, keys } from "idb-keyval";

export type LayerType = "video" | "audio" | "model" | "cta" | "image";

export interface Layer {
  id: string;
  targetId?: string; // Links layer to a specific target image in the album
  type: LayerType;
  name: string;
  src?: string; // data URL, remote URL, app asset URL, or "synth:nightdrive"
  x: number; // target-width units, 0 = center
  y: number;
  w: number; // width as fraction of target width
  scale: number;
  rotation: number; // degrees
  opacity: number; // 0..1
  visible: boolean;
  loop?: boolean;
  chroma?: { enabled: boolean; color: string; threshold: number };
  label?: string;
  url?: string;
  color?: string;
  modelKind?: "vinyl" | "sleeve";
  spin?: boolean;
}

export interface Quality {
  score: number;
  contrast: number;
  density: number;
  features: number;
}

export interface TargetItem {
  id: string;
  name: string;
  image: string; // URL or data URL
  aspect: number;
  quality?: Quality | undefined;
  mindData?: string; // cached target data if any
}

export interface Campaign {
  id: string;
  name: string;
  artist: string;
  kind: "vinyl" | "album" | "photo";
  targetImage: string; // Primary/first target image for backward compatibility
  aspect: number; // height / width
  quality?: Quality | undefined;
  targets?: TargetItem[] | undefined; // Up to 20 target images in an album
  layers: Layer[]; // Each layer linked to a target via layer.targetId
  isDemo?: boolean;
  mindUrl?: string | undefined;
  createdAt: number;
  updatedAt: number;
}

const C = (id: string) => `campaign:${id}`;
const M = (id: string) => `mind:${id}`;

export const uid = () => crypto.randomUUID();
export const MAX_TARGETS_PER_ALBUM = 20;

/* ------------------------------------------------------------------ */
/* Hybrid store.                                                       */
/* - Demo campaigns live device-local in IndexedDB (bundled artwork).  */
/* - User campaigns live in Cloudflare D1, accessed via /api/* routes. */
/* - Media + .mind targets are uploaded to R2 via /api/upload.         */
/* ------------------------------------------------------------------ */

export function normalizeTargets(c: Campaign): TargetItem[] {
  if (c.targets && c.targets.length > 0) {
    return c.targets.slice(0, MAX_TARGETS_PER_ALBUM);
  }
  const defaultTarget: TargetItem = {
    id: "target-1",
    name: "Cover 1",
    image: c.targetImage,
    aspect: c.aspect || 1,
    quality: c.quality,
  };
  return [defaultTarget];
}

interface SaveResult {
  savedRemotely: boolean;
  targetImage?: { from: string; to: string };
  targetImages?: { id: string; from: string; to: string }[];
  layerSrcs: { id: string; from: string; to: string }[];
}

/* ------------------------------------------------------------------ */
/* API helpers (D1 via server routes)                                  */
/* ------------------------------------------------------------------ */

async function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  // Session cookie is httpOnly, sent automatically by the browser.
  return fetch(path, { ...options, headers });
}

async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiRequest(path, options);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/* ------------------------------------------------------------------ */
/* IndexedDB helpers (local + demo campaigns)                         */
/* ------------------------------------------------------------------ */

export async function listCampaigns(): Promise<Campaign[]> {
  const all = (await keys()).filter((k) => String(k).startsWith("campaign:"));
  const locals = (await Promise.all(all.map((k) => get<Campaign>(k)))).filter(
    Boolean,
  ) as Campaign[];
  const demos = locals.filter((c) => c.isDemo);

  let mine: Campaign[] = [];
  try {
    mine = await apiJson<Campaign[]>("/api/campaigns");
  } catch {
    /* server may be unavailable; local campaigns still visible */
  }

  const items = [...demos, ...mine].map((c) => {
    if (!c.targets || c.targets.length === 0) c.targets = normalizeTargets(c);
    return c;
  });

  return items.sort((a, b) => {
    if (a.isDemo !== b.isDemo) return a.isDemo ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

export async function getCampaign(id: string): Promise<Campaign | undefined> {
  const local = await get<Campaign>(C(id));
  if (local) {
    if (!local.targets || local.targets.length === 0) local.targets = normalizeTargets(local);
    const primaryId = local.targets[0]?.id || "target-1";
    local.layers = (local.layers || []).map((l) => ({
      ...l,
      targetId: l.targetId || primaryId,
    }));
    return local;
  }

  try {
    return await apiJson<Campaign>(`/api/campaigns/${id}`);
  } catch {
    return undefined;
  }
}

/** Returns a campaign only when it is a built-in demo or belongs to the active user. */
export async function getOwnedCampaign(id: string): Promise<Campaign | undefined> {
  if (id.startsWith("demo-")) return getCampaign(id);
  try {
    return await apiJson<Campaign>(`/api/campaigns/${id}`);
  } catch {
    return undefined;
  }
}

export async function saveCampaign(c: Campaign): Promise<SaveResult | null> {
  const normTargets = normalizeTargets(c);
  c.targets = normTargets;
  c.targetImage = normTargets[0]?.image || c.targetImage;
  c.aspect = normTargets[0]?.aspect || c.aspect;

  if (c.isDemo) {
    await set(C(c.id), { ...c, updatedAt: Date.now() });
    return null;
  }

  const next: Campaign = {
    ...c,
    targets: normTargets.map((t) => ({ ...t })),
    layers: c.layers.map((l) => ({ ...l, targetId: l.targetId || normTargets[0]!.id })),
  };
  const result: SaveResult = { savedRemotely: false, layerSrcs: [], targetImages: [] };

  try {
    await apiRequest("/api/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: next.id,
        name: next.name,
        artist: next.artist,
        kind: next.kind,
        targetImage: next.targetImage,
        aspect: next.aspect,
        quality: next.quality ? JSON.stringify(next.quality) : null,
        targets: next.targets ? JSON.stringify(next.targets) : null,
        layers: next.layers ? JSON.stringify(next.layers) : null,
        mindUrl: next.mindUrl ?? null,
        createdAt: next.createdAt,
        updatedAt: next.updatedAt,
      }),
    });
    result.savedRemotely = true;
  } catch (err) {
    console.warn("Cloud save failed, falling back to local storage:", err);
    await set(C(c.id), { ...next, updatedAt: Date.now() });
    return result;
  }

  const buf = await getMind(c.id);
  if (buf) {
    try {
      await uploadMind(c.id, buf);
    } catch {
      /* cached device-local only */
    }
  }
  return result;
}

export async function deleteCampaign(id: string) {
  await del(C(id));
  await del(M(id));
  try {
    await apiRequest(`/api/campaigns/${id}`, { method: "DELETE" });
  } catch {
    /* best effort */
  }
}

interface MindCache {
  buffer: ArrayBuffer;
  source?: string;
}

export async function getMindRecord(id: string): Promise<MindCache | undefined> {
  const cached = await get<ArrayBuffer | MindCache>(M(id));
  if (!cached) return undefined;
  return cached instanceof ArrayBuffer ? { buffer: cached } : cached;
}

export async function getMind(id: string): Promise<ArrayBuffer | undefined> {
  return (await getMindRecord(id))?.buffer;
}

export async function saveMind(id: string, buf: ArrayBuffer, cloud = true, source?: string) {
  await set(M(id), { buffer: buf, ...(source ? { source } : {}) } satisfies MindCache);
  if (!cloud || id.startsWith("demo-")) return;
  try {
    await uploadMind(id, buf);
  } catch {
    /* cached device-local only */
  }
}

export const clearMind = (id: string) => del(M(id));

export function newLayer(type: LayerType, extra: Partial<Layer> = {}): Layer {
  const base: Layer = {
    id: uid(),
    type,
    name: type[0]!.toUpperCase() + type.slice(1),
    x: 0,
    y: 0,
    w: 0.8,
    scale: 1,
    rotation: 0,
    opacity: 1,
    visible: true,
  };
  if (type === "video")
    Object.assign(base, {
      name: "Video overlay",
      loop: true,
      chroma: { enabled: false, color: "#00ff00", threshold: 0.4 },
    });
  if (type === "audio") Object.assign(base, { name: "Track audio", loop: true, w: 0 });
  if (type === "model")
    Object.assign(base, { name: "Spinning vinyl", modelKind: "vinyl", spin: true, w: 0.7 });
  if (type === "cta")
    Object.assign(base, {
      name: "CTA badge",
      label: "Stream on Spotify",
      url: "https://open.spotify.com",
      color: "#1ed760",
      w: 0.5,
      y: -0.6,
    });
  if (type === "image") Object.assign(base, { name: "Image", w: 0.5 });
  return { ...base, ...extra };
}

export function readFile(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ------------------------------------------------------------------ */
/* Asset upload (R2 via /api/upload server route)                      */
/* ------------------------------------------------------------------ */

async function uploadAsset(path: string, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const formData = new FormData();
  formData.append("path", path);
  formData.append("file", blob);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const json = (await res.json()) as { url: string };
  return json.url;
}

async function uploadMind(id: string, buf: ArrayBuffer): Promise<string> {
  const path = `mind/${id}/target.mind`;
  const blob = new Blob([buf], { type: "application/octet-stream" });
  const formData = new FormData();
  formData.append("path", path);
  formData.append("file", blob);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error(`Mind upload failed: ${res.status}`);
  const json = (await res.json()) as { url: string };
  return json.url;
}
