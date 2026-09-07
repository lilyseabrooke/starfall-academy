"use client";

import * as React from "react";
import { parseMarkdown } from "@/gamebook/markdown";
import Blocks from "@/gamebook/Blocks";

// Kept structurally identical to gamebook/parts.ts's PartMeta, but fetched
// from the API rather than imported — parts.ts pulls in node:fs, which has
// no business in a client bundle.
type PartOption = { slug: string; title: string; numeral: string };

/* ===========================================================================
   TEMPORARY — gamebook live-edit utility
   ---------------------------------------------------------------------------
   A raw textarea over content/*.md, previewed through the site's real parser
   and Blocks renderer, saving back through /api/gamebook-edit. For quickly
   tweaking book text without an editor open on the file.

   Not linked from anywhere in the site nav. Delete this page and the
   gamebook-edit API route once it's no longer needed.
   =========================================================================== */

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

export default function GamebookEditPage() {
  const [parts, setParts] = React.useState<PartOption[]>([]);
  const [slug, setSlug] = React.useState<string | null>(null);
  const [text, setText] = React.useState("");
  const [saved, setSaved] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });

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

  const load = React.useCallback((partSlug: string) => {
    setLoading(true);
    setStatus({ kind: "idle" });
    fetch(`/api/gamebook-edit?part=${encodeURIComponent(partSlug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setText(data.text);
        setSaved(data.text);
      })
      .catch((err) => setStatus({ kind: "error", message: String(err.message ?? err) }))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (slug) load(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const dirty = text !== saved;

  async function save() {
    if (!slug) return;
    setStatus({ kind: "saving" });
    try {
      const res = await fetch("/api/gamebook-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part: slug, text }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "save failed");
      setSaved(text);
      setStatus({ kind: "saved" });
    } catch (err) {
      setStatus({ kind: "error", message: String((err as Error).message ?? err) });
    }
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
        <button onClick={save} disabled={loading || !dirty || status.kind === "saving"}>
          {status.kind === "saving" ? "Saving…" : dirty ? "Save (⌘S)" : "Saved"}
        </button>
        <span
          className={`gb-edit__status ${status.kind === "error" ? "gb-edit__status--error" : ""}`}
        >
          {status.kind === "error"
            ? status.message
            : status.kind === "saved"
              ? "Saved to content/…md — reload the real page to see it live."
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
