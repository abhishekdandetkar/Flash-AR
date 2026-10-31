import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Disc3,
  LogOut,
  Plus,
  Trash2,
  Wand2,
  Layers,
  ArrowRight,
  Eye,
  Calendar,
  LayoutDashboard,
  FolderOpen,
  Sparkles,
  HelpCircle,
  FileText,
  Shield,
  RotateCcw,
  Menu,
  X,
  ExternalLink,
  UploadCloud,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { seedDemos } from "@/lib/demos";
import {
  deleteCampaign,
  listCampaigns,
  readFile,
  saveCampaign,
  uid,
  type Campaign,
} from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { loadImage } from "@/lib/mindar";
import defaultCover from "@/assets/demo-synthwave.jpg";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Flash AR" },
      {
        name: "description",
        content: "Manage your AR album campaigns, create new experiences, and view stats.",
      },
      { property: "og:title", content: "Dashboard — Flash AR" },
      { property: "og:description", content: "Manage your AR album campaigns." },
    ],
  }),
  component: Dashboard,
});

type DashboardTab = "all" | "campaigns" | "demos" | "support";

function Dashboard() {
  const [items, setItems] = useState<Campaign[] | null>(null);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Create Album modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [albumName, setAlbumName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  const refresh = () => listCampaigns().then(setItems);

  useEffect(() => {
    seedDemos().then(refresh);

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        nav({ to: "/auth", replace: true });
        return;
      }
      setUser({ email: data.session.user.email ?? "Account" });
      refresh();
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        nav({ to: "/auth", replace: true });
      } else if (session) {
        setUser({ email: session.user.email ?? "admin" });
        refresh();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [nav]);

  const openCreateModal = () => {
    setAlbumName("");
    setArtistName("");
    setSelectedFile(null);
    setPreviewSrc(null);
    setCreateModalOpen(true);
    setSidebarOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const dataUrl = await readFile(file);
      setPreviewSrc(dataUrl);
      if (!albumName.trim()) {
        setAlbumName(file.name.replace(/\.[^.]+$/, ""));
      }
    }
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!albumName.trim()) {
      toast.error("Please enter an Album Name");
      return;
    }

    setSubmitting(true);
    try {
      let targetImage = defaultCover;
      let aspect = 1;

      if (selectedFile) {
        targetImage = await readFile(selectedFile);
        const img = await loadImage(targetImage);
        aspect = img.height / img.width;
      }

      const c: Campaign = {
        id: uid(),
        name: albumName.trim(),
        artist: artistName.trim() || "Untitled Artist",
        kind: "album",
        targetImage,
        aspect,
        layers: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveCampaign(c);
      toast.success(`Album "${c.name}" created!`);
      setCreateModalOpen(false);
      nav({ to: "/studio/$id", params: { id: c.id } });
    } catch {
      toast.error("Failed to create album");
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  const mine = items?.filter((c) => !c.isDemo) ?? [];
  const demos = items?.filter((c) => c.isDemo) ?? [];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper text-ink font-poppins">
        <p className="text-sm text-ink/60">Loading dashboard…</p>
      </main>
    );
  }

  const navItems: {
    id: DashboardTab;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
  }[] = [
    { id: "all", label: "Overview", icon: LayoutDashboard },
    { id: "campaigns", label: "My Campaigns", icon: FolderOpen, badge: mine.length },
    { id: "demos", label: "Demo Templates", icon: Sparkles, badge: demos.length },
    { id: "support", label: "Support & Legal", icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink font-poppins flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between border-b border-ink/15 bg-paper p-4 sticky top-0 z-40">
        <Link
          to="/dashboard"
          onClick={() => setActiveTab("all")}
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink"
        >
          <Disc3 className="h-6 w-6" /> Flash AR
        </Link>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-ink text-paper hover:bg-ink/85" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="border-ink/20 text-ink"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Navigation Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } fixed md:static inset-y-0 left-0 z-30 w-64 bg-paper border-r border-ink/15 transition-transform duration-200 ease-in-out flex flex-col justify-between shrink-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Brand Header */}
          <div className="p-6 border-b border-ink/15">
            <Link
              to="/dashboard"
              onClick={() => {
                setActiveTab("all");
                setSidebarOpen(false);
              }}
              className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-ink hover:opacity-85 transition"
            >
              <Disc3 className="h-6 w-6" /> Flash AR
            </Link>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/40">
              WebAR Studio Hub
            </p>
          </div>

          {/* Create Button in Sidebar */}
          <div className="p-4 border-b border-ink/10">
            <Button
              className="w-full bg-ink text-paper hover:bg-ink/85 flex items-center justify-center gap-2"
              onClick={openCreateModal}
            >
              <Plus className="h-4 w-4" /> Create Album
            </Button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 flex-1">
            <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-ink/40">
              Navigation
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold tracking-wide transition ${
                    active ? "bg-ink text-paper" : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" /> {item.label}
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 border ${
                        active
                          ? "border-paper text-paper bg-ink"
                          : "border-ink/20 text-ink/70 bg-paper"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-4 mt-4 border-t border-ink/10">
              <p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-ink/40">
                Quick Access
              </p>
              <Link
                to="/scan/$id"
                params={{ id: "demo-night-drive" }}
                className="flex items-center justify-between px-3 py-2 text-xs text-ink/70 hover:text-ink hover:bg-ink/5"
              >
                <span className="flex items-center gap-2.5">
                  <Eye className="h-4 w-4" /> Test Scanner
                </span>
                <ExternalLink className="h-3 w-3 text-ink/40" />
              </Link>
              <Link
                to="/contact"
                className="flex items-center justify-between px-3 py-2 text-xs text-ink/70 hover:text-ink hover:bg-ink/5"
              >
                <span className="flex items-center gap-2.5">
                  <HelpCircle className="h-4 w-4" /> Help &amp; Support
                </span>
                <ExternalLink className="h-3 w-3 text-ink/40" />
              </Link>
            </div>
          </nav>

          {/* User profile & Logout */}
          <div className="p-4 border-t border-ink/15 bg-paper">
            <div className="mb-3 px-1">
              <p className="text-[10px] uppercase font-bold tracking-widest text-ink/40">
                Signed in as
              </p>
              <p className="text-xs font-semibold text-ink truncate mt-0.5">{user?.email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-ink/20 text-ink hover:bg-ink hover:text-paper"
              onClick={signOut}
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {/* Top context header */}
          <header className="hidden md:flex items-center justify-between border-b border-ink/15 bg-paper px-8 py-4 sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-ink/40">
                Flash AR Workspace
              </span>
              <span className="text-ink/20">/</span>
              <span className="text-xs font-bold uppercase tracking-wider text-ink">
                {activeTab === "all"
                  ? "Overview"
                  : activeTab === "campaigns"
                    ? "My Campaigns"
                    : activeTab === "demos"
                      ? "Demo Templates"
                      : "Support & Legal"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="bg-ink text-paper hover:bg-ink/85"
                onClick={openCreateModal}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Album
              </Button>
            </div>
          </header>

          {/* Tab 1: Overview */}
          {activeTab === "all" && (
            <div>
              {/* Hero Banner */}
              <section className="bg-ink text-paper px-8 py-10">
                <div className="max-w-5xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/50">
                    WebAR Studio Hub
                  </p>
                  <h1 className="font-poppins text-3xl font-extrabold md:text-4xl mt-1">
                    Your AR Campaigns
                  </h1>
                  <p className="mt-2 text-sm text-paper/70 max-w-xl">
                    Create, edit, compile tracking targets, and launch image-tracked AR album
                    experiences.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-4">
                    <div className="border border-paper/20 bg-ink/60 px-5 py-3 text-center min-w-[120px]">
                      <p className="text-2xl font-extrabold">{mine.length}</p>
                      <p className="text-[11px] uppercase tracking-wider text-paper/50 mt-0.5">
                        My Albums
                      </p>
                    </div>
                    <div className="border border-paper/20 bg-ink/60 px-5 py-3 text-center min-w-[120px]">
                      <p className="text-2xl font-extrabold">{demos.length}</p>
                      <p className="text-[11px] uppercase tracking-wider text-paper/50 mt-0.5">
                        Demos
                      </p>
                    </div>
                    <div className="border border-paper/20 bg-ink/60 px-5 py-3 text-center min-w-[120px]">
                      <p className="text-2xl font-extrabold">
                        {mine.reduce((acc, curr) => acc + curr.layers.length, 0)}
                      </p>
                      <p className="text-[11px] uppercase tracking-wider text-paper/50 mt-0.5">
                        Total Layers
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* User Campaigns Preview */}
              <div className="p-8 space-y-12 max-w-6xl">
                <section>
                  <div className="flex items-center justify-between pb-4 border-b border-ink/10 mb-6">
                    <div>
                      <h2 className="font-poppins text-xl font-bold">Recent Campaigns</h2>
                      <p className="text-xs text-ink/60 mt-0.5">
                        Custom album targets created by you
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-ink text-paper hover:bg-ink/85"
                      onClick={openCreateModal}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Album
                    </Button>
                  </div>

                  {mine.length === 0 ? (
                    <div className="border border-dashed border-ink/25 p-12 text-center space-y-4">
                      <Disc3 className="mx-auto h-12 w-12 text-ink/40" />
                      <h3 className="font-poppins text-lg font-bold">No custom albums yet</h3>
                      <p className="text-sm text-ink/60 max-w-md mx-auto">
                        Create your first album and input its name to start adding AR videos,
                        spinning vinyl, and interactive audio.
                      </p>
                      <Button
                        onClick={openCreateModal}
                        className="bg-ink text-paper hover:bg-ink/85"
                      >
                        <Plus className="mr-1.5 h-4 w-4" /> Create First Album
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {mine.map((c) => (
                        <CampaignCard key={c.id} c={c} refresh={refresh} />
                      ))}
                    </div>
                  )}
                </section>

                {/* Demos Section */}
                <section>
                  <div className="pb-4 border-b border-ink/10 mb-6 flex items-center justify-between">
                    <div>
                      <h2 className="font-poppins text-xl font-bold">Demo Templates</h2>
                      <p className="text-xs text-ink/60 mt-0.5">
                        Ready-to-test reference experiences
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs font-semibold text-ink/60 hover:text-ink"
                      onClick={() => setActiveTab("demos")}
                    >
                      View all templates <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {demos.map((c) => (
                      <DemoCard key={c.id} c={c} />
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* Tab 2: My Campaigns Only */}
          {activeTab === "campaigns" && (
            <div className="p-8 space-y-6 max-w-6xl">
              <div className="flex items-center justify-between pb-4 border-b border-ink/10">
                <div>
                  <h1 className="font-poppins text-2xl font-extrabold">My Campaigns</h1>
                  <p className="text-xs text-ink/60 mt-1">
                    Manage and edit your custom WebAR releases
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-ink text-paper hover:bg-ink/85"
                  onClick={openCreateModal}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Album
                </Button>
              </div>

              {mine.length === 0 ? (
                <div className="border border-dashed border-ink/25 p-16 text-center space-y-4">
                  <Disc3 className="mx-auto h-12 w-12 text-ink/40" />
                  <h3 className="font-poppins text-lg font-bold">No custom albums yet</h3>
                  <p className="text-sm text-ink/60 max-w-md mx-auto">
                    Click the button below to name your album and get started.
                  </p>
                  <Button onClick={openCreateModal} className="bg-ink text-paper hover:bg-ink/85">
                    <Plus className="mr-1.5 h-4 w-4" /> Create Album
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {mine.map((c) => (
                    <CampaignCard key={c.id} c={c} refresh={refresh} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Demo Templates Only */}
          {activeTab === "demos" && (
            <div className="p-8 space-y-6 max-w-6xl">
              <div className="pb-4 border-b border-ink/10">
                <h1 className="font-poppins text-2xl font-extrabold">Demo Templates</h1>
                <p className="text-xs text-ink/60 mt-1">
                  Pre-configured sample experiences showing multi-layered video, audio, and 3D vinyl
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {demos.map((c) => (
                  <DemoCard key={c.id} c={c} />
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Support & Legal */}
          {activeTab === "support" && (
            <div className="p-8 space-y-8 max-w-4xl">
              <div className="pb-4 border-b border-ink/10">
                <h1 className="font-poppins text-2xl font-extrabold">
                  Support &amp; Legal Policies
                </h1>
                <p className="text-xs text-ink/60 mt-1">
                  Direct access to support, guidelines, and terms
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Link
                  to="/contact"
                  className="border border-ink/15 p-6 hover:border-ink transition group bg-paper block"
                >
                  <HelpCircle className="h-6 w-6 text-ink mb-3" />
                  <h3 className="font-poppins text-lg font-bold group-hover:underline">
                    Contact Support
                  </h3>
                  <p className="mt-1 text-xs text-ink/60">
                    Reach our technical support and customer inquiry team directly.
                  </p>
                </Link>

                <Link
                  to="/privacy-policy"
                  className="border border-ink/15 p-6 hover:border-ink transition group bg-paper block"
                >
                  <Shield className="h-6 w-6 text-ink mb-3" />
                  <h3 className="font-poppins text-lg font-bold group-hover:underline">
                    Privacy Policy
                  </h3>
                  <p className="mt-1 text-xs text-ink/60">
                    Learn how we collect, store, and protect your artwork and data.
                  </p>
                </Link>

                <Link
                  to="/terms"
                  className="border border-ink/15 p-6 hover:border-ink transition group bg-paper block"
                >
                  <FileText className="h-6 w-6 text-ink mb-3" />
                  <h3 className="font-poppins text-lg font-bold group-hover:underline">
                    Terms &amp; Conditions
                  </h3>
                  <p className="mt-1 text-xs text-ink/60">
                    Review terms regarding account usage, content ownership, and licenses.
                  </p>
                </Link>

                <Link
                  to="/refund-policy"
                  className="border border-ink/15 p-6 hover:border-ink transition group bg-paper block"
                >
                  <RotateCcw className="h-6 w-6 text-ink mb-3" />
                  <h3 className="font-poppins text-lg font-bold group-hover:underline">
                    Refund Policy
                  </h3>
                  <p className="mt-1 text-xs text-ink/60">
                    Guidelines on subscriptions, free tier usage, and cancellation terms.
                  </p>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard persistent footer */}
        <footer className="border-t border-ink/15 bg-ink text-paper p-6 mt-16">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-xs text-paper/60">
            <p>
              © {new Date().getFullYear()} Flash AR. Logged in as {user?.email}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/contact" className="hover:text-paper">
                Contact
              </Link>
              <Link to="/privacy-policy" className="hover:text-paper">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-paper">
                Terms &amp; Conditions
              </Link>
              <Link to="/refund-policy" className="hover:text-paper">
                Refund Policy
              </Link>
            </div>
          </div>
        </footer>
      </main>

      {/* Create Album Modal / Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md bg-paper border border-ink/20 text-ink p-6 font-poppins">
          <DialogHeader>
            <DialogTitle className="font-poppins text-xl font-extrabold tracking-tight">
              Create New Album
            </DialogTitle>
            <DialogDescription className="text-xs text-ink/60">
              Enter your album details. You can also upload custom cover artwork now or replace it
              later in the studio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/70">
                Album Name *
              </label>
              <Input
                required
                autoFocus
                placeholder="e.g. Midnight Memories, Neon Dreams"
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                className="border-ink/20 bg-paper text-ink placeholder:text-ink/30 focus:border-ink"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/70">
                Artist / Creator Name
              </label>
              <Input
                placeholder="e.g. Untitled Artist, Luna Eclipse"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                className="border-ink/20 bg-paper text-ink placeholder:text-ink/30 focus:border-ink"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/70">
                Album Cover Artwork (Optional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleFileChange}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-ink/25 p-4 text-center cursor-pointer hover:bg-ink/5 transition flex flex-col items-center justify-center gap-2"
              >
                {previewSrc ? (
                  <div className="relative w-24 h-24 border border-ink/20">
                    <img src={previewSrc} alt="Preview" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-ink/80 text-paper text-[9px] py-0.5 uppercase tracking-wider">
                      Change
                    </span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-6 w-6 text-ink/50" />
                    <p className="text-xs font-medium text-ink/70">Click to choose cover image</p>
                    <p className="text-[10px] text-ink/40">
                      JPEG, PNG or WebP (defaults to demo cover if skipped)
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink/10">
              <Button
                type="button"
                variant="outline"
                className="border-ink/20 text-ink hover:bg-ink/5 text-xs"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-ink text-paper hover:bg-ink/85 text-xs px-5"
              >
                {submitting ? "Creating…" : "Create Album & Open Studio"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CampaignCard({ c, refresh }: { c: Campaign; refresh: () => void }) {
  return (
    <article className="border border-ink/15 bg-paper flex flex-col justify-between group">
      <div>
        <div className="aspect-square overflow-hidden bg-ink/5 border-b border-ink/10 relative">
          <img
            src={c.targetImage}
            alt={c.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute top-3 right-3 bg-ink text-paper text-[10px] uppercase font-bold px-2 py-0.5 tracking-wider">
            Active
          </div>
        </div>
        <div className="p-4 space-y-1">
          <h3 className="font-poppins font-bold text-base truncate">{c.name}</h3>
          <p className="text-xs text-ink/60 truncate">{c.artist}</p>
          <div className="flex items-center gap-3 pt-2 text-[11px] text-ink/50">
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" /> {c.layers.length} layers
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {new Date(c.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0 border-t border-ink/10 flex items-center justify-between gap-2 mt-4">
        <Button size="sm" className="bg-ink text-paper hover:bg-ink/85 flex-1" asChild>
          <Link to="/studio/$id" params={{ id: c.id }}>
            Studio <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-ink/20 text-ink hover:bg-ink/5"
          asChild
        >
          <Link to="/scan/$id" params={{ id: c.id }}>
            <Eye className="mr-1 h-3.5 w-3.5" /> Scan
          </Link>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Delete campaign"
          className="text-ink/60 hover:text-ink hover:bg-ink/5"
          onClick={() => deleteCampaign(c.id).then(refresh)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}

function DemoCard({ c }: { c: Campaign }) {
  return (
    <article className="border border-ink/15 bg-paper flex flex-col justify-between group">
      <div>
        <div className="aspect-square overflow-hidden bg-ink/5 border-b border-ink/10 relative">
          <img
            src={c.targetImage}
            alt={c.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3 bg-paper text-ink border border-ink/20 text-[10px] uppercase font-bold px-2 py-0.5 tracking-wider">
            Demo
          </div>
        </div>
        <div className="p-4 space-y-1">
          <h3 className="font-poppins font-bold text-base truncate">{c.name}</h3>
          <p className="text-xs text-ink/60 truncate">{c.artist}</p>
          <div className="pt-2 text-[11px] text-ink/50 flex items-center gap-1">
            <Layers className="h-3 w-3" /> {c.layers.length} pre-configured layers
          </div>
        </div>
      </div>

      <div className="p-4 pt-0 border-t border-ink/10 flex items-center justify-between gap-2 mt-4">
        <Button size="sm" className="bg-ink text-paper hover:bg-ink/85 flex-1" asChild>
          <Link to="/studio/$id" params={{ id: c.id }}>
            Open Studio
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-ink/20 text-ink hover:bg-ink/5"
          asChild
        >
          <Link to="/scan/$id" params={{ id: c.id }}>
            <Eye className="mr-1 h-3.5 w-3.5" /> Scan
          </Link>
        </Button>
      </div>
    </article>
  );
}
