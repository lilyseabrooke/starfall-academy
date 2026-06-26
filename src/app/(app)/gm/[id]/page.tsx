import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GMViewFrame from "./GMViewFrame";

export const metadata = {
  title: "GM Tools — Starfall Academy",
};

export default async function GMToolsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS guarantees this only returns a campaign the signed-in user GMs.
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id, name, code")
    .eq("id", id)
    .single();

  if (error || !campaign) notFound();

  return <GMViewFrame campaign={campaign} />;
}
