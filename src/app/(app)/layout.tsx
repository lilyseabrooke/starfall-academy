import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Everything under the (app) group is for signed-in players only.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <>{children}</>;
}
