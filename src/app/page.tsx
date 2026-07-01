import { createClient } from "@/lib/supabase/server";
import Landing from "./Landing";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <Landing signedIn={!!user} />;
}
