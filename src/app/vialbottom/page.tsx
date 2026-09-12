import "@/styles/landing.css";

// Bonus dossier page — intentionally not linked from any nav. Reachable only
// by direct URL, so it skips the site chrome (no HudTopBar) and asks crawlers
// to leave it alone.
export const metadata = {
  title: "The Vialbottom Board — Starfall Academy",
  robots: { index: false, follow: false },
};

export default function VialbottomPage() {
  return (
    <div className="embed-root">
      <iframe
        className="embed-frame"
        src="/vialbottom/index.html"
        title="The Vialbottom Board"
      />
    </div>
  );
}
