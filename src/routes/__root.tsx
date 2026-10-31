import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Disc3, ArrowLeft } from "lucide-react";

import appCss from "../styles.css?url";
import { reportApplicationError } from "../lib/error-reporting";
import { absoluteUrl, siteName } from "@/lib/site";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <main className="flex min-h-screen flex-col bg-paper text-ink font-poppins">
      <header className="border-b border-ink/10 bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink"
          >
            <Disc3 className="h-6 w-6" /> Flash AR
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md border border-ink/20 p-8 text-center space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">Error 404</p>
          <h1 className="font-poppins text-6xl font-extrabold text-ink">404</h1>
          <h2 className="font-poppins text-xl font-bold text-ink">Page Not Found</h2>
          <p className="text-sm text-ink/60">
            The page you are looking for doesn't exist, has been removed, or was never created.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center bg-ink text-paper px-6 py-2.5 text-sm font-semibold hover:bg-ink/85 transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportApplicationError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col bg-paper text-ink font-poppins">
      <header className="border-b border-ink/10 bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink"
          >
            <Disc3 className="h-6 w-6" /> Flash AR
          </Link>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </a>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md border border-ink/20 p-8 text-center space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Application Error
          </p>
          <h1 className="font-poppins text-2xl font-bold text-ink">This page didn't load</h1>
          <p className="text-sm text-ink/60">
            Something went wrong while rendering this page. You can try reloading or return home.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="bg-ink text-paper px-5 py-2 text-sm font-medium hover:bg-ink/85 transition"
            >
              Try again
            </button>
            <a
              href="/"
              className="border border-ink/20 bg-paper text-ink px-5 py-2 text-sm font-medium hover:bg-ink/5 transition"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Flash AR — WebAR for album covers" },
      {
        name: "description",
        content: "Turn vinyl sleeves, album covers and photo albums into WebAR experiences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(absoluteUrl() ? [{ property: "og:url", content: absoluteUrl()! }] : []),
      ...(absoluteUrl("/social-preview.svg")
        ? [{ property: "og:image", content: absoluteUrl("/social-preview.svg")! }]
        : []),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body data-site={siteName}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
