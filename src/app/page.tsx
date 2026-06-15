import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, message, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col gap-10 py-32 px-16">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Starfall Academy
        </h1>
        <section>
          <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-400 mb-4">
            Announcements
          </h2>
          {announcements && announcements.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {announcements.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4"
                >
                  <p className="text-zinc-800 dark:text-zinc-100">{a.message}</p>
                  <time className="mt-1 block text-xs text-zinc-400">
                    {new Date(a.created_at).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-zinc-500">No announcements yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}
