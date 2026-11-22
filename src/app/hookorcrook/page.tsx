import "@/styles/landing.css";

// Bonus heist briefing — intentionally not linked from any nav. Reachable only
// by direct URL, so it skips the site chrome (no HudTopBar) and asks crawlers
// to leave it alone. The page itself is static: public/hookorcrook/.
export const metadata = {
  title: "By Hook or By Crook — Starfall Academy",
  robots: { index: false, follow: false },
};

export default function HookOrCrookPage() {
  return (
    <div className="embed-root">
      <iframe
        className="embed-frame"
        src="/hookorcrook/index.html"
        title="By Hook or By Crook"
      />
    </div>
  );
}
