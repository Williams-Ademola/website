import type { Metadata } from "next";

// Per-person pages: always render on request, never cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Signed-out visitors are redirected by the proxy; each page also checks before rendering anything private.
export default function HubLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
