"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Campaign = {
  id: string;
  name: string | null;
  code: string | null;
};

// "Campaigns you run" — the campaigns where the signed-in user is the GM.
// Mirrors RosterList's styling; each card opens the GM tools for that campaign.
export default function CampaignsList({ campaigns }: { campaigns: Campaign[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function create() {
    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New campaign" }),
      });
      if (res.ok) {
        const { id } = await res.json();
        router.push(`/gm/${id}`);
        return;
      }
    } catch {
      /* fall through to re-enable the button */
    }
    setCreating(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    setBusy(id);
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" }).catch(() => {});
    setBusy(null);
    router.refresh();
  }

  return (
    <section className="mt-12 border-t pt-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Campaigns you run</h2>
          <p className="mt-1 text-sm text-gray-500">
            Campaigns you&apos;re the Game Master for. Open one for the GM tools.
          </p>
        </div>
        <button
          onClick={create}
          disabled={creating}
          className="shrink-0 rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {creating ? "Creating…" : "New campaign"}
        </button>
      </div>

      {campaigns.length === 0 ? (
        <p className="text-gray-500">
          You aren&apos;t running any campaigns yet. Create one to open the GM tools.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {campaigns.map((cm) => (
            <li key={cm.id} className="rounded border p-4">
              <div className="flex items-center justify-between gap-3">
                <Link href={`/gm/${cm.id}`} className="font-medium hover:underline">
                  {cm.name || "Untitled campaign"}
                </Link>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">GM</span>
                  <button
                    onClick={() => remove(cm.id)}
                    disabled={busy === cm.id}
                    className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-gray-500">Join code</span>
                <code className="rounded bg-gray-100 px-2 py-0.5 font-mono">{cm.code}</code>
                <span className="text-gray-300">·</span>
                <Link href={`/gm/${cm.id}`} className="text-blue-600 hover:underline">
                  Open GM tools
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
