import HudTopBar from "@/components/HudTopBar";
import { createClient } from "@/lib/supabase/server";
import { CompendiumProvider } from "@/gamebook/widgets/CompendiumContext";
import "@/styles/landing.css";
import "@/gamebook/gamebook.css";

export const metadata = {
  title: "Gamebook — Starfall Academy",
  description: "The rules, the world, and how to run a game of your own.",
};

export default async function GamebookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="gb-root">
      <HudTopBar active="Gamebook" signedIn={!!user} title="Gamebook" />
      <CompendiumProvider>{children}</CompendiumProvider>
    </div>
  );
}
