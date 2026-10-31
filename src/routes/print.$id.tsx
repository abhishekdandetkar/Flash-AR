import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, Printer, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seedDemos } from "@/lib/demos";
import { getCampaign, normalizeTargets, type Campaign } from "@/lib/store";

export const Route = createFileRoute("/print/$id")({
  head: () => ({
    meta: [
      { title: "Printable campaign flyer — Flash AR" },
      { name: "description", content: "Print a flyer with the album artwork and scan QR code." },
      { property: "og:title", content: "Printable campaign flyer — Flash AR" },
      { property: "og:description", content: "Album artwork plus scan-to-play QR code." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrintPage,
});

function PrintPage() {
  const { id } = Route.useParams();
  const [c, setC] = useState<Campaign | null>();
  const [qr, setQr] = useState("");

  useEffect(() => {
    seedDemos()
      .then(() => getCampaign(id))
      .then((x) => setC(x ?? null));
    QRCode.toDataURL(`${window.location.origin}/scan/${id}`, { width: 600, margin: 1 }).then(setQr);
  }, [id]);

  if (!c) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-ink font-poppins">
        <p className="text-sm text-ink/60">{c === null ? "Album not found" : "Loading flyer…"}</p>
      </div>
    );
  }

  const targets = normalizeTargets(c);

  return (
    <main className="min-h-screen bg-paper text-ink p-6 font-poppins print:p-0 print:bg-white print:text-black">
      <div className="mx-auto mb-6 flex max-w-[560px] items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-ink/20 text-ink hover:bg-ink hover:text-paper"
            asChild
          >
            <Link to="/studio/$id" params={{ id }}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Studio
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="text-ink/60 hover:text-ink text-xs" asChild>
            <Link to="/dashboard">
              <LayoutDashboard className="mr-1 h-3.5 w-3.5" /> Dashboard
            </Link>
          </Button>
        </div>
        <Button onClick={() => window.print()} className="bg-ink text-paper hover:bg-ink/85">
          <Printer className="mr-1.5 h-4 w-4" /> Print flyer
        </Button>
      </div>
      <article className="mx-auto max-w-[560px] overflow-hidden border border-ink/20 bg-paper print:border-0">
        <img src={targets[0]?.image || c.targetImage} alt={c.name} className="block w-full" />

        {targets.length > 1 && (
          <div className="p-4 bg-muted/20 border-t border-ink/10 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink/60">
              Interactive Targets in this Album ({targets.length}):
            </p>
            <div className="grid grid-cols-4 gap-2">
              {targets.map((t, idx) => (
                <div key={t.id} className="border border-ink/20 p-1 bg-paper text-center">
                  <div className="aspect-square overflow-hidden mb-1">
                    <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[10px] font-semibold truncate">
                    #{idx + 1} {t.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-6 p-8 border-t border-ink/10">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-ink/60">Scan to play</p>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight text-ink">{c.name}</h1>
            <p className="text-sm text-ink/70">{c.artist}</p>
            <ol className="mt-4 list-decimal space-y-1 pl-4 text-xs text-ink/60">
              <li>Scan the QR with your phone camera</li>
              <li>Allow camera access</li>
              <li>
                {targets.length > 1
                  ? `Point at any of this album's ${targets.length} targets to play`
                  : "Point it at the cover and watch it come alive"}
              </li>
            </ol>
          </div>
          {qr && (
            <div className="border border-ink/20 p-2 bg-paper shrink-0">
              <img src={qr} alt="QR code" className="w-32 h-32 block" />
            </div>
          )}
        </div>
      </article>
    </main>
  );
}
