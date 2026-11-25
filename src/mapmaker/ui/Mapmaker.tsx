"use client";

/* ===========================================================================
   Mapmaker — the /mapmaker tool (staging branch only).
   Left: file actions, outline tree, problems. Centre: editing canvas or the
   real AtlasMap preview. Right: inspector.
   Saving is download/upload of `.map.json`; a draft autosaves to this
   browser's localStorage as a convenience only.
   =========================================================================== */
import * as React from "react";
import { AtlasMap } from "../../sheet/components/map/AtlasMap";
import { SUB_TAG_LETTERS, validateMap, type MapJson, type Problem, type Pt } from "../format";
import { jsonToAtlas } from "../convert";
import { migrateMap } from "../migrate";
import { stringifyMap } from "../stringify";
import { atlasConstName, bakeModule } from "../bake";
import { EditCanvas, type DragApply } from "./EditCanvas";
import { Inspector } from "./Inspector";
import { blankMap, legendIds, sameSel, selFromPath, viewForSel, type Sel, type View } from "./model";

export interface RepoMap { file: string; json: MapJson }

const DRAFT_KEY = "starfall-mapmaker:draft";
const COALESCE_MS = 1200;

interface Hist { past: MapJson[]; present: MapJson; future: MapJson[]; key: string | null; at: number }

function readDraft(): MapJson | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const m = migrateMap(JSON.parse(raw).doc) as MapJson;
    return m && typeof m === "object" && Array.isArray(m.regions) ? m : null;
  } catch { return null; }
}

export default function Mapmaker({ repoMaps }: { repoMaps: RepoMap[] }) {
  const [h, setH] = React.useState<Hist>(() => ({ past: [], present: readDraft() ?? blankMap(), future: [], key: null, at: 0 }));
  const doc = h.present;
  const [view, setView] = React.useState<View>({ level: "world" });
  const [sel, setSel] = React.useState<Sel>({ kind: "map" });
  const [snap, setSnap] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const [showBake, setShowBake] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  /* ---- history ------------------------------------------------------------- */
  const edit = React.useCallback((fn: (d: MapJson) => void, coalesce?: string) => {
    const now = Date.now();
    setH((s) => {
      const d = structuredClone(s.present);
      fn(d);
      const merge = !!coalesce && coalesce === s.key && now - s.at < COALESCE_MS;
      return merge
        ? { ...s, present: d, at: now }
        : { past: [...s.past.slice(-199), s.present], present: d, future: [], key: coalesce ?? null, at: now };
    });
  }, []);
  // Each move re-applies the drag to the doc as it was before the drag began,
  // so a whole drag is one undo step.
  const onDrag = React.useCallback((apply: DragApply, p: Pt, p0: Pt, first: boolean) => {
    setH((s) => {
      const d = structuredClone(first ? s.present : s.past[s.past.length - 1]);
      apply(d, p, p0);
      return first
        ? { past: [...s.past.slice(-199), s.present], present: d, future: [], key: null, at: 0 }
        : { ...s, present: d };
    });
  }, []);
  const undo = React.useCallback(() => setH((s) => s.past.length
    ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future], key: null, at: 0 } : s), []);
  const redo = React.useCallback(() => setH((s) => s.future.length
    ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1), key: null, at: 0 } : s), []);
  const load = (m: MapJson, msg: string) => {
    setH((s) => ({ past: [...s.past.slice(-199), s.present], present: m, future: [], key: null, at: 0 }));
    setView({ level: "world" }); setSel({ kind: "map" }); setNotice(msg);
  };

  /* ---- keyboard + autosave ------------------------------------------------- */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
  React.useEffect(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ doc, savedAt: new Date().toISOString() })); } catch { /* private mode / quota */ }
    }, 400);
    return () => clearTimeout(id);
  }, [doc]);

  /* ---- derived --------------------------------------------------------------- */
  const problems: Problem[] = React.useMemo(() => validateMap(doc), [doc]);
  const errors = problems.filter((p) => p.level === "error");
  const atlas = React.useMemo(() => {
    if (!preview || errors.length) return null;
    try { return jsonToAtlas(doc); } catch { return null; }
  }, [preview, errors.length, doc]);

  const select = (s: Sel) => { setSel(s); setView((v) => viewForSel(s, v)); };
  // Keep the view valid when things are deleted or undone.
  const safeView: View =
    (view.level === "region" && !doc.regions[view.i]) || (view.level === "centrepiece" && !doc.centrepiece) ||
    (view.level === "district" && !doc.centrepiece?.districts[view.i]) ? { level: "world" } : view;

  /* ---- file actions --------------------------------------------------------- */
  const download = (name: string, text: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const onUpload = async (f: File) => {
    try {
      const m = migrateMap(JSON.parse(await f.text()));
      const probs = validateMap(m);
      const errs = probs.filter((p) => p.level === "error");
      if (errs.some((p) => /^(format|version|regions|outline|field)$/.test(p.path) || p.path === "")) {
        setNotice(`Not opened: ${f.name} is not a usable map (${errs[0].path || "file"}: ${errs[0].message})`);
        return;
      }
      load(m as MapJson, `Opened ${f.name}` + (errs.length ? ` with ${errs.length} problem(s) to fix` : ""));
    } catch (e) {
      setNotice(`Not opened: ${f.name} is not valid JSON (${(e as Error).message}).`);
    }
  };
  const campus = repoMaps.find((r) => r.json.id === "campus");

  return (
    <div className="mm-root">
      <header className="mm-top">
        <div className="mm-top__title"><span className="mm-eyebrow">Staging · Mapmaker</span><b>{doc.name || "Untitled"}</b> <code>{doc.id}.map.json</code></div>
        <div className="mm-top__actions">
          <button type="button" className="mm-btn" onClick={undo} disabled={!h.past.length} title="Undo (Ctrl+Z)">Undo</button>
          <button type="button" className="mm-btn" onClick={redo} disabled={!h.future.length} title="Redo (Ctrl+Shift+Z)">Redo</button>
          <label className="mm-check"><input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} /> Snap to grid</label>
          <div className="mm-seg" role="group" aria-label="Mode">
            <button type="button" className={!preview ? "is-on" : ""} onClick={() => setPreview(false)}>Edit</button>
            <button type="button" className={preview ? "is-on" : ""} onClick={() => setPreview(true)}>Preview</button>
          </div>
        </div>
      </header>

      <aside className="mm-left">
        <section className="mm-sec">
          <h3>File</h3>
          <div className="mm-btns">
            <button type="button" className="mm-btn" onClick={() => { if (confirm("Start a new blank map? (Undo brings this one back.)")) load(blankMap(), "New blank map"); }}>New</button>
            {campus && <button type="button" className="mm-btn" onClick={() => load({ ...structuredClone(campus.json), id: "campus-copy", name: "Campus copy" }, "Duplicated the campus as a starting point")}>Duplicate campus</button>}
            <button type="button" className="mm-btn" onClick={() => fileRef.current?.click()}>Open file…</button>
            <button type="button" className="mm-btn mm-btn--gold" onClick={() => download(`${doc.id}.map.json`, stringifyMap(doc), "application/json")}>Download</button>
            <button type="button" className="mm-btn" onClick={() => setShowBake(true)}>Baked module…</button>
          </div>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
          {repoMaps.length > 0 && (
            <label className="mm-field">
              <span className="mm-field__label">Open from repo (maps/)</span>
              <select value="" onChange={(e) => { const r = repoMaps.find((q) => q.file === e.target.value); if (r) load(structuredClone(r.json), `Opened maps/${r.file}`); }}>
                <option value="">Choose…</option>
                {repoMaps.map((r) => <option key={r.file} value={r.file}>{r.file}</option>)}
              </select>
            </label>
          )}
          {notice && <p className="mm-notice">{notice}</p>}
          <p className="mm-hint">Drafts autosave in this browser. The downloaded file is the real save: put it in <code>maps/</code>, commit on staging, then <code>npm run bake-map -- {doc.id}</code>.</p>
        </section>

        <Tree doc={doc} sel={sel} onSelect={select} edit={edit} />

        <section className="mm-sec">
          <h3>Problems {problems.length ? `(${errors.length} error${errors.length === 1 ? "" : "s"}, ${problems.length - errors.length} warning${problems.length - errors.length === 1 ? "" : "s"})` : ""}</h3>
          {problems.length === 0 ? <p className="mm-hint">None. This map bakes cleanly.</p> : (
            <ul className="mm-problems">
              {problems.map((p, k) => (
                <li key={k} className={"is-" + p.level}>
                  <button type="button" onClick={() => select(selFromPath(p.path))}><code>{p.path || "file"}</code> {p.message}</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>

      <main className="mm-centre">
        <Boundary onUndo={undo}>
          {preview ? (
            atlas
              ? <div className="sf-sheet mm-preview"><AtlasMap key={doc.id} atlas={atlas} closeOnEscape /></div>
              : <div className="mm-blocked">Fix {errors.length} error{errors.length === 1 ? "" : "s"} to preview this map.</div>
          ) : (
            <EditCanvas doc={doc} view={safeView} sel={sel} snap={snap} onSelect={setSel}
              onDrill={(v) => { setView(v); setSel(v.level === "region" ? { kind: "region", i: v.i } : v.level === "district" ? { kind: "district", i: v.i } : v.level === "centrepiece" ? { kind: "centrepiece" } : { kind: "map" }); }}
              onDrag={onDrag} onEdit={(fn) => edit(fn)} />
          )}
        </Boundary>
      </main>

      <aside className="mm-right">
        <Boundary onUndo={undo}>
          <Inspector doc={doc} sel={sel} problems={problems} edit={edit} onSelect={select} />
        </Boundary>
      </aside>

      {showBake && (
        <div className="mm-modal" role="dialog" aria-modal="true" aria-label="Baked module" onClick={() => setShowBake(false)}>
          <div className="mm-modal__box" onClick={(e) => e.stopPropagation()}>
            <header>
              <b>src/sheet/data/map/areas/{doc.id}.ts</b> <code>{atlasConstName(doc.id)}</code>
              <span className="mm-grow" />
              {!errors.length && <button type="button" className="mm-btn" onClick={() => download(`${doc.id}.ts`, bakeModule(doc), "text/typescript")}>Download .ts</button>}
              <button type="button" className="mm-btn" onClick={() => setShowBake(false)}>Close</button>
            </header>
            {errors.length
              ? <p className="mm-blocked">Fix {errors.length} error{errors.length === 1 ? "" : "s"} before baking.</p>
              : <pre>{bakeModule(doc)}</pre>}
            <p className="mm-hint">This is exactly what <code>npm run bake-map</code> writes. Ship it from a fresh branch off main (see design/MAPMAKER_PLAN.md, Phase 6).</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- outline tree -------------------------------------------------------------- */

function Tree({ doc, sel, onSelect, edit }: { doc: MapJson; sel: Sel; onSelect: (s: Sel) => void; edit: (fn: (d: MapJson) => void) => void }) {
  const order = legendIds(doc);
  const is = (s: Sel) => sameSel(sel, s);
  const move = (id: string, dir: -1 | 1) => edit((d) => {
    const lo = legendIds(d);
    const k = lo.indexOf(id), j = k + dir;
    if (j < 0 || j >= lo.length) return;
    [lo[k], lo[j]] = [lo[j], lo[k]];
    d.legendOrder = lo;
  });
  const openOwner = (s: Sel) => (sel.kind === "zone" && s.kind === sel.owner && "i" in s && s.i === sel.i) || is(s);
  return (
    <section className="mm-sec mm-tree">
      <h3>Map outline</h3>
      <button type="button" className={"mm-node" + (is({ kind: "map" }) ? " is-sel" : "")} onClick={() => onSelect({ kind: "map" })}>{doc.name || "Map"}</button>
      <div className="mm-node__label">Legend order</div>
      <ul>
        {order.map((id, k) => {
          const i = doc.regions.findIndex((r) => r.id === id);
          const isCentre = i < 0;
          const s: Sel = isCentre ? { kind: "centrepiece" } : { kind: "region", i };
          const name = isCentre ? doc.centrepiece!.name : doc.regions[i].name;
          const house = isCentre ? doc.centrepiece!.house_color : doc.regions[i].house_color;
          return (
            <li key={id}>
              <div className="mm-node__row">
                <button type="button" className={"mm-node" + (is(s) ? " is-sel" : "")} data-house={house} onClick={() => onSelect(s)}>
                  <span className="mm-dot" />{name}{isCentre && <em> · centrepiece</em>}
                </button>
                <button type="button" className="mm-iconbtn" aria-label={`Move ${name} up`} disabled={k === 0} onClick={() => move(id, -1)}>↑</button>
                <button type="button" className="mm-iconbtn" aria-label={`Move ${name} down`} disabled={k === order.length - 1} onClick={() => move(id, 1)}>↓</button>
              </div>
              {!isCentre && openOwner(s) && (
                <ul>
                  {doc.regions[i].submap.subs.map((a, z) => {
                    const zs: Sel = { kind: "zone", owner: "region", i, k: z };
                    return <li key={z}><button type="button" className={"mm-node mm-node--zone" + (is(zs) ? " is-sel" : "")} onClick={() => onSelect(zs)}>{SUB_TAG_LETTERS[z]} · {a.name || "unnamed"}</button></li>;
                  })}
                </ul>
              )}
              {isCentre && (sel.kind === "centrepiece" || sel.kind === "district" || sel.kind === "special" || (sel.kind === "zone" && sel.owner === "district")) && (
                <ul>
                  {doc.centrepiece!.districts.map((d, j) => {
                    const ds: Sel = { kind: "district", i: j };
                    return (
                      <li key={j}>
                        <button type="button" className={"mm-node" + (is(ds) ? " is-sel" : "")} onClick={() => onSelect(ds)}>
                          <span className="mm-dot" style={{ background: d.color }} />{d.tag} {d.name}
                        </button>
                        {openOwner(ds) && (
                          <ul>
                            {d.subs.map((a, z) => {
                              const zs: Sel = { kind: "zone", owner: "district", i: j, k: z };
                              return <li key={z}><button type="button" className={"mm-node mm-node--zone" + (is(zs) ? " is-sel" : "") + (a.on ? "" : " is-off")} onClick={() => onSelect(zs)}>{SUB_TAG_LETTERS[z]} · {a.name || a.generic || "unnamed"}</button></li>;
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                  {doc.centrepiece!.specials.map((sp, j) => {
                    const ss: Sel = { kind: "special", i: j };
                    return <li key={"s" + j}><button type="button" className={"mm-node" + (is(ss) ? " is-sel" : "")} onClick={() => onSelect(ss)}>✦ {sp.name}</button></li>;
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {!doc.centrepiece && <button type="button" className="mm-node mm-node--add" onClick={() => onSelect({ kind: "centrepiece" })}>+ centrepiece</button>}
      <div className="mm-node__label">Points of interest</div>
      <ul>
        {doc.pois.map((q, i) => {
          const s: Sel = { kind: "poi", i };
          return <li key={q.id + i}><button type="button" className={"mm-node" + (is(s) ? " is-sel" : "")} onClick={() => onSelect(s)}>◆ {q.name}</button></li>;
        })}
        {doc.pois.length === 0 && <li className="mm-hint">None yet.</li>}
      </ul>
    </section>
  );
}

/* ---- error boundary: a malformed upload or bad edit must not lose the session -- */

class Boundary extends React.Component<{ onUndo: () => void; children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mm-blocked">
        <p>This part of the editor hit an error: <code>{this.state.error.message}</code></p>
        <button type="button" className="mm-btn" onClick={() => { this.props.onUndo(); this.setState({ error: null }); }}>Undo last change</button>
        <button type="button" className="mm-btn" onClick={() => this.setState({ error: null })}>Try again</button>
      </div>
    );
  }
}
