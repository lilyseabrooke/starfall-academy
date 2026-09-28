import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for trusted server-only code paths (e.g. the Discord
// bot's story-submission endpoint) that need to write past RLS policies that
// intentionally have no anon/authenticated insert rule. Never import this
// from a client component or anywhere reachable without its own auth check —
// the service role bypasses RLS entirely.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) must be set");
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
