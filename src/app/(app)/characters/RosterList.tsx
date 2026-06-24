"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Character = {
  id: string;
  name: string | null;
  type: string;
  campaign_code: string | null;
};

// Short, human-typeable campaign code (no separate campaigns table yet).
function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
}

export default function RosterList({ characters }: { characters: Character[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");

  async function setCampaign(id: string, code: string | null) {
    setBusy(id);
    await fetch(`/api/characters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_code: code }),
    }).catch(() => {});
    setBusy(null);
    setJoining(null);
    setJoinCode("");
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this character? This cannot be undone.")) return;
    setBusy(id);
    await fetch(`/api/characters/${id}`, { method: "DELETE" }).catch(() => {});
    setBusy(null);
    router.refresh();
  }

  return (
    <ul className="flex flex-col gap-3">
      {characters.map((ch) => (
        <li key={ch.id} className="rounded border p-4">
          <div className="flex items-center justify-between gap-3">
            <Link href={`/characters/${ch.id}`} className="font-medium hover:underline">
              {ch.name || "Unnamed"}
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">{ch.type}</span>
              <button
                onClick={() => remove(ch.id)}
                disabled={busy === ch.id}
                className="text-gray-400 hover:text-red-600 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {ch.campaign_code ? (
              <>
                <span className="text-gray-500">Campaign</span>
                <code className="rounded bg-gray-100 px-2 py-0.5 font-mono">
                  {ch.campaign_code}
                </code>
                <button
                  onClick={() => setCampaign(ch.id, null)}
                  disabled={busy === ch.id}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-50"
                >
                  Leave
                </button>
              </>
            ) : joining === ch.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (joinCode.trim()) setCampaign(ch.id, joinCode.trim().toUpperCase());
                }}
                className="flex items-center gap-2"
              >
                <input
                  autoFocus
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="CODE"
                  className="w-28 rounded border px-2 py-1 font-mono uppercase"
                />
                <button
                  type="submit"
                  disabled={busy === ch.id}
                  className="rounded bg-black px-2 py-1 text-white disabled:opacity-50"
                >
                  Join
                </button>
                <button type="button" onClick={() => setJoining(null)} className="text-gray-400">
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <span className="text-gray-400">No campaign</span>
                <button
                  onClick={() => setCampaign(ch.id, makeCode())}
                  disabled={busy === ch.id}
                  className="text-blue-600 hover:underline disabled:opacity-50"
                >
                  New campaign
                </button>
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => setJoining(ch.id)}
                  className="text-blue-600 hover:underline"
                >
                  Join by code
                </button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
