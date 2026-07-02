import HudTopBar from "@/components/HudTopBar";
import { createClient } from "@/lib/supabase/server";
import "@/styles/landing.css";

export const metadata = {
  title: "Compendium — Starfall Academy",
};

export default async function CompendiumPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="embed-root">
      <HudTopBar active="Compendium" signedIn={!!user} title="Compendium" />
      <iframe
        className="embed-frame"
        src="/compendium/index.html"
        title="Starfall Academy Compendium"
      />
    </div>
  );
}
