import HudTopBar from "@/components/HudTopBar";
import { createClient } from "@/lib/supabase/server";
import "@/styles/landing.css";

export const metadata = {
  title: "Character Ledger — Starfall Academy",
};

export default async function CharacterMapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="embed-root">
      <HudTopBar active="Character Ledger" signedIn={!!user} />
      <iframe
        className="embed-frame"
        src="/character-map/index.html"
        title="Starfall Academy Family Ledger"
      />
    </div>
  );
}
