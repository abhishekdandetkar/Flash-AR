import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Disc3,
  Instagram,
  Layers,
  LogOut,
  Plus,
  QrCode,
  ScanLine,
  Sparkles,
  Trash2,
  Twitter,
  Wand2,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { seedDemos } from "@/lib/demos";
import {
  deleteCampaign,
  listCampaigns,
  readFile,
  saveCampaign,
  uid,
  type Campaign,
} from "@/lib/store";
import { loadImage } from "@/lib/mindar";
import { canonicalLinks } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flash AR — Album cover WebAR studio" },
      {
        name: "description",
        content:
          "Turn album covers, vinyl sleeves and photo albums into interactive WebAR experiences — compiled in the browser, published with a QR.",
      },
      { property: "og:title", content: "Flash AR — Album cover WebAR studio" },
      {
        property: "og:description",
        content: "Make vinyl sleeves and photo albums come alive with browser AR — no app install.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: canonicalLinks("/"),
  }),
  component: Index,
});

function Index() {
  const [items, setItems] = useState<Campaign[] | null>(null);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  const refresh = () => listCampaigns().then(setItems);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data: { user: { id: string; email: string } | null }) => {
        if (data.user) {
          nav({ to: "/dashboard", replace: true });
          return;
        }
        setUser(null);
      })
      .catch(() => {
        setUser(null);
      });
    seedDemos().then(refresh);
  }, [nav]);

  const create = async (f: File) => {
    const src = await readFile(f);
    const img = await loadImage(src);
    const c: Campaign = {
      id: uid(),
      name: f.name.replace(/\.[^.]+$/, ""),
      artist: "Untitled artist",
      kind: "album",
      targetImage: src,
      aspect: img.height / img.width,
      layers: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveCampaign(c);
    toast.success("Album created");
    nav({ to: "/studio/$id", params: { id: c.id } });
  };

  const pickFile = () => (user ? fileRef.current?.click() : nav({ to: "/auth" }));

  const signOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    refresh();
  };

  const demos = items?.filter((c) => c.isDemo) ?? [];
  const mine = items?.filter((c) => !c.isDemo) ?? [];

  return (
    <main className="font-poppins">
      {/* ——— Hero · black ——— */}
      <section className="bg-ink text-paper">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Disc3 className="h-6 w-6" /> Flash AR
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden text-xs text-paper/60 sm:block">{user.email}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-paper/40 bg-transparent text-paper hover:bg-paper/10"
                  asChild
                >
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-paper/40 bg-transparent text-paper hover:bg-paper/10"
                  onClick={signOut}
                >
                  <LogOut /> Sign out
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-paper/40 bg-transparent text-paper hover:bg-paper/10"
                asChild
              >
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
            <Button size="sm" className="bg-paper text-ink hover:bg-paper/85" onClick={pickFile}>
              <Plus /> New album
            </Button>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-6 pb-20 pt-14 md:pb-28 md:pt-20">
          <p className="mb-5 inline-flex items-center gap-2 border border-paper/30 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-paper/80">
            <ScanLine className="h-3.5 w-3.5" /> WebAR · No app install
          </p>
          <h1 className="font-poppins max-w-3xl text-4xl font-extrabold leading-[1.05] md:text-6xl">
            Make every sleeve play when the camera finds it.
          </h1>
          <p className="mt-6 max-w-xl text-base text-paper/70 md:text-lg">
            Flash AR turns album covers, vinyl sleeves and photo albums into interactive AR
            experiences. Compile in your browser, layer video, audio and 3D on top, then publish a
            scannable QR.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button size="lg" className="bg-paper text-ink hover:bg-paper/85" onClick={pickFile}>
              <Wand2 /> Upload album artwork
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-paper/40 bg-transparent text-paper hover:bg-paper/10"
              asChild
            >
              <Link to="/studio/$id" params={{ id: "demo-night-drive" }}>
                See a live demo
              </Link>
            </Button>
          </div>
          {!user && (
            <p className="mt-5 text-xs text-paper/50">
              Creating an album needs a quick sign-in — scanning a QR stays open to everyone.
            </p>
          )}
          <div className="mt-14 grid gap-6 border-t border-paper/15 pt-8 sm:grid-cols-3">
            {[
              ["100% in-browser", "Targets compile on your device — nothing to install."],
              ["Any phone, any camera", "Runs in mobile Safari and Chrome via WebAR."],
              ["QR in one tap", "Print-ready scan cards for sleeves, liner notes and posters."],
            ].map(([t, d]) => (
              <div key={t}>
                <p className="text-sm font-semibold">{t}</p>
                <p className="mt-1 text-xs text-paper/60">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— Features · white ——— */}
      <section id="features" className="bg-paper text-ink">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <h2 className="font-poppins text-3xl font-extrabold md:text-4xl">
            Everything an album needs to come alive
          </h2>
          <p className="mt-4 max-w-xl text-ink/60">
            A complete studio for image-tracked AR — from raw artwork to a printed QR on the record
            sleeve.
          </p>
          <div className="mt-12 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "In-browser compiler",
                body: "Your artwork becomes an AR target right on the device, with a live progress bar, feature-point preview and a quality score.",
              },
              {
                icon: Layers,
                title: "Multi-layer studio",
                body: "Stack music video, playable audio, a spinning 3D vinyl and floating CTA badges — each with scale, position, rotation and opacity controls.",
              },
              {
                icon: Camera,
                title: "Instant simulator",
                body: "Test tracking lock and overlays without leaving the studio. What you see is exactly what your fans will see.",
              },
              {
                icon: QrCode,
                title: "QR publishing",
                body: "Download the QR or print a full campaign card with the artwork and scan code for physical releases.",
              },
              {
                icon: ScanLine,
                title: "Public scanner",
                body: "Every album gets a shareable link. Fans point their camera at the cover — no account, no download.",
              },
              {
                icon: Disc3,
                title: "Cloud-hosted albums",
                body: "Albums are saved to your account, so the same QR keeps working on every phone, every time.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-paper p-8">
                <Icon className="h-6 w-6" />
                <h3 className="font-poppins mt-4 text-base font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— How it works · black ——— */}
      <section id="how-it-works" className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <h2 className="font-poppins text-3xl font-extrabold md:text-4xl">
            From artwork to AR in three steps
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              [
                "01",
                "Upload the artwork",
                "Drop in a cover, sleeve or photo-album page. The compiler rates tracking quality as it runs.",
              ],
              [
                "02",
                "Stack your layers",
                "Add video, audio, 3D vinyl and CTA badges, then fine-tune every layer in the editor and simulator.",
              ],
              [
                "03",
                "Print the QR",
                "Publish and download a print-ready card. Fans scan the sleeve and the album plays in their camera.",
              ],
            ].map(([n, t, d]) => (
              <div key={n} className="border-l-2 border-paper/25 pl-6">
                <p className="text-4xl font-extrabold text-paper/30">{n}</p>
                <h3 className="font-poppins mt-3 text-lg font-bold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper/60">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— Demos · white ——— */}
      <section className="bg-paper text-ink">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <h2 className="font-poppins text-3xl font-extrabold md:text-4xl">Try a demo right now</h2>
          <p className="mt-4 max-w-xl text-ink/60">
            Two ready-made albums you can open in the studio or scan on your phone — no sign-up
            needed.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {demos.map((c) => (
              <article key={c.id} className="group border border-ink/15">
                <Link
                  to="/studio/$id"
                  params={{ id: c.id }}
                  className="block aspect-square overflow-hidden"
                >
                  <img
                    src={c.targetImage}
                    alt={c.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                </Link>
                <div className="flex items-center justify-between gap-2 p-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold">{c.name}</h3>
                    <p className="truncate text-xs text-ink/60">
                      {c.artist} · {c.layers.length} layers
                    </p>
                  </div>
                  <Button size="sm" className="bg-ink text-paper hover:bg-ink/85" asChild>
                    <Link to="/scan/$id" params={{ id: c.id }}>
                      Scan
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>

          {user && mine.length > 0 && (
            <>
              <h2 className="font-poppins mt-20 text-2xl font-extrabold">Your albums</h2>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {mine.map((c) => (
                  <article key={c.id} className="group border border-ink/15">
                    <Link
                      to="/studio/$id"
                      params={{ id: c.id }}
                      className="block aspect-square overflow-hidden"
                    >
                      <img
                        src={c.targetImage}
                        alt={c.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </Link>
                    <div className="flex items-center justify-between gap-2 p-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold">{c.name}</h3>
                        <p className="truncate text-xs text-ink/60">
                          {c.artist} · {c.layers.length} layers
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" className="bg-ink text-paper hover:bg-ink/85" asChild>
                          <Link to="/scan/$id" params={{ id: c.id }}>
                            Scan
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete"
                          onClick={() => deleteCampaign(c.id).then(refresh)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ——— CTA · black ——— */}
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center md:py-24">
          <h2 className="font-poppins mx-auto max-w-2xl text-3xl font-extrabold md:text-5xl">
            Ready to make your cover come alive?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-paper/70">
            Upload your artwork and publish your first AR album in minutes.
          </p>
          <Button size="lg" className="mt-8 bg-paper text-ink hover:bg-paper/85" onClick={pickFile}>
            <Plus /> Create your album
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && create(e.target.files[0])}
          />
        </div>
      </section>

      {/* ——— Footer · black ——— */}
      <footer className="border-t border-paper/15 bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <Disc3 className="h-6 w-6" /> Flash AR
            </div>
            <p className="mt-3 text-xs leading-relaxed text-paper/60">
              Image-tracked WebAR for album covers, vinyl sleeves and photo albums. No app install —
              just a scan.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/50">
              Product
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href="#features" className="text-paper/80 hover:text-paper">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-paper/80 hover:text-paper">
                  How it works
                </a>
              </li>
              <li>
                <Link
                  to="/studio/$id"
                  params={{ id: "demo-night-drive" }}
                  className="text-paper/80 hover:text-paper"
                >
                  Live demo
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-paper/80 hover:text-paper">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/50">
              Support
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link to="/contact" className="text-paper/80 hover:text-paper">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-paper/80 hover:text-paper">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-paper/80 hover:text-paper">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="text-paper/80 hover:text-paper">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="text-paper/80 hover:text-paper">
                  Forgot password
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-paper/80 hover:text-paper">
                  Create account
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/50">Follow</p>
            <div className="mt-4 flex gap-3">
              {[Instagram, Twitter, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="border border-paper/25 p-2 text-paper/70 hover:text-paper"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-paper/15">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-5 text-xs text-paper/50">
            <p>© {new Date().getFullYear()} Flash AR. All rights reserved.</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/privacy-policy" className="hover:text-paper">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-paper">
                Terms &amp; Conditions
              </Link>
              <Link to="/refund-policy" className="hover:text-paper">
                Refund Policy
              </Link>
              <Link to="/contact" className="hover:text-paper">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
