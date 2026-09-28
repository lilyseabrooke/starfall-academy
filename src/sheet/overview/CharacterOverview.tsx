"use client";

/* ===========================================================================
   Starfall Academy — character sheet overview: the card
   ---------------------------------------------------------------------------
   A one-page, screenshot-ready summary of a character. Purely presentational:
   it renders whatever overview-data compiled, so the Forge's in-progress draft
   and a character loaded out of gameplay both land here unchanged.
   =========================================================================== */
import * as React from "react";
import { Crest, IconButton } from "@/ds";
import { Icon } from "../components/Icon";
import { TONE_500, TONE_FG } from "../data/shared";
import type { OverviewEntry, OverviewModel } from "./overview-data";

import "../styles/overview.css";

const accent = (tone: string) => ({ "--o-accent": TONE_500[tone] || TONE_500.gold, "--o-accent-fg": TONE_FG[tone] || TONE_FG.gold }) as React.CSSProperties;

/* ------------------------------- pieces -------------------------------- */

function Section({ icon, title, count, children }: { icon: string; title: string; count?: string; children: React.ReactNode }) {
  return (
    <section className="sf-cso__sec">
      <h3 className="sf-cso__sect">
        <Icon name={icon} /> {title}
        {count ? <span className="sf-cso__count">{count}</span> : null}
      </h3>
      {children}
    </section>
  );
}

/** A label / values row — the card's workhorse line. */
function Row({ label, tone, badge, children }: { label: string; tone?: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="sf-cso__row" style={tone ? accent(tone) : undefined}>
      <span className="sf-cso__rowk">
        {label}
        {badge}
      </span>
      <span className="sf-cso__rowv">{children}</span>
    </div>
  );
}

const Rank = ({ n }: { n: number }) => <span className="sf-cso__rank">{n}</span>;

/** Names, dot-separated, each with its optional count/qualifier. */
function Names({ entries, toned }: { entries: OverviewEntry[]; toned?: boolean }) {
  return (
    <span className="sf-cso__names">
      {entries.map((e, i) => (
        <span key={e.name + i} className={"sf-cso__nm" + (e.dim ? " is-dim" : "")} style={toned && e.tone ? accent(e.tone) : undefined}>
          {toned ? <span className="sf-cso__nmdot" /> : null}
          {e.name}
          {e.note ? <em className="sf-cso__nmnote">{e.note}</em> : null}
        </span>
      ))}
    </span>
  );
}

/* -------------------------------- card --------------------------------- */

export interface CharacterOverviewProps {
  open: boolean;
  model: OverviewModel | null;
  onClose: () => void;
}

/** Below this the card stops shrinking and starts scrolling — a summary nobody
 *  can read isn't one page, it's a thumbnail. */
const MIN_FIT = 0.68;

type CopyState = "idle" | "working" | "done" | "error";

const COPY_LABEL: Record<CopyState, { icon: string; text: string }> = {
  idle: { icon: "copy", text: "Copy card" },
  working: { icon: "loader", text: "Copying…" },
  done: { icon: "check", text: "Copied" },
  error: { icon: "triangle-alert", text: "Couldn't copy" },
};

/** Writing an image to the clipboard needs both halves of the API. */
const canCopyImage = () =>
  typeof window !== "undefined" && typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;
const noSubscribe = () => () => {};
const notOnServer = () => false;

/** Render the card to a PNG. Captured from an off-screen copy rather than the
 *  card itself so the fit-to-window zoom and the scroll clamp can be undone —
 *  what gets copied is the whole card at full size — without the live one
 *  visibly jumping while the image is produced. The copy is mounted in the
 *  card's own parent so it keeps the sheet's scoped styles and tokens. */
async function cardPng(card: HTMLElement): Promise<Blob> {
  const host = card.parentElement || document.body;
  // A wrapper does the hiding, not the copy itself: html-to-image re-renders
  // the captured node with its own styles, so an off-screen `position` on it
  // would move it out of the frame and yield a blank image.
  const stage = document.createElement("div");
  Object.assign(stage.style, {
    position: "fixed", top: "0", left: "-20000px", zIndex: "-1",
    width: card.offsetWidth + "px", pointerEvents: "none",
  });
  const shot = card.cloneNode(true) as HTMLElement;
  Object.assign(shot.style, {
    zoom: "1", width: "100%", maxHeight: "none", overflow: "visible", animation: "none",
  });
  stage.appendChild(shot);
  host.appendChild(stage);
  try {
    // Loaded on demand: the renderer is only needed by whoever clicks Copy.
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(shot, {
      pixelRatio: 2,
      // The card paints its own ground, but a gradient that fails to inline
      // shouldn't leave a transparent PNG behind.
      backgroundColor: "#0b0c11",
    });
    if (!blob) throw new Error("character overview produced no image");
    return blob;
  } finally {
    stage.remove();
  }
}

export function CharacterOverview({ open, model, onClose }: CharacterOverviewProps) {
  const cardRef = React.useRef<HTMLElement | null>(null);
  const fitRef = React.useRef<HTMLDivElement | null>(null);
  const [copy, setCopy] = React.useState<CopyState>("idle");
  // Server-render as unsupported, then settle on the real answer after
  // hydration — reading the clipboard API during render would mismatch.
  const canCopy = React.useSyncExternalStore(noSubscribe, canCopyImage, notOnServer);
  const resetRef = React.useRef<number | null>(null);
  React.useEffect(() => () => { if (resetRef.current) window.clearTimeout(resetRef.current); }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // One page means one page: a card taller than the window is scaled down to
  // fit rather than left to scroll, so what's on screen is the whole summary.
  // `zoom` (not `transform`) so the type re-lays out crisply at its new size.
  React.useLayoutEffect(() => {
    const card = cardRef.current, fit = fitRef.current;
    if (!open || !card || !fit) return;
    const measure = () => {
      const avail = fit.clientHeight;
      // Phone-width: the card is a single tall column and scrolls like any
      // other page — shrinking it to one screen would leave it unreadable.
      if (!avail || window.innerWidth < 900) { card.style.zoom = "1"; return; }
      // Zooming re-wraps the card (it gets proportionally wider as it shrinks),
      // so one division undershoots — settle it by iterating, keeping the
      // largest zoom that was actually seen to fit.
      let z = 1, best = MIN_FIT;
      card.style.zoom = "1";
      for (let i = 0; i < 5; i++) {
        // scrollHeight, not the rendered box: the card is already clamped to
        // the window by max-height, so only its content height says how tall it
        // wants to be. (+ borders, which scrollHeight leaves out.)
        const rendered = (card.scrollHeight + (card.offsetHeight - card.clientHeight)) * z;
        if (rendered <= avail + 1) {
          best = Math.max(best, z);
          if (z >= 1 || avail - rendered < 12) break;
        }
        const next = Math.min(1, Math.max(MIN_FIT, (z * avail) / rendered));
        if (Math.abs(next - z) < 0.004) break;
        z = next;
        card.style.zoom = String(z);
      }
      card.style.zoom = String(best);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, model]);

  const copyCard = () => {
    const card = cardRef.current;
    if (!card || copy === "working") return;
    setCopy("working");
    const settle = (next: CopyState) => {
      setCopy(next);
      if (resetRef.current) window.clearTimeout(resetRef.current);
      resetRef.current = window.setTimeout(() => setCopy("idle"), 2600);
    };
    // The blob is handed over as a promise rather than awaited first: Safari
    // only allows a clipboard write from the click's own task.
    const item = new ClipboardItem({ "image/png": cardPng(card) });
    navigator.clipboard.write([item]).then(() => settle("done"), () => settle("error"));
  };

  if (!open || !model) return null;
  const m = model;
  const spellCount = m.spells.length;
  const itemCount = m.inventory.reduce((n, g) => n + g.entries.length, 0);

  return (
    <div className="sf-cso" role="dialog" aria-modal="true" aria-label={`Character overview — ${m.name}`}>
      <div className="sf-cso__scrim" onClick={onClose} />
      <div className="sf-cso__stage">
        <div className="sf-cso__chrome">
          {canCopy ? (
            <button type="button" className={"sf-cso__copy is-" + copy} onClick={copyCard} disabled={copy === "working"}>
              <Icon name={COPY_LABEL[copy].icon} /> {COPY_LABEL[copy].text}
            </button>
          ) : null}
          <IconButton label="Close overview" variant="ghost" onClick={onClose}><Icon name="x" /></IconButton>
        </div>

        <div className="sf-cso__fit" ref={fitRef}>
          <article className="sf-cso__card" ref={cardRef} style={accent(m.houseTone)}>
            <header className="sf-cso__hero">
              <Crest form="lines" size={46} tint="gold" className="sf-cso__crest" />
              <div className="sf-cso__id">
                <h2 className="sf-cso__name">{m.name}</h2>
                <p className="sf-cso__sub">
                  {[m.pronouns, m.title].filter(Boolean).map((t, i) => (
                    <React.Fragment key={t}>{i ? <span className="sf-cso__dot">·</span> : null}{t}</React.Fragment>
                  ))}
                </p>
              </div>
              <div className="sf-cso__house">
                <span className="sf-cso__housename"><span className="sf-cso__pip" />{m.house || "Unhoused"}</span>
                <span className="sf-cso__housemeta">
                  {m.year ? "Year " + m.year : null}
                  {m.year && m.majors.length ? <span className="sf-cso__dot">·</span> : null}
                  {m.majors.length ? m.majors.join(" & ") : null}
                </span>
              </div>
            </header>

            <div className="sf-cso__rule" />

            {m.empty ? (
              <p className="sf-cso__none sf-cso__none--page">Nothing invested yet — allocate ranks, classes, or gear and this fills in.</p>
            ) : (
              <div className="sf-cso__grid">
                {m.stats.length ? (
                  <Section icon="hexagon" title="Stats & Skills">
                    {m.stats.map((f) => (
                      <Row key={f.id} label={f.name} tone={f.tone} badge={f.rank > 0 ? <Rank n={f.rank} /> : null}>
                        <Names entries={f.skills.map((s) => ({ name: s.name, note: String(s.rank) }))} />
                      </Row>
                    ))}
                  </Section>
                ) : null}

                {m.schools.length ? (
                  <Section icon="sparkles" title="Subjects">
                    {m.schools.map((sc) => (
                      <Row key={sc.id} label={sc.name.replace(" Magics", "")} tone={sc.tone}>
                        <Names entries={sc.subjects.map((s) => ({ name: (s.major ? "★ " : "") + s.name, note: String(s.rank) }))} />
                      </Row>
                    ))}
                  </Section>
                ) : null}

                {m.classes.length ? (
                  <Section icon="graduation-cap" title="Classes">
                    {m.classes.map((k) => (
                      <div key={k.id} className="sf-cso__class" style={accent(k.tone)}>
                        <span className="sf-cso__classname">
                          <Icon name={k.icon} /> {k.name}
                          <span className="sf-cso__numeral">{k.rankLabel}</span>
                        </span>
                        {k.abilities.length ? (
                          <ul className="sf-cso__abilities">
                            {k.abilities.map((a, i) => (
                              <li key={a + i}><span className="sf-cso__abrank">{i + 1}</span>{a}</li>
                            ))}
                          </ul>
                        ) : (
                          <em className="sf-cso__none">no abilities chosen</em>
                        )}
                      </div>
                    ))}
                  </Section>
                ) : null}

                {spellCount ? (
                  <Section icon="wand-sparkles" title="Spells" count={String(spellCount)}>
                    <Names entries={m.spells} toned />
                  </Section>
                ) : null}

                {m.inventory.length ? (
                  <Section icon="backpack" title="Inventory" count={String(itemCount)}>
                    {m.inventory.map((g) => (
                      <Row key={g.id} label={g.label}>
                        <Names entries={g.entries} />
                      </Row>
                    ))}
                  </Section>
                ) : null}
              </div>
            )}

            <footer className="sf-cso__foot">
              <span className="sf-cso__mark">Starfall Academy</span>
              <span className="sf-cso__rulemini" />
              <span className="sf-cso__markmeta">Character summary</span>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}
