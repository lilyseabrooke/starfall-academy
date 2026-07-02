import HudTopBar from "@/components/HudTopBar";
import { createClient } from "@/lib/supabase/server";
import "@/styles/landing.css";

export const metadata = {
  title: "Campus Map — Starfall Academy",
};

export default async function MapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="embed-root">
      <HudTopBar active="Map" signedIn={!!user} title="Campus Map" />
      <iframe
        className="embed-frame"
        src="/map/index.html"
        title="Starfall Academy campus map"
      />
    </div>
  );
}
