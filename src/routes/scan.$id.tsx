import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  CameraOff,
  Loader2,
  ScanLine,
  Volume2,
  VolumeX,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { seedDemos } from "@/lib/demos";
import {
  getCampaign,
  getMindRecord,
  normalizeTargets,
  saveMind,
  type Campaign,
  type Layer,
  type TargetItem,
} from "@/lib/store";
import { compileMultipleTargets, loadAframe } from "@/lib/mindar";
import { createPlayer, type Player } from "@/lib/audio";
import {
  sanitizeCtaUrl,
  sanitizeAssetUrl,
  sanitizeNumber,
  sanitizeColor,
  sanitizeText,
} from "@/lib/sanitize";

/* Minimal A-Frame scene surface used by this page; the full runtime has no
 * bundled types and is loaded from CDN. The A-Frame scene is a DOM element,
 * so it extends Element and only adds A-Frame-specific members. */
interface AframeScene extends Element {
  systems?: Record<string, { stop?: unknown } | undefined>;
}

interface AframeEntity {
  getAttribute(name: string): unknown;
  setAttribute(name: string, value: string): void;
}

export const Route = createFileRoute("/scan/$id")({
  head: () => ({
    meta: [
      { title: "Scan the album — Flash AR" },
      {
        name: "description",
        content: "Point your camera at any of the album's covers to unlock the AR experience.",
      },
      { property: "og:title", content: "Scan the album — Flash AR" },
      { property: "og:description", content: "Point your camera at the cover to make it play." },
    ],
  }),
  component: Scan,
});

type Phase = "intro" | "preparing" | "searching" | "found" | "denied" | "error" | "missing";

interface ErrorDetails {
  title: string;
  message: string;
  canRetry: boolean;
}

export function Scan() {
  const { id } = Route.useParams();
  const [campaign, setCampaign] = useState<Campaign | null | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>("intro");
  const [progress, setProgress] = useState(0);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);

  // Active target tracking
  const [detectedIndices, setDetectedIndices] = useState<Set<number>>(new Set());
  const [activeTargetIndex, setActiveTargetIndex] = useState<number | null>(null);

  // Audio autoplay restriction state
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Scene references & lifecycle tracking
  const holderRef = useRef<HTMLDivElement>(null);
  const mountedSceneRef = useRef<HTMLElement | null>(null);
  const playersMapRef = useRef<Map<string, Player>>(new Map()); // Key: `${targetId}:${layerId}`
  const blobUrlsRef = useRef<string[]>([]);
  const videoElementsMapRef = useRef<Map<string, HTMLVideoElement>>(new Map()); // Key: layerId
  const listenersCleanupRef = useRef<Array<() => void>>([]);
  const sessionTokenRef = useRef(0);
  const isStartingRef = useRef(false);

  // 1. Initial Campaign Load
  useEffect(() => {
    let unmounted = false;
    seedDemos()
      .then(() => getCampaign(id))
      .then((res) => {
        if (!unmounted) {
          setCampaign(res ?? null);
          if (!res) setPhase("missing");
        }
      })
      .catch((err) => {
        if (!unmounted) {
          console.error("Failed to load campaign:", err);
          setCampaign(null);
          setPhase("missing");
        }
      });

    return () => {
      unmounted = true;
    };
  }, [id]);

  // 2. Comprehensive Scoped Teardown
  const teardownSession = useCallback(() => {
    sessionTokenRef.current += 1;
    isStartingRef.current = false;

    // Remove all event listeners cleanly
    listenersCleanupRef.current.forEach((fn) => {
      try {
        fn();
      } catch {
        // Ignored
      }
    });
    listenersCleanupRef.current = [];

    // Dispose and pause audio players
    playersMapRef.current.forEach((p) => {
      try {
        p.dispose();
      } catch {
        // Ignored
      }
    });
    playersMapRef.current.clear();
    setAudioPlaying(false);
    setAudioBlocked(false);

    // Pause all video elements created for this scanner
    videoElementsMapRef.current.forEach((v) => {
      try {
        v.pause();
        v.removeAttribute("src");
        v.load();
      } catch {
        // Ignored
      }
    });
    videoElementsMapRef.current.clear();

    // Revoke object URLs created for trackers
    blobUrlsRef.current.forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch {
        // Ignored
      }
    });
    blobUrlsRef.current = [];

    // Stop MindAR system safely
    const scene = mountedSceneRef.current as AframeScene | null;
    if (scene) {
      try {
        const mindarSystem = scene.systems?.["mindar-image-system"];
        if (mindarSystem && typeof mindarSystem.stop === "function") {
          mindarSystem.stop();
        }
      } catch (err) {
        console.warn("Error stopping MindAR system:", err);
      }

      // Stop only camera video tracks bound to MindAR scene
      try {
        const mindarVideo =
          scene.querySelector("video") || holderRef.current?.querySelector("video.mindar-video");
        if (mindarVideo && (mindarVideo as HTMLVideoElement).srcObject) {
          const stream = (mindarVideo as HTMLVideoElement).srcObject as MediaStream;
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch {
        // Ignored
      }

      // Remove scene from DOM
      if (scene.parentNode) {
        try {
          scene.parentNode.removeChild(scene);
        } catch {
          // Ignored
        }
      }
      mountedSceneRef.current = null;
    }

    if (holderRef.current) {
      holderRef.current.innerHTML = "";
    }

    setDetectedIndices(new Set());
    setActiveTargetIndex(null);
  }, []);

  // Teardown when component unmounts
  useEffect(() => {
    return () => {
      teardownSession();
    };
  }, [teardownSession]);

  // 3. Audio & Video Sync to Active Target
  const syncMediaToActiveTarget = useCallback((targetId: string | null) => {
    // Sync Audio
    playersMapRef.current.forEach((player, key) => {
      const [owningTargetId] = key.split(":");
      if (targetId && owningTargetId === targetId) {
        player.play().then((started) => {
          if (started) {
            setAudioPlaying(true);
            setAudioBlocked(false);
          } else {
            setAudioBlocked(true);
            setAudioPlaying(false);
          }
        });
      } else {
        player.pause();
      }
    });

    // Sync Videos
    videoElementsMapRef.current.forEach((videoEl, layerId) => {
      const owningTargetId = videoEl.getAttribute("data-target-id");
      if (targetId && owningTargetId === targetId) {
        videoEl.play().catch(() => {});
      } else {
        videoEl.pause();
      }
    });
  }, []);

  // Update active target when detection set changes
  useEffect(() => {
    if (detectedIndices.size === 0) {
      setActiveTargetIndex(null);
      syncMediaToActiveTarget(null);
      return;
    }

    // Deterministic selection: highest/most-recent detected index
    const sorted = Array.from(detectedIndices).sort((a, b) => b - a);
    const primaryIdx = sorted[0]!;
    setActiveTargetIndex(primaryIdx);

    if (campaign) {
      const targets = normalizeTargets(campaign);
      const targetObj = targets[primaryIdx];
      if (targetObj) {
        syncMediaToActiveTarget(targetObj.id);
      }
    }
  }, [detectedIndices, campaign, syncMediaToActiveTarget]);

  // 4. Manual Audio Unblock Trigger
  const resumeAudio = useCallback(() => {
    if (activeTargetIndex === null || !campaign) return;
    const targets = normalizeTargets(campaign);
    const targetObj = targets[activeTargetIndex];
    if (!targetObj) return;

    let anyStarted = false;
    playersMapRef.current.forEach((player, key) => {
      const [owningTargetId] = key.split(":");
      if (owningTargetId === targetObj.id) {
        player.play().then((started) => {
          if (started) {
            setAudioPlaying(true);
            setAudioBlocked(false);
            anyStarted = true;
          }
        });
      }
    });

    if (anyStarted) {
      setAudioBlocked(false);
    }
  }, [activeTargetIndex, campaign]);

  // 5. DOM-Based Scene Assembly (No innerHTML injection)
  const buildAndMountScene = useCallback(
    (camp: Campaign, targets: TargetItem[], mindUrl: string, currentSession: number) => {
      const container = holderRef.current;
      if (!container || sessionTokenRef.current !== currentSession) return;

      container.innerHTML = "";

      // Create <a-scene>
      const scene = document.createElement("a-scene");
      scene.setAttribute(
        "mindar-image",
        `imageTargetSrc: ${mindUrl}; uiScanning: no; uiLoading: no; uiError: no; filterMinCF: 0.0001; filterBeta: 0.001`,
      );
      scene.setAttribute("color-space", "sRGB");
      scene.setAttribute("renderer", "colorManagement: true");
      scene.setAttribute("vr-mode-ui", "enabled: false");
      scene.setAttribute("device-orientation-permission-ui", "enabled: false");
      scene.setAttribute("embedded", "");

      // Create <a-assets>
      const assets = document.createElement("a-assets");
      assets.setAttribute("timeout", "8000");

      // 1. Cover images for 3D cylinder models
      targets.forEach((t) => {
        const safeImgUrl = sanitizeAssetUrl(t.image);
        if (safeImgUrl) {
          const imgEl = document.createElement("img");
          imgEl.id = `asset-cover-${t.id}`;
          imgEl.crossOrigin = "anonymous";
          imgEl.src = safeImgUrl;
          assets.appendChild(imgEl);
        }
      });

      // 2. Video and Image assets for layers
      const visibleLayers = camp.layers.filter((l) => l.visible);

      visibleLayers.forEach((l) => {
        const safeSrc = sanitizeAssetUrl(l.src);
        if (!safeSrc) return;

        if (l.type === "video") {
          const v = document.createElement("video");
          v.id = `asset-video-${l.id}`;
          v.setAttribute("data-target-id", l.targetId || targets[0]?.id || "");
          v.crossOrigin = "anonymous";
          v.muted = true;
          v.playsInline = true;
          v.setAttribute("webkit-playsinline", "");
          if (l.loop ?? true) v.loop = true;
          v.preload = "auto";
          v.src = safeSrc;

          videoElementsMapRef.current.set(l.id, v);
          assets.appendChild(v);
        } else if (l.type === "image") {
          const img = document.createElement("img");
          img.id = `asset-img-${l.id}`;
          img.crossOrigin = "anonymous";
          img.src = safeSrc;
          assets.appendChild(img);
        }
      });

      scene.appendChild(assets);

      // Create <a-camera>
      const camera = document.createElement("a-camera");
      camera.setAttribute("position", "0 0 0");
      camera.setAttribute("look-controls", "enabled: false");
      scene.appendChild(camera);

      // Build Audio Players for visible audio layers
      visibleLayers.forEach((l) => {
        if (l.type === "audio" && l.src) {
          const safeAudioSrc = sanitizeAssetUrl(l.src);
          if (safeAudioSrc) {
            const playerKey = `${l.targetId || targets[0]?.id || "target-1"}:${l.id}`;
            const playerInstance = createPlayer(safeAudioSrc, l.loop ?? true);
            playersMapRef.current.set(playerKey, playerInstance);
          }
        }
      });

      // Create target entities
      targets.forEach((targetItem, targetIdx) => {
        const targetEntity = document.createElement("a-entity");
        targetEntity.id = `ar-target-${targetIdx}`;
        targetEntity.setAttribute("mindar-image-target", `targetIndex: ${targetIdx}`);

        // Filter visual layers belonging to this target
        const targetLayers = visibleLayers.filter(
          (l) =>
            l.type !== "audio" &&
            (l.targetId === targetItem.id || (!l.targetId && targetIdx === 0)),
        );

        targetLayers.forEach((l, layerIdx) => {
          const wrapper = document.createElement("a-entity");
          const safeX = sanitizeNumber(l.x, 0, -5, 5);
          const safeY = sanitizeNumber(l.y, 0, -5, 5);
          const safeZ = 0.01 * (layerIdx + 1);
          const safeRot = sanitizeNumber(l.rotation, 0, -360, 360);
          const safeScale = sanitizeNumber(l.scale, 1, 0.05, 10);
          const safeW = sanitizeNumber(l.w, 0.8, 0.05, 5) * safeScale;
          const safeOpacity = sanitizeNumber(l.opacity, 1, 0, 1);

          wrapper.setAttribute("position", `${safeX} ${safeY} ${safeZ}`);
          wrapper.setAttribute("rotation", `0 0 ${safeRot}`);

          if (l.type === "video") {
            const vPlane = document.createElement("a-plane");
            vPlane.classList.add("vplane");
            vPlane.setAttribute("data-vid", `asset-video-${l.id}`);
            vPlane.setAttribute("width", safeW.toString());
            vPlane.setAttribute("height", (safeW * 0.5625).toString());

            if (l.chroma?.enabled) {
              const safeChromaColor = sanitizeColor(l.chroma.color, "#00ff00");
              const safeThreshold = sanitizeNumber(l.chroma.threshold, 0.4, 0, 1);
              vPlane.setAttribute(
                "material",
                `shader: chromakey; src: #asset-video-${l.id}; color: ${safeChromaColor}; threshold: ${safeThreshold}; opacity: ${safeOpacity}`,
              );
            } else {
              vPlane.setAttribute(
                "material",
                `src: #asset-video-${l.id}; transparent: true; opacity: ${safeOpacity}`,
              );
            }
            wrapper.appendChild(vPlane);
          } else if (l.type === "image") {
            const aImg = document.createElement("a-image");
            aImg.setAttribute("src", `#asset-img-${l.id}`);
            aImg.setAttribute("width", safeW.toString());
            aImg.setAttribute("height", safeW.toString());
            aImg.setAttribute("opacity", safeOpacity.toString());
            wrapper.appendChild(aImg);
          } else if (l.type === "model") {
            if (l.modelKind === "sleeve") {
              const box = document.createElement("a-box");
              box.setAttribute("src", `#asset-cover-${targetItem.id}`);
              box.setAttribute("width", safeW.toString());
              box.setAttribute("height", safeW.toString());
              box.setAttribute("depth", "0.02");
              box.setAttribute("opacity", safeOpacity.toString());
              if (l.spin) {
                box.setAttribute(
                  "animation",
                  "property: rotation; from: 0 -25 0; to: 0 25 0; dir: alternate; loop: true; dur: 2000; easing: easeInOutSine",
                );
              }
              wrapper.appendChild(box);
            } else {
              // Vinyl Model
              const modelGroup = document.createElement("a-entity");
              if (l.spin) {
                modelGroup.setAttribute(
                  "animation",
                  "property: rotation; to: 0 0 -360; loop: true; dur: 3000; easing: linear",
                );
              }
              const outerCylinder = document.createElement("a-cylinder");
              outerCylinder.setAttribute("radius", (safeW / 2).toString());
              outerCylinder.setAttribute("height", "0.01");
              outerCylinder.setAttribute("rotation", "90 0 0");
              outerCylinder.setAttribute("color", "#111111");
              outerCylinder.setAttribute("opacity", safeOpacity.toString());
              outerCylinder.setAttribute("segments-radial", "64");

              const innerCylinder = document.createElement("a-cylinder");
              innerCylinder.setAttribute("radius", (safeW * 0.18).toString());
              innerCylinder.setAttribute("height", "0.012");
              innerCylinder.setAttribute("rotation", "90 0 0");
              innerCylinder.setAttribute("src", `#asset-cover-${targetItem.id}`);
              innerCylinder.setAttribute("opacity", safeOpacity.toString());
              innerCylinder.setAttribute("segments-radial", "48");

              modelGroup.appendChild(outerCylinder);
              modelGroup.appendChild(innerCylinder);
              wrapper.appendChild(modelGroup);
            }
          } else if (l.type === "cta") {
            const safeColor = sanitizeColor(l.color, "#1ed760");
            const safeLabel = sanitizeText(l.label, "Open");
            const safeUrl = sanitizeCtaUrl(l.url);

            const ctaPlane = document.createElement("a-plane");
            ctaPlane.setAttribute("width", safeW.toString());
            ctaPlane.setAttribute("height", (safeW / 4).toString());
            ctaPlane.setAttribute("color", safeColor);
            ctaPlane.setAttribute("opacity", safeOpacity.toString());

            const ctaText = document.createElement("a-text");
            ctaText.setAttribute("value", safeLabel);
            ctaText.setAttribute("align", "center");
            ctaText.setAttribute("color", "#111111");
            ctaText.setAttribute("width", (safeW * 2.4).toString());
            ctaText.setAttribute("position", "0 0 0.005");

            wrapper.appendChild(ctaPlane);
            wrapper.appendChild(ctaText);

            if (safeUrl) {
              wrapper.setAttribute("class", "clickable");
              const onCtaClick = () => {
                window.open(safeUrl, "_blank", "noopener,noreferrer");
              };
              wrapper.addEventListener("click", onCtaClick);
              listenersCleanupRef.current.push(() => {
                wrapper.removeEventListener("click", onCtaClick);
              });
            }
          }

          targetEntity.appendChild(wrapper);
        });

        // Register Target Detection Events
        const onTargetFound = () => {
          if (sessionTokenRef.current !== currentSession) return;
          setPhase("found");
          setDetectedIndices((prev) => new Set(prev).add(targetIdx));
        };

        const onTargetLost = () => {
          if (sessionTokenRef.current !== currentSession) return;
          setDetectedIndices((prev) => {
            const next = new Set(prev);
            next.delete(targetIdx);
            if (next.size === 0) {
              setPhase("searching");
            }
            return next;
          });
        };

        targetEntity.addEventListener("targetFound", onTargetFound);
        targetEntity.addEventListener("targetLost", onTargetLost);

        listenersCleanupRef.current.push(() => {
          targetEntity.removeEventListener("targetFound", onTargetFound);
          targetEntity.removeEventListener("targetLost", onTargetLost);
        });

        scene.appendChild(targetEntity);
      });

      // Video aspect ratio auto-adjust on metadata load or if already cached
      videoElementsMapRef.current.forEach((v) => {
        const updatePlaneAspect = () => {
          if (sessionTokenRef.current !== currentSession) return;
          const plane = scene.querySelector(`[data-vid="${v.id}"]`) as AframeEntity | null;
          if (plane && v.videoWidth && v.videoHeight) {
            const currentW = Number(plane.getAttribute("width")) || 1;
            plane.setAttribute("height", ((currentW * v.videoHeight) / v.videoWidth).toString());
          }
        };

        if (v.videoWidth && v.videoHeight) {
          updatePlaneAspect();
        }
        v.addEventListener("loadedmetadata", updatePlaneAspect);
        listenersCleanupRef.current.push(() => {
          v.removeEventListener("loadedmetadata", updatePlaneAspect);
        });
      });

      // Scene error handler
      const onArError = (evt: unknown) => {
        if (sessionTokenRef.current !== currentSession) return;
        console.error("MindAR runtime error:", evt);
        setPhase("error");
        setErrorDetails({
          title: "Camera Tracking Failure",
          message: "The WebAR engine encountered an error running image tracking on this device.",
          canRetry: true,
        });
      };
      scene.addEventListener("arError", onArError);
      listenersCleanupRef.current.push(() => {
        scene.removeEventListener("arError", onArError);
      });

      // Mount into container
      container.appendChild(scene);
      mountedSceneRef.current = scene;
      setPhase("searching");
    },
    [],
  );

  // 6. Unified Camera & Tracker Start Lifecycle
  const startScanner = async () => {
    if (!campaign || isStartingRef.current) return;
    isStartingRef.current = true;

    // Reset previous session
    teardownSession();
    const currentSession = sessionTokenRef.current;

    // Check secure context (HTTPS or localhost)
    if (
      !window.isSecureContext &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      isStartingRef.current = false;
      setPhase("error");
      setErrorDetails({
        title: "Insecure Context",
        message:
          "WebAR camera access requires a secure connection (HTTPS). Please open this site over HTTPS.",
        canRetry: false,
      });
      return;
    }

    // Check navigator.mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      isStartingRef.current = false;
      setPhase("error");
      setErrorDetails({
        title: "Camera API Unsupported",
        message:
          "Your browser does not support mediaDevices.getUserMedia. Please open this page in Chrome or Safari.",
        canRetry: false,
      });
      return;
    }

    // Check WebGL support
    try {
      const testCanvas = document.createElement("canvas");
      const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
      if (!gl) {
        throw new Error("WebGL context unavailable");
      }
    } catch {
      isStartingRef.current = false;
      setPhase("error");
      setErrorDetails({
        title: "WebGL Not Supported",
        message: "WebGL acceleration is disabled or unsupported by your graphics hardware/browser.",
        canRetry: false,
      });
      return;
    }

    setPhase("preparing");
    setProgress(0);

    try {
      const targets = normalizeTargets(campaign);
      if (targets.length === 0) {
        throw new Error("No target artwork defined for this album.");
      }

      // 1. Load A-Frame & MindAR libraries
      await loadAframe();
      if (sessionTokenRef.current !== currentSession) return;

      // 2. Fetch or Compile `.mind` tracker
      const cachedMind = await getMindRecord(campaign.id);
      let mindBuf: ArrayBuffer | undefined;
      if (cachedMind && (cachedMind.source === campaign.mindUrl || !campaign.mindUrl)) {
        mindBuf = cachedMind.buffer;
      }

      // Verify cached blob against campaign mindUrl
      if (!mindBuf && campaign.mindUrl) {
        try {
          const res = await fetch(campaign.mindUrl);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            if (buf.byteLength > 100) {
              mindBuf = buf;
              await saveMind(campaign.id, buf, false, campaign.mindUrl);
            }
          }
        } catch (fetchErr) {
          console.warn("Could not fetch remote mindUrl, falling back to compiler:", fetchErr);
        }
      }

      // Compile if no valid buffer exists
      if (!mindBuf) {
        const targetSrcs = targets.map((t) => t.image);
        const compileRes = await compileMultipleTargets(targetSrcs, (p) => {
          if (sessionTokenRef.current === currentSession) {
            setProgress(Math.round(p));
          }
        });
        if (sessionTokenRef.current !== currentSession) return;
        mindBuf = compileRes.buffer;
        await saveMind(campaign.id, mindBuf);
      }

      if (sessionTokenRef.current !== currentSession) return;

      const blobUrl = URL.createObjectURL(new Blob([mindBuf]));
      blobUrlsRef.current.push(blobUrl);

      // 3. Assemble and Mount DOM Elements
      buildAndMountScene(campaign, targets, blobUrl, currentSession);
    } catch (err) {
      if (sessionTokenRef.current !== currentSession) return;
      console.error("Scanner startup error:", err);

      const errName = err instanceof Error ? err.name : "";
      const errMsg = err instanceof Error ? err.message : "";

      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        setPhase("denied");
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        setPhase("error");
        setErrorDetails({
          title: "Camera Busy or In Use",
          message:
            "Another application is currently using your device camera. Please close it and tap retry.",
          canRetry: true,
        });
      } else {
        setPhase("error");
        setErrorDetails({
          title: "Initialization Failed",
          message: errMsg || "Failed to initialize WebAR. Please check your network and try again.",
          canRetry: true,
        });
      }
    } finally {
      isStartingRef.current = false;
    }
  };

  const targets = campaign ? normalizeTargets(campaign) : [];
  const currentTarget = activeTargetIndex !== null ? targets[activeTargetIndex] : targets[0];
  const active = phase === "searching" || phase === "found";

  // Active CTAs for currently locked target
  const activeCtas =
    campaign?.layers.filter(
      (l) =>
        l.type === "cta" &&
        l.visible &&
        (activeTargetIndex === null || l.targetId === currentTarget?.id),
    ) ?? [];

  return (
    <main className="fixed inset-0 overflow-hidden bg-ink text-paper font-poppins">
      {/* MindAR/A-Frame DOM Holder */}
      <div
        ref={holderRef}
        className="absolute inset-0 [&_a-scene]:!absolute [&_a-scene]:!inset-0 [&_video]:object-cover"
      />

      {/* Persistent Navigation */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-paper/30 bg-ink/75 text-paper hover:bg-paper hover:text-ink backdrop-blur"
          asChild
        >
          <Link to="/">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
          </Link>
        </Button>
      </div>

      {/* Active Scanning HUD */}
      {active && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-between p-5 pt-16">
          <div className="flex flex-col items-center gap-1.5">
            <span
              className={`border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                phase === "found"
                  ? "border-paper bg-paper text-ink"
                  : "border-paper/40 bg-ink/80 text-paper"
              }`}
            >
              {phase === "found"
                ? `● Locked: ${currentTarget?.name || "Target"}`
                : `Scanning album (${targets.length} target${targets.length > 1 ? "s" : ""})…`}
            </span>
          </div>

          {phase === "searching" && (
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative w-[70%] max-w-xs border-2 border-dashed border-paper/60"
                style={{ aspectRatio: `1 / ${currentTarget?.aspect || 1}` }}
              >
                {currentTarget && (
                  <img
                    src={currentTarget.image}
                    alt=""
                    className="h-full w-full object-cover opacity-30 select-none pointer-events-none"
                  />
                )}
                <div className="absolute inset-x-0 h-0.5 animate-scanline bg-paper" />
              </div>
              {targets.length > 1 && (
                <div className="flex gap-1.5 p-1 bg-ink/80 border border-paper/20 pointer-events-auto">
                  {targets.slice(0, 8).map((t, idx) => (
                    <div
                      key={t.id}
                      className={`w-8 h-8 border overflow-hidden transition ${
                        detectedIndices.has(idx)
                          ? "border-paper ring-1 ring-paper"
                          : "border-paper/30 opacity-60"
                      }`}
                      title={t.name}
                    >
                      <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {targets.length > 8 && (
                    <div className="w-8 h-8 flex items-center justify-center text-[10px] border border-paper/30 bg-ink text-paper font-bold">
                      +{targets.length - 8}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bottom HUD: Prompts, Audio recovery, and CTAs */}
          <div className="pointer-events-auto flex w-full max-w-md flex-col gap-2">
            {phase === "searching" && (
              <p className="border border-paper/20 bg-ink/90 p-2.5 text-center text-xs text-paper/80">
                Point at any of this album's {targets.length} targets to play audio and 3D overlays.
              </p>
            )}

            {phase === "found" && (
              <>
                {audioBlocked ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-paper bg-paper text-ink hover:bg-paper/90 font-bold animate-pulse"
                    onClick={resumeAudio}
                  >
                    <VolumeX className="mr-1.5 h-4 w-4" /> Tap to Unmute &amp; Play Audio
                  </Button>
                ) : (
                  audioPlaying && (
                    <p className="flex items-center justify-center gap-1.5 text-xs text-paper/80 bg-ink/60 border border-paper/20 py-1">
                      <Volume2 className="h-3.5 w-3.5" /> Now playing
                    </p>
                  )
                )}

                {activeCtas.map((l) => {
                  const safeUrl = sanitizeCtaUrl(l.url);
                  if (!safeUrl) return null;
                  return (
                    <a
                      key={l.id}
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-3 text-center text-sm font-bold border border-paper bg-paper text-ink transition hover:bg-paper/90"
                    >
                      {sanitizeText(l.label, "Open Link")}
                    </a>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* Non-Active Overlay States */}
      {!active && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-paper text-ink">
          <div className="w-full max-w-sm border border-ink/20 p-8 text-center space-y-4">
            {/* Album Cover Preview */}
            {campaign && (
              <div className="space-y-2">
                <div className="mx-auto w-36 h-36 border border-ink/20 p-1 mb-2 bg-paper">
                  <img
                    src={targets[0]?.image || campaign.targetImage}
                    alt={campaign.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                {targets.length > 1 && (
                  <p className="text-xs font-semibold text-ink/70">
                    Album contains {targets.length} interactive targets
                  </p>
                )}
              </div>
            )}

            {/* Intro Phase */}
            {phase === "intro" && campaign && (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                  Unified AR Scanner
                </p>
                <h1 className="font-poppins text-2xl font-extrabold text-ink">{campaign.name}</h1>
                <p className="text-sm text-ink/70">{campaign.artist}</p>
                <div className="pt-2">
                  <Button
                    size="lg"
                    className="w-full bg-ink text-paper hover:bg-ink/85 font-bold"
                    onClick={startScanner}
                  >
                    <Camera className="mr-2 h-4 w-4" /> Start AR experience
                  </Button>
                </div>
                <p className="text-xs text-ink/55 leading-relaxed pt-2">
                  Camera permission will be requested by MindAR to detect physical artwork in real
                  time.
                </p>
              </>
            )}

            {/* Preparing Phase */}
            {phase === "preparing" && (
              <div className="space-y-3 py-4">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-ink" />
                <p className="text-sm font-semibold">
                  Preparing AR tracker ({targets.length} targets)…
                </p>
                {progress > 0 && progress < 100 && <Progress value={progress} />}
                <p className="text-[11px] text-ink/50">Compiling and launching camera viewport</p>
              </div>
            )}

            {/* Permission Denied Phase */}
            {phase === "denied" && (
              <div className="space-y-3">
                <CameraOff className="mx-auto h-8 w-8 text-ink" />
                <h2 className="text-lg font-bold">Camera Access Required</h2>
                <p className="text-xs text-ink/60 leading-relaxed">
                  Your device or browser blocked camera access. Tap the lock/settings icon in the
                  browser address bar, enable the camera permission, and click retry below.
                </p>
                <Button
                  onClick={startScanner}
                  className="w-full bg-ink text-paper hover:bg-ink/85 font-semibold"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Try Camera Again
                </Button>
              </div>
            )}

            {/* General Error Phase */}
            {phase === "error" && (
              <div className="space-y-3">
                <AlertTriangle className="mx-auto h-8 w-8 text-ink" />
                <h2 className="text-lg font-bold">{errorDetails?.title || "AR couldn't start"}</h2>
                <p className="text-xs text-ink/60 leading-relaxed">
                  {errorDetails?.message ||
                    "Your browser or hardware could not start the AR camera. Try opening in Chrome or Safari."}
                </p>
                {errorDetails?.canRetry !== false && (
                  <Button
                    onClick={startScanner}
                    className="w-full bg-ink text-paper hover:bg-ink/85"
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
                  </Button>
                )}
                <Button
                  variant="outline"
                  asChild
                  className="w-full border-ink/20 text-ink hover:bg-ink/5"
                >
                  <Link to="/studio/$id" params={{ id }}>
                    <ScanLine className="mr-2 h-4 w-4" /> Open Studio Simulator
                  </Link>
                </Button>
              </div>
            )}

            {/* Missing Album Phase */}
            {phase === "missing" && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold">Album not found</h2>
                <p className="text-sm text-ink/60">This album doesn't exist or has been removed.</p>
                <Button asChild className="w-full bg-ink text-paper hover:bg-ink/85">
                  <Link to="/scan/$id" params={{ id: "demo-night-drive" }} reloadDocument>
                    Scan Demo Album
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
