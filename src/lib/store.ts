import { get, set, del, keys } from "idb-keyval";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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
/* Cloud-backed store.                                                 */
/* - Demo campaigns live device-local in IndexedDB (bundled artwork).  */
/* - User campaigns live in Supabase; media + .mind targets are       */
/*   uploaded to the private "ar-assets" bucket and served to any      */
/*   phone through /api/public/assets/*.                               */
/* ------------------------------------------------------------------ */

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];

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

function rowToCampaign(r: CampaignRow): Campaign {
  // Legacy rows store a plain layer array in `layers`; new rows store the
  // packed { targets, layers } envelope written by toRow().
  type LayersJson = { targets?: TargetItem[]; layers?: Layer[] } | Layer[];
  const rawLayers = r.layers as unknown as LayersJson | null | undefined;
  let targets: TargetItem[] | undefined = undefined;
  let parsedLayers: Layer[] = [];

  if (Array.isArray(rawLayers)) {
    parsedLayers = rawLayers as Layer[];
  } else if (rawLayers && typeof rawLayers === "object") {
    targets = rawLayers.targets;
    parsedLayers = rawLayers.layers || [];
  }

  const camp: Campaign = {
    id: r.id,
    name: r.name,
    artist: r.artist,
    kind: r.kind as Campaign["kind"],
    targetImage: r.target_image,
    aspect: r.aspect,
    quality: (r.quality as Quality | null) ?? undefined,
    targets,
    layers: parsedLayers,
    mindUrl: r.mind_url ?? undefined,
    createdAt: Date.parse(r.created_at),
    updatedAt: Date.parse(r.updated_at),
  };

  // Ensure targets list is populated
  if (!camp.targets || camp.targets.length === 0) {
    camp.targets = normalizeTargets(camp);
  }

  // Ensure every layer has a targetId
  const primaryId = camp.targets[0]?.id || "target-1";
  camp.layers = camp.layers.map((l) => ({
    ...l,
    targetId: l.targetId || primaryId,
  }));

  return camp;
}

type CampaignInsert = Database["public"]["Tables"]["campaigns"]["Insert"];

function toRow(c: Campaign, ownerId: string): CampaignInsert {
  const normTargets = normalizeTargets(c);
  const primaryId = normTargets[0]?.id || "target-1";
  const layersWithTarget = c.layers.map((l) => ({
    ...l,
    targetId: l.targetId || primaryId,
  }));

  // Pack targets and layers together in layers jsonb column
  const packedData = {
    targets: normTargets,
    layers: layersWithTarget,
  };

  return {
    id: c.id,
    owner_id: ownerId,
    name: c.name,
    artist: c.artist,
    kind: c.kind,
    target_image: normTargets[0]?.image || c.targetImage,
    aspect: normTargets[0]?.aspect || c.aspect,
    quality: (c.quality ?? null) as unknown as CampaignInsert["quality"] & NonNullable<unknown>,
    layers: packedData as unknown as NonNullable<CampaignInsert["layers"]>,
    mind_url: c.mindUrl ?? null,
    created_at: new Date(c.createdAt || Date.now()).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function ext(dataUrl: string): string {
  const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1] ?? "";
  const sub = mime.split("/")[1] ?? "";
  const map: Record<string, string> = {
    jpeg: "jpg",
    "svg+xml": "svg",
    quicktime: "mov",
    "x-m4a": "m4a",
  };
  const raw = map[sub] ?? sub;
  return `.${raw || "bin"}`;
}

async function uploadAsset(path: string, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const { error } = await supabase.storage
    .from("ar-assets")
    .upload(path, blob, { upsert: true, contentType: blob.type || "application/octet-stream" });
  if (error) throw new Error(error.message);
  return `/api/public/assets/${path}`;
}

async function uploadMind(id: string, buf: ArrayBuffer, ownerId: string): Promise<string> {
  const path = `${ownerId}/${id}/target.mind`;
  const { error } = await supabase.storage
    .from("ar-assets")
    .upload(path, new Blob([buf], { type: "application/octet-stream" }), {
      upsert: true,
      contentType: "application/octet-stream",
    });
  if (error) throw new Error(error.message);
  const url = `/api/public/assets/${path}`;
  await supabase.from("campaigns").update({ mind_url: url }).eq("id", id);
  return url;
}

async function sessionUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id) return data.session.user.id;
  return null;
}

export async function listCampaigns(): Promise<Campaign[]> {
  const all = (await keys()).filter((k) => String(k).startsWith("campaign:"));
  const locals = (await Promise.all(all.map((k) => get<Campaign>(k)))).filter(
    Boolean,
  ) as Campaign[];
  const demos = locals.filter((c) => c.isDemo);
  const legacy = locals.filter((c) => !c.isDemo);

  let mine: Campaign[] = [];
  const ownerId = await sessionUserId();
  if (ownerId) {
    for (const c of legacy) {
      try {
        const result = await saveCampaign(c);
        if (result?.savedRemotely) await del(C(c.id));
      } catch {
        /* stays local; retried on the next load */
      }
    }
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false });
    if (!error && data) mine = data.map(rowToCampaign);
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
    local.layers = (local.layers || []).map((l) => ({ ...l, targetId: l.targetId || primaryId }));
    return local;
  }
  const { data, error } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return rowToCampaign(data);
}

/** Returns a campaign only when it is a built-in demo or belongs to the active user. */
export async function getOwnedCampaign(id: string): Promise<Campaign | undefined> {
  if (id.startsWith("demo-")) return getCampaign(id);
  const ownerId = await sessionUserId();
  if (!ownerId) return undefined;
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error || !data) return undefined;
  return rowToCampaign(data);
}

export interface SaveResult {
  savedRemotely: boolean;
  targetImage?: { from: string; to: string };
  targetImages?: { id: string; from: string; to: string }[];
  layerSrcs: { id: string; from: string; to: string }[];
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
  const ownerId = await sessionUserId();
  if (!ownerId) {
    await set(C(c.id), { ...c, updatedAt: Date.now() });
    return null;
  }
  const next: Campaign = {
    ...c,
    targets: normTargets.map((t) => ({ ...t })),
    layers: c.layers.map((l) => ({ ...l, targetId: l.targetId || normTargets[0]!.id })),
  };
  const result: SaveResult = { savedRemotely: false, layerSrcs: [], targetImages: [] };

  // Upload target images if data URLs
  for (let idx = 0; idx < next.targets!.length; idx++) {
    const t = next.targets![idx]!;
    if (t.image.startsWith("data:")) {
      const from = t.image;
      t.image = await uploadAsset(`${ownerId}/${c.id}/target_${t.id}${ext(t.image)}`, t.image);
      result.targetImages!.push({ id: t.id, from, to: t.image });
      if (idx === 0) {
        next.targetImage = t.image;
        result.targetImage = { from, to: t.image };
      }
    }
  }

  // Upload layer sources if data URLs
  for (const l of next.layers) {
    if (l.src?.startsWith("data:")) {
      const from = l.src;
      l.src = await uploadAsset(`${ownerId}/${c.id}/${l.id}${ext(l.src)}`, l.src);
      result.layerSrcs.push({ id: l.id, from, to: l.src });
    }
  }

  try {
    const { error } = await supabase.from("campaigns").upsert(toRow(next, ownerId));
    if (error) {
      console.warn("Cloud save failed, falling back to local storage:", error.message);
      await set(C(c.id), { ...next, updatedAt: Date.now() });
      return result;
    }
  } catch (cloudErr) {
    console.warn("Cloud save exception, saving locally:", cloudErr);
    await set(C(c.id), { ...next, updatedAt: Date.now() });
    return result;
  }

  result.savedRemotely = true;
  const buf = await getMind(c.id);
  if (buf) {
    try {
      next.mindUrl = await uploadMind(c.id, buf, ownerId);
    } catch {
      /* cached device-local only */
    }
  }
  return result;
}

export async function deleteCampaign(id: string) {
  await del(C(id));
  await del(M(id));
  const ownerId = await sessionUserId();
  if (!ownerId) return;
  await supabase.from("campaigns").delete().eq("id", id).eq("owner_id", ownerId);
  try {
    const folder = `${ownerId}/${id}`;
    const { data: objs } = await supabase.storage.from("ar-assets").list(folder);
    if (objs?.length)
      await supabase.storage.from("ar-assets").remove(objs.map((o) => `${folder}/${o.name}`));
  } catch {
    /* best effort cleanup */
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
  const ownerId = await sessionUserId();
  if (!ownerId) return;
  try {
    await uploadMind(id, buf, ownerId);
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
