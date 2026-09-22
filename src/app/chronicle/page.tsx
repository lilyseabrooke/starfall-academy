import HudTopBar from "@/components/HudTopBar";
import { createClient } from "@/lib/supabase/server";
import "@/styles/landing.css";

export const metadata = {
  title: "The Chronicle — Starfall Academy",
};

export default async function ChroniclePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="embed-root">
      <HudTopBar active="Chronicle" signedIn={!!user} title="The Chronicle" />
      <iframe
        className="embed-frame"
        src="/chronicle/index.html"
        title="Starfall Academy campaign chronicle"
      />
    </div>
  );
}
