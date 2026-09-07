"use client";

import * as React from "react";
import { parseMarkdown } from "@/gamebook/markdown";
import Blocks from "@/gamebook/Blocks";
import { createClient } from "@/lib/supabase/client";

// Kept structurally identical to gamebook/parts.ts's PartMeta, but fetched
// from the API rather than imported — parts.ts pulls in node:fs, which has
// no business in a client bundle.
type PartOption = { slug: string; title: string; numeral: string };

const OWNER_EMAIL = "lilyseabrooke00@gmail.com";

/* ===========================================================================
   TEMPORARY — gamebook live-edit utility
   ---------------------------------------------------------------------------
   A raw textarea over the gamebook, previewed through the site's real
   parser and Blocks renderer. Loads a saved override if one exists,
   otherwise the original content/*.md text, and saves back to the
   gamebook_overrides Supabase table, which the live /gamebook/[part] pages
   pick up on their next render (no redeploy needed; see LiveBlocks.tsx).
   Writes are gated by RLS to the site owner's account, not by anything in
   this page — signed out or signed in as anyone else, Save will fail.

   Not linked from anywhere in the site nav. Delete this page, the
   gamebook-edit API route, LiveBlocks.tsx, and the gamebook_overrides
   table once it's no longer needed.
   =========================================================================== */

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

export default function GamebookEditPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [email, setEmail] = React.useState<string | null | undefined>(undefined); // undefined = still checking
  const [parts, setParts] = React.useState<PartOption[]>([]);
  const [slug, setSlug] = React.useState<string | null>(null);
  const [text, setText] = React.useState("");
  const [saved, setSaved] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [supabase]);

  // Fetch the part list once, then default to the first part.
  React.useEffect(() => {
    fetch("/api/gamebook-edit")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setParts(data.parts);
        setSlug((s) => s ?? data.parts[0]?.slug ?? null);
      })
      .catch((err) => setStatus({ kind: "error", message: String(err.message ?? err) }));
  }, []);

  const load = React.useCallback(
    async (partSlug: string) => {
      setLoading(true);
      setStatus({ kind: "idle" });
      try {
        // A saved override wins over the original file, so re-opening a
        // part after editing it picks up where the last save left off.
        const [override, original] = await Promise.all([
          supabase.from("gamebook_overrides").select("text").eq("slug", partSlug).maybeSingle(),
          fetch(`/api/gamebook-edit?part=${encodeURIComponent(partSlug)}`).then((r) => r.json()),
        ]);
        if (original.error) throw new Error(original.error);
        const initial = override.data?.text ?? original.text;
        setText(initial);
        setSaved(initial);
      } catch (err) {
        setStatus({ kind: "error", message: String((err as Error).message ?? err) });
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  React.useEffect(() => {
    if (slug) load(slug);
  }, [slug, load]);

  const dirty = text !== saved;

  async function save() {
    if (!slug) return;
    setStatus({ kind: "saving" });
    const { error } = await supabase
      .from("gamebook_overrides")
      .upsert({ slug, text, updated_at: new Date().toISOString() });
    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    setSaved(text);
    setStatus({ kind: "saved" });
  }

  // Cmd/Ctrl+S saves without leaving the textarea.
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      save();
    }
  }

  const parsed = React.useMemo(() => {
    try {
      return { blocks: parseMarkdown(text).blocks, error: null as string | null };
    } catch (err) {
      return { blocks: [], error: String((err as Error).message ?? err) };
    }
  }, [text]);

  const canWrite = email === OWNER_EMAIL;

  return (
    <div className="gb-edit">
      <style>{`
        .gb-edit { display: flex; flex-direction: column; gap: 12px; padding: 16px; height: 100vh; box-sizing: border-box; }
        .gb-edit__bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .gb-edit__bar select, .gb-edit__bar button {
          font: inherit; padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.06); color: inherit; cursor: pointer;
        }
        .gb-edit__bar button:disabled { opacity: 0.5; cursor: default; }
        .gb-edit__status { font-size: 0.85em; opacity: 0.75; }
        .gb-edit__status--error { color: #ff8080; opacity: 1; }
        .gb-edit__panes { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1; min-height: 0; }
        .gb-edit__pane { display: flex; flex-direction: column; min-height: 0; }
        .gb-edit__pane h2 { font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.6; margin: 0 0 6px; }
        .gb-edit textarea {
          flex: 1; resize: none; font: 13px/1.5 ui-monospace, monospace; padding: 12px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.25); color: inherit;
        }
        .gb-edit__preview { flex: 1; overflow: auto; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 12px 20px; }
      `}</style>

      <div className="gb-edit__bar">
        <strong>Gamebook live editor</strong>
        <select value={slug ?? ""} onChange={(e) => setSlug(e.target.value)} disabled={loading || !parts.length}>
          {parts.map((p) => (
            <option key={p.slug} value={p.slug}>
              Part {p.numeral} — {p.title}
            </option>
          ))}
        </select>
        <button onClick={save} disabled={loading || !dirty || !canWrite || status.kind === "saving"}>
          {status.kind === "saving" ? "Saving…" : dirty ? "Save (⌘S)" : "Saved"}
        </button>
        <span
          className={`gb-edit__status ${status.kind === "error" ? "gb-edit__status--error" : ""}`}
        >
          {email === undefined
            ? ""
            : !canWrite
              ? "Signed in as someone other than the site owner — Save is disabled."
              : status.kind === "error"
                ? status.message
                : status.kind === "saved"
                  ? "Saved — live on the site now."
                  : dirty
                    ? "Unsaved changes"
                    : ""}
        </span>
      </div>

      <div className="gb-edit__panes">
        <div className="gb-edit__pane">
          <h2>Markdown source</h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            disabled={loading}
          />
        </div>
        <div className="gb-edit__pane">
          <h2>Preview</h2>
          <div className="gb-edit__preview gb-prose">
            {parsed.error ? (
              <p className="gb-edit__status--error">{parsed.error}</p>
            ) : (
              <Blocks blocks={parsed.blocks} anchorIndex={{}} partSlug={slug ?? ""} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
