import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  ArrowLeft,
  Box,
  Copy,
  Cpu,
  Download,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Music,
  Printer,
  RotateCcw,
  ScanLine,
  Trash2,
  Video,
  MousePointerClick,
  Smartphone,
  Plus,
  Layers,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayerStage } from "@/components/LayerView";
import {
  clearMind,
  getOwnedCampaign,
  getMind,
  newLayer,
  normalizeTargets,
  readFile,
  saveCampaign,
  saveMind,
  uid,
  MAX_TARGETS_PER_ALBUM,
  type Campaign,
  type Layer,
  type LayerType,
  type TargetItem,
} from "@/lib/store";
import { analyzeImage, compileMultipleTargets, loadImage, qualityScore } from "@/lib/mindar";
import { createPlayer, type Player } from "@/lib/audio";

export const Route = createFileRoute("/_authenticated/studio/$id")({
  head: () => ({
    meta: [
      { title: "Campaign Studio — Flash AR" },
      {
        name: "description",
        content:
          "Compile multi-targets, edit linked AR layers, simulate tracking and publish your album campaign.",
      },
      { property: "og:title", content: "Campaign Studio — Flash AR" },
      {
        property: "og:description",
        content: "Edit and test your multi-target WebAR album campaign.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Studio,
});

function Studio() {
  const { id } = Route.useParams();
  const [c, setC] = useState<Campaign | null | undefined>(undefined);
  const [activeTargetId, setActiveTargetId] = useState<string>("");
  const [sel, setSel] = useState<string>();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveT = useRef<number | undefined>(undefined);
  const latest = useRef<Campaign | null>(null);

  useEffect(() => {
    getOwnedCampaign(id).then((x) => {
      setC((prev) => {
        if (prev === undefined) {
          if (x) {
            const targets = normalizeTargets(x);
            setActiveTargetId(targets[0]?.id || "target-1");
            return { ...x, targets };
          }
          return null;
        }
        return prev;
      });
    });
  }, [id]);

  const doSave = useCallback(async (camp: Campaign) => {
    setSaveState("saving");
    try {
      const res = await saveCampaign(camp);
      if (!res || !res.savedRemotely) {
        setSaveState("error");
        toast.error(res ? "Not signed in — saved on this device only" : "Cloud save failed.");
        return;
      }
      setSaveState("saved");
      setC((prev) => {
        if (!prev) return prev;
        let changed = false;
        const nextTargets = (prev.targets || []).map((t) => {
          const match = res.targetImages?.find((ti) => ti.id === t.id);
          if (match && t.image === match.from) {
            changed = true;
            return { ...t, image: match.to };
          }
          return t;
        });
        const nextLayers = prev.layers.map((l) => {
          const s = res.layerSrcs.find((x) => x.id === l.id);
          if (s && l.src === s.from) {
            changed = true;
            return { ...l, src: s.to };
          }
          return l;
        });
        if (!changed) return prev;
        return { ...prev, targets: nextTargets, layers: nextLayers };
      });
    } catch (e) {
      console.error(e);
      setSaveState("error");
      toast.error("Couldn't save your changes to the cloud.");
    }
  }, []);

  const update = useCallback(
    (fn: (c: Campaign) => Campaign) => {
      setC((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        latest.current = next;
        clearTimeout(saveT.current);
        saveT.current = window.setTimeout(() => doSave(next), 400);
        return next;
      });
    },
    [doSave],
  );

  useEffect(
    () => () => {
      if (saveT.current) {
        clearTimeout(saveT.current);
        if (latest.current) void saveCampaign(latest.current).catch(() => {});
      }
    },
    [],
  );

  if (c === undefined) return <div className="p-10 font-poppins text-ink/60">Loading studio…</div>;
  if (c === null)
    return (
      <div className="p-10 font-poppins text-ink">
        Album not found.{" "}
        <Link to="/dashboard" className="text-ink underline font-bold">
          Back to Dashboard
        </Link>
      </div>
    );

  const targets = normalizeTargets(c);
  const activeTarget = targets.find((t) => t.id === activeTargetId) || targets[0]!;

  return (
    <main className="min-h-screen bg-paper text-ink font-poppins">
      <header className="flex flex-wrap items-center gap-3 border-b border-ink/15 px-6 py-3 bg-paper">
        <Button variant="ghost" size="icon" asChild aria-label="Back">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Input
            value={c.name}
            onChange={(e) => update((x) => ({ ...x, name: e.target.value }))}
            className="h-9 w-48 font-bold border-ink/20"
            placeholder="Album Name"
          />
          <Input
            value={c.artist}
            onChange={(e) => update((x) => ({ ...x, artist: e.target.value }))}
            className="h-9 w-44 border-ink/20 text-xs"
            placeholder="Artist / Creator"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs border border-ink/15 px-2.5 py-1 text-ink/60">
            {targets.length} / {MAX_TARGETS_PER_ALBUM} Targets
          </span>
          {saveState === "saving" && <span className="text-xs text-ink/50">Saving…</span>}
          {saveState === "saved" && <span className="text-xs font-semibold text-ink">● Saved</span>}
          {saveState === "error" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (latest.current) doSave(latest.current);
              }}
            >
              Retry save
            </Button>
          )}
          <Button size="sm" className="bg-ink text-paper hover:bg-ink/85" asChild>
            <Link to="/scan/$id" params={{ id }}>
              <ScanLine className="mr-1.5 h-3.5 w-3.5" /> Scan Album
            </Link>
          </Button>
        </div>
      </header>

      {/* Target selector banner */}
      <div className="border-b border-ink/10 bg-muted/40 px-6 py-2 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink/50 shrink-0 mr-2">
          Album Targets:
        </span>
        {targets.map((t, idx) => {
          const isCurrent = t.id === activeTarget.id;
          const targetLayersCount = c.layers.filter((l) => l.targetId === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTargetId(t.id);
                setSel(undefined);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium border transition shrink-0 ${
                isCurrent
                  ? "bg-ink text-paper border-ink"
                  : "bg-paper text-ink/70 border-ink/20 hover:border-ink"
              }`}
            >
              <img src={t.image} alt="" className="w-4 h-4 object-cover" />
              <span>{t.name || `Target ${idx + 1}`}</span>
              <span
                className={`text-[10px] px-1 ${isCurrent ? "bg-paper text-ink" : "bg-ink/10 text-ink"}`}
              >
                {targetLayersCount} layers
              </span>
            </button>
          );
        })}
      </div>

      <Tabs defaultValue="targets" className="px-6 py-4">
        <TabsList className="bg-paper border border-ink/15 p-1 mb-4">
          <TabsTrigger value="targets" className="text-xs">
            1 · Targets ({targets.length}/20)
          </TabsTrigger>
          <TabsTrigger value="layers" className="text-xs">
            2 · Layers for "{activeTarget.name}"
          </TabsTrigger>
          <TabsTrigger value="sim" className="text-xs">
            3 · Simulator
          </TabsTrigger>
          <TabsTrigger value="publish" className="text-xs">
            4 · Publish &amp; QR
          </TabsTrigger>
        </TabsList>

        <TabsContent value="targets">
          <TargetsTab
            c={c}
            update={update}
            activeTarget={activeTarget}
            setActiveTargetId={setActiveTargetId}
          />
        </TabsContent>

        <TabsContent value="layers">
          <LayersTab c={c} update={update} activeTarget={activeTarget} sel={sel} setSel={setSel} />
        </TabsContent>

        <TabsContent value="sim">
          <SimTab c={c} activeTarget={activeTarget} setActiveTargetId={setActiveTargetId} />
        </TabsContent>

        <TabsContent value="publish">
          <PublishTab c={c} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

type Upd = (fn: (c: Campaign) => Campaign) => void;

/* ---------- Multi-Targets Management & Compiler ---------- */
function TargetsTab({
  c,
  update,
  activeTarget,
  setActiveTargetId,
}: {
  c: Campaign;
  update: Upd;
  activeTarget: TargetItem;
  setActiveTargetId: (id: string) => void;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [hasMind, setHasMind] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const targets = normalizeTargets(c);

  useEffect(() => {
    getMind(c.id).then((m) => setHasMind(!!m));
  }, [c.id]);

  const compileAll = async () => {
    setProgress(0);
    try {
      const targetSrcs = targets.map((t) => t.image);
      const r = await compileMultipleTargets(targetSrcs, setProgress);
      await saveMind(c.id, r.buffer);
      setHasMind(true);

      const firstAnalysis = await analyzeImage(targets[0]!.image);
      update((x) => ({
        ...x,
        quality: {
          contrast: firstAnalysis.contrast,
          density: firstAnalysis.density,
          features: r.featureCount,
          score: qualityScore(firstAnalysis.contrast, firstAnalysis.density, r.featureCount),
        },
      }));
      toast.success(`Successfully compiled ${targets.length} targets into unified .mind tracker!`);
    } catch (e) {
      console.error(e);
      toast.error("Compilation failed. Ensure all target images are valid.");
    } finally {
      setProgress(null);
    }
  };

  const addTargetFile = async (f: File) => {
    if (targets.length >= MAX_TARGETS_PER_ALBUM) {
      toast.error(`Maximum of ${MAX_TARGETS_PER_ALBUM} target files allowed per album.`);
      return;
    }
    const src = await readFile(f);
    const img = await loadImage(src);
    const newT: TargetItem = {
      id: `target-${uid()}`,
      name: f.name.replace(/\.[^.]+$/, "") || `Cover ${targets.length + 1}`,
      image: src,
      aspect: img.height / img.width,
    };
    await clearMind(c.id);
    setHasMind(false);

    update((prev) => {
      const nextTargets = [...normalizeTargets(prev), newT];
      return {
        ...prev,
        targets: nextTargets,
        targetImage: nextTargets[0]!.image,
        aspect: nextTargets[0]!.aspect,
      };
    });
    setActiveTargetId(newT.id);
    toast.success(`Added target "${newT.name}". Remember to recompile!`);
  };

  const removeTarget = async (targetId: string) => {
    if (targets.length <= 1) {
      toast.error("An album must have at least one target image.");
      return;
    }
    await clearMind(c.id);
    setHasMind(false);

    update((prev) => {
      const nextTargets = normalizeTargets(prev).filter((t) => t.id !== targetId);
      // Remove or reassign layers linked to deleted target
      const nextLayers = prev.layers.filter((l) => l.targetId !== targetId);
      return {
        ...prev,
        targets: nextTargets,
        layers: nextLayers,
        targetImage: nextTargets[0]!.image,
        aspect: nextTargets[0]!.aspect,
      };
    });

    const remaining = targets.filter((t) => t.id !== targetId);
    setActiveTargetId(remaining[0]!.id);
    toast.info("Target and linked layers removed. Please recompile tracker.");
  };

  const replaceTargetImage = async (f: File) => {
    const src = await readFile(f);
    const img = await loadImage(src);
    await clearMind(c.id);
    setHasMind(false);

    update((prev) => {
      const nextTargets = normalizeTargets(prev).map((t) =>
        t.id === activeTarget.id ? { ...t, image: src, aspect: img.height / img.width } : t,
      );
      return {
        ...prev,
        targets: nextTargets,
        targetImage: nextTargets[0]!.image,
        aspect: nextTargets[0]!.aspect,
      };
    });
    toast.success("Target artwork replaced. Please recompile tracker.");
  };

  return (
    <div className="space-y-6">
      {/* Target gallery */}
      <div className="border border-ink/15 p-6 bg-paper">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-extrabold font-poppins">
              Album Target Images ({targets.length} of {MAX_TARGETS_PER_ALBUM} max)
            </h2>
            <p className="text-xs text-ink/60 mt-0.5">
              One unified QR code triggers any of these targets. Add sleeves, booklet pages, or
              alternate covers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && addTargetFile(e.target.files[0])}
            />
            <Button
              size="sm"
              disabled={targets.length >= MAX_TARGETS_PER_ALBUM}
              className="bg-ink text-paper hover:bg-ink/85"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Target File ({targets.length}/
              {MAX_TARGETS_PER_ALBUM})
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {targets.map((t, index) => {
            const isSelected = t.id === activeTarget.id;
            const targetLayersCount = c.layers.filter((l) => l.targetId === t.id).length;
            return (
              <div
                key={t.id}
                onClick={() => setActiveTargetId(t.id)}
                className={`border p-3 cursor-pointer transition flex flex-col justify-between ${
                  isSelected
                    ? "border-ink ring-2 ring-ink bg-ink/5"
                    : "border-ink/15 hover:border-ink/40 bg-paper"
                }`}
              >
                <div>
                  <div className="aspect-square overflow-hidden bg-ink/5 border border-ink/10 relative mb-2">
                    <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 bg-ink text-paper text-[10px] font-bold px-1.5 py-0.2">
                      #{index + 1}
                    </span>
                  </div>
                  <Input
                    value={t.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      update((prev) => ({
                        ...prev,
                        targets: normalizeTargets(prev).map((item) =>
                          item.id === t.id ? { ...item, name: val } : item,
                        ),
                      }));
                    }}
                    className="h-7 text-xs font-semibold border-ink/20 mb-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <p className="text-[11px] text-ink/60">
                    {targetLayersCount} linked layer{targetLayersCount === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="pt-3 border-t border-ink/10 mt-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
                    {isSelected ? "Active" : "Select"}
                  </span>
                  {targets.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-ink/50 hover:text-ink hover:bg-ink/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTarget(t.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compiler controls */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-ink/15 p-6 bg-paper space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-ink" />
            <h3 className="font-bold text-base">Compile Unified Album Tracker</h3>
          </div>
          <p className="text-xs text-ink/60 leading-relaxed">
            Compiles all {targets.length} targets into a single `.mind` file. When fans scan your
            album's single QR code, their camera detects any of these {targets.length} targets.
          </p>

          {progress !== null ? (
            <div className="space-y-2 py-2">
              <Progress value={progress} />
              <p className="text-xs text-ink/60">Compiling targets… {progress.toFixed(0)}%</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={compileAll} className="bg-ink text-paper hover:bg-ink/85">
                <Cpu className="mr-1.5 h-4 w-4" />{" "}
                {hasMind ? "Recompile All Targets" : "Compile Unified Targets"}
              </Button>
              <Button
                variant="outline"
                className="border-ink/20"
                onClick={() => replaceInputRef.current?.click()}
              >
                <ImageIcon className="mr-1.5 h-4 w-4" /> Replace "{activeTarget.name}" Artwork
              </Button>
              <input
                ref={replaceInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && replaceTargetImage(e.target.files[0])}
              />
            </div>
          )}

          {hasMind && progress === null && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-ink">
                ● Unified tracker compiled &amp; cached for all {targets.length} targets
              </p>
              {c.quality && (
                <div className="border border-ink/15 p-3 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink/70">
                      Tracking Quality
                    </span>
                    <span className="text-sm font-extrabold text-ink">{c.quality.score} / 100</span>
                  </div>
                  <Progress value={c.quality.score} />
                  <div className="grid grid-cols-3 gap-2 text-center pt-1 text-[11px] text-ink/60">
                    <div>
                      Contrast: <strong className="text-ink">{c.quality.contrast}%</strong>
                    </div>
                    <div>
                      Density: <strong className="text-ink">{c.quality.density}%</strong>
                    </div>
                    <div>
                      Features: <strong className="text-ink">{c.quality.features}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="border border-ink/15 p-6 bg-paper space-y-3">
          <h3 className="font-bold text-base">Active Target Details</h3>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 border border-ink/20 shrink-0">
              <img
                src={activeTarget.image}
                alt={activeTarget.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1 text-xs text-ink/70">
              <p>
                <strong className="text-ink">Target:</strong> {activeTarget.name}
              </p>
              <p>
                <strong className="text-ink">ID:</strong> {activeTarget.id}
              </p>
              <p>
                <strong className="text-ink">Linked Layers:</strong>{" "}
                {c.layers.filter((l) => l.targetId === activeTarget.id).length}
              </p>
              <p className="text-[11px] text-ink/50 pt-1">
                Go to the <strong>Layers</strong> tab to customize what renders when the camera
                finds this specific target.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- Layers Editor linked to Target ---------- */
const ADD: { t: LayerType; label: string; icon: typeof Video; extra?: Partial<Layer> }[] = [
  { t: "video", label: "Video", icon: Video },
  { t: "audio", label: "Audio", icon: Music },
  { t: "model", label: "3D vinyl", icon: Box },
  {
    t: "model",
    label: "3D sleeve",
    icon: Box,
    extra: { modelKind: "sleeve", name: "Spinning sleeve" },
  },
  { t: "cta", label: "CTA badge", icon: MousePointerClick },
  { t: "image", label: "Image", icon: ImageIcon },
];

function LayersTab({
  c,
  update,
  activeTarget,
  sel,
  setSel,
}: {
  c: Campaign;
  update: Upd;
  activeTarget: TargetItem;
  sel?: string | undefined;
  setSel: (s?: string) => void;
}) {
  const targetLayers = c.layers.filter((l) => l.targetId === activeTarget.id);
  const layer = c.layers.find((l) => l.id === sel);

  const patch = (lid: string, p: Partial<Layer>) =>
    update((x) => ({
      ...x,
      layers: x.layers.map((l) => (l.id === lid ? { ...l, ...p } : l)),
    }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-ink/10 pb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Editing Layers for:{" "}
            <span className="font-extrabold underline">{activeTarget.name}</span>
          </h2>
          <p className="text-xs text-ink/60">
            Layers created here appear exclusively when this specific target is scanned.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
        {/* Left: Add Layers & Layer list */}
        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {ADD.map((a) => (
              <Button
                key={a.label}
                variant="outline"
                size="sm"
                className="border-ink/20 text-xs hover:bg-ink hover:text-paper"
                onClick={() => {
                  const l = newLayer(a.t, { ...a.extra, targetId: activeTarget.id });
                  update((x) => ({ ...x, layers: [...x.layers, l] }));
                  setSel(l.id);
                }}
              >
                <a.icon className="mr-1 h-3.5 w-3.5" /> {a.label}
              </Button>
            ))}
          </div>

          <ul className="space-y-1">
            {[...targetLayers].reverse().map((l) => (
              <li
                key={l.id}
                onClick={() => setSel(l.id)}
                className={`flex cursor-pointer items-center gap-2 border px-3 py-2 text-xs font-medium transition ${
                  sel === l.id
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/15 bg-paper hover:border-ink/40"
                }`}
              >
                <span className="flex-1 truncate">{l.name}</span>
                <button
                  aria-label="Toggle visibility"
                  onClick={(e) => {
                    e.stopPropagation();
                    patch(l.id, { visible: !l.visible });
                  }}
                >
                  {l.visible ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 opacity-50" />
                  )}
                </button>
                <button
                  aria-label="Delete layer"
                  onClick={(e) => {
                    e.stopPropagation();
                    update((x) => ({ ...x, layers: x.layers.filter((y) => y.id !== l.id) }));
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
                </button>
              </li>
            ))}
            {!targetLayers.length && (
              <li className="text-xs text-ink/50 p-4 border border-dashed border-ink/20 text-center">
                No layers for this target yet. Add an overlay above.
              </li>
            )}
          </ul>
        </aside>

        {/* Center: Stage preview */}
        <div
          className="flex items-start justify-center border border-ink/15 bg-paper p-6"
          onPointerDown={() => setSel(undefined)}
        >
          <div
            className="relative w-full max-w-[500px]"
            style={{ aspectRatio: `1 / ${activeTarget.aspect}` }}
          >
            <img
              src={activeTarget.image}
              alt={activeTarget.name}
              className="absolute inset-0 h-full w-full object-cover opacity-85"
            />
            <LayerStage
              campaign={c}
              target={activeTarget}
              playing
              selected={sel}
              onSelect={setSel}
              onDrag={(lid, x, y) => patch(lid, { x, y })}
            />
          </div>
        </div>

        {/* Right: Layer properties */}
        <aside className="border border-ink/15 bg-paper p-4">
          {!layer ? (
            <p className="text-xs text-ink/60">
              Select a layer to adjust position, size, rotation, or media. Drag on the stage to
              position.
            </p>
          ) : (
            <LayerProps layer={layer} patch={(p) => patch(layer.id, p)} />
          )}
        </aside>
      </div>
    </div>
  );
}

function LayerProps({ layer: l, patch }: { layer: Layer; patch: (p: Partial<Layer>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const accept = l.type === "video" ? "video/*" : l.type === "audio" ? "audio/*" : "image/*";

  return (
    <div className="space-y-4 text-xs font-poppins">
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-ink/50">
          Layer Name
        </label>
        <Input
          value={l.name}
          onChange={(e) => patch({ name: e.target.value })}
          className="h-8 border-ink/20 mt-1 font-semibold text-xs"
        />
      </div>

      {(l.type === "video" || l.type === "audio" || l.type === "image") && (
        <div className="space-y-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full border-ink/20 text-xs"
            onClick={() => fileRef.current?.click()}
          >
            Upload {l.type} file
          </Button>
          <Input
            placeholder="…or paste file URL"
            value={l.src?.startsWith("data:") ? "" : (l.src ?? "")}
            onChange={(e) => patch({ src: e.target.value })}
            className="h-8 border-ink/20 text-xs"
          />
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) patch({ src: await readFile(f) });
            }}
          />
        </div>
      )}

      {l.type === "cta" && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink/50">
              Button Label
            </label>
            <Input
              value={l.label ?? ""}
              onChange={(e) => patch({ label: e.target.value })}
              className="h-8 border-ink/20 mt-1 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink/50">
              Target URL
            </label>
            <Input
              value={l.url ?? ""}
              onChange={(e) => patch({ url: e.target.value })}
              className="h-8 border-ink/20 mt-1 text-xs"
            />
          </div>
        </div>
      )}

      <div className="space-y-3 pt-2 border-t border-ink/10">
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span>Scale</span>
            <span className="text-ink/60">{l.scale.toFixed(2)}x</span>
          </div>
          <Slider
            min={0.2}
            max={2.5}
            step={0.05}
            value={[l.scale]}
            onValueChange={([scale = l.scale]) => patch({ scale })}
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span>Rotation</span>
            <span className="text-ink/60">{l.rotation}°</span>
          </div>
          <Slider
            min={-180}
            max={180}
            step={5}
            value={[l.rotation]}
            onValueChange={([rotation = l.rotation]) => patch({ rotation })}
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span>Opacity</span>
            <span className="text-ink/60">{Math.round(l.opacity * 100)}%</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={[l.opacity]}
            onValueChange={([opacity = l.opacity]) => patch({ opacity })}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- Simulator for Active Target ---------- */
function SimTab({
  c,
  activeTarget,
  setActiveTargetId,
}: {
  c: Campaign;
  activeTarget: TargetItem;
  setActiveTargetId: (id: string) => void;
}) {
  const [state, setState] = useState<"idle" | "scanning" | "locked" | "lost">("idle");
  const players = useRef<Player[]>([]);
  const targets = normalizeTargets(c);

  useEffect(() => () => players.current.forEach((p) => p.dispose()), []);

  useEffect(() => {
    players.current.forEach((p) => p.dispose());
    players.current = [];
    setState("idle");
  }, [activeTarget.id]);

  useEffect(() => {
    if (state === "scanning") {
      const t = setTimeout(() => setState("locked"), 1600);
      return () => clearTimeout(t);
    }
    if (state === "locked") {
      if (!players.current.length)
        players.current = c.layers
          .filter(
            (l) =>
              l.type === "audio" &&
              l.visible &&
              l.src &&
              (l.targetId === activeTarget.id || !l.targetId),
          )
          .map((l) => createPlayer(l.src!, l.loop));
      players.current.forEach((p) => p.play());
    } else players.current.forEach((p) => p.pause());
    return undefined;
  }, [state, c.layers, activeTarget.id]);

  const locked = state === "locked";
  const targetLayers = c.layers.filter((l) => l.targetId === activeTarget.id);

  return (
    <div className="mt-4 grid gap-8 lg:grid-cols-[auto_1fr]">
      <div className="relative mx-auto h-[580px] w-[310px] overflow-hidden border border-ink bg-paper">
        <div className="absolute inset-0 bg-paper" />
        <div
          className="absolute left-1/2 top-1/2 w-[80%] transition-all duration-700 ease-out"
          style={{
            transform:
              state === "idle" || state === "lost"
                ? "translate(-20%,-30%) rotate(-10deg) scale(0.8)"
                : "translate(-50%,-50%) scale(1)",
            opacity: state === "lost" ? 0.35 : 1,
          }}
        >
          <div className="relative" style={{ aspectRatio: `1 / ${activeTarget.aspect}` }}>
            <img
              src={activeTarget.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover border border-ink/20"
            />
            {locked && <LayerStage campaign={c} target={activeTarget} playing />}
          </div>
        </div>

        {state === "scanning" && (
          <div className="absolute inset-x-6 top-[25%] h-[50%] border-2 border-dashed border-ink/60">
            <div className="absolute inset-x-0 h-0.5 animate-scanline bg-ink" />
          </div>
        )}

        <div className="absolute inset-x-0 top-5 text-center text-xs font-bold">
          <span
            className={`border px-3 py-1 ${locked ? "border-ink bg-ink text-paper" : "border-ink/30 bg-paper text-ink"}`}
          >
            {state === "idle"
              ? "Camera ready"
              : state === "scanning"
                ? "Scanning cover…"
                : locked
                  ? `● Locked: ${activeTarget.name}`
                  : "Lost"}
          </span>
        </div>
      </div>

      <div className="max-w-md space-y-4">
        <h3 className="text-lg font-bold">In-studio Simulator</h3>
        <p className="text-xs text-ink/60 leading-relaxed">
          Simulating tracking for active target: <strong>{activeTarget.name}</strong>. Test layers,
          audio playback, and CTA triggers.
        </p>

        {targets.length > 1 && (
          <div className="space-y-1.5 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink/50">
              Switch Simulated Target:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {targets.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTargetId(t.id)}
                  className={`px-2.5 py-1 text-xs font-semibold border transition ${
                    t.id === activeTarget.id
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/20 bg-paper text-ink hover:border-ink"
                  }`}
                >
                  #{idx + 1} {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => setState("scanning")}
            disabled={state === "scanning"}
            className="bg-ink text-paper"
          >
            <Smartphone className="mr-1.5 h-3.5 w-3.5" />{" "}
            {state === "idle" ? "Point camera" : "Rescan"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setState("lost")}
            disabled={!locked}
            className="border-ink/20"
          >
            Move away
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setState("idle")}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>

        <div className="space-y-1 pt-3 border-t border-ink/10">
          <p className="text-xs font-bold uppercase tracking-wider text-ink/50 mb-2">
            Target Layers
          </p>
          {targetLayers.map((l) => (
            <div
              key={l.id}
              className="flex justify-between border border-ink/10 px-3 py-1.5 text-xs"
            >
              <span>{l.name}</span>
              <span className={locked && l.visible ? "font-bold text-ink" : "text-ink/40"}>
                {locked && l.visible ? (l.type === "audio" ? "playing" : "active") : "idle"}
              </span>
            </div>
          ))}
          {!targetLayers.length && (
            <p className="text-xs text-ink/50">No layers configured for this target.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Publish & Unified Single QR Code ---------- */
function PublishTab({ c }: { c: Campaign }) {
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");
  const targets = normalizeTargets(c);

  useEffect(() => {
    const u = `${window.location.origin}/scan/${c.id}`;
    setUrl(u);
    QRCode.toDataURL(u, { width: 720, margin: 2 }).then(setQr);
  }, [c.id]);

  return (
    <div className="mt-4 grid gap-8 md:grid-cols-[300px_1fr]">
      <div className="border border-ink/20 bg-paper p-4 flex flex-col items-center">
        {qr && <img src={qr} alt="Unified Album QR Code" className="w-full aspect-square" />}
        <p className="text-[11px] font-semibold text-ink/60 text-center mt-3">
          Unified QR Code for all {targets.length} targets
        </p>
      </div>

      <div className="max-w-lg space-y-4">
        <h3 className="text-lg font-bold">Unified Album QR Code</h3>
        <p className="text-xs text-ink/60 leading-relaxed">
          This single QR code works for all {targets.length} target images in this album. Print it
          on the back of the album, vinyl sleeve, or liner notes. Fans point their phone at any page
          to trigger its specific layers.
        </p>

        <div className="flex gap-2">
          <Input readOnly value={url} className="border-ink/20 text-xs" />
          <Button
            variant="outline"
            className="border-ink/20"
            onClick={() => {
              navigator.clipboard.writeText(url);
              toast.success("Link copied");
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild className="bg-ink text-paper hover:bg-ink/85">
            <a href={qr} download={`${c.name}-album-qr.png`}>
              <Download className="mr-1.5 h-4 w-4" /> Download Unified QR
            </a>
          </Button>
          <Button variant="outline" asChild className="border-ink/20">
            <Link to="/print/$id" params={{ id: c.id }}>
              <Printer className="mr-1.5 h-4 w-4" /> Printable Flyer
            </Link>
          </Button>
          <Button variant="outline" asChild className="border-ink/20">
            <Link to="/scan/$id" params={{ id: c.id }}>
              <ScanLine className="mr-1.5 h-4 w-4" /> Test Scanner
            </Link>
          </Button>
        </div>

        <div className="border border-ink/15 p-4 space-y-2 mt-4 bg-muted/20">
          <p className="text-xs font-bold uppercase tracking-wider text-ink/70">
            Targets included in this album:
          </p>
          <div className="flex flex-wrap gap-2">
            {targets.map((t, idx) => (
              <span key={t.id} className="text-[11px] border border-ink/20 px-2 py-0.5 bg-paper">
                #{idx + 1} {t.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
