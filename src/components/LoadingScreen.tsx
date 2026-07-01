"use client";

import { useEffect, useState, type CSSProperties } from "react";
import "./LoadingScreen.css";

/**
 * Animated loading screen for Starfall Academy.
 *
 * A direct port of the Claude Design handoff (Loading.dc.html) onto the app's
 * shared design system: a breathing, gilded crest over a midnight vignette,
 * rising sparks, and a rotating line of Academy "decrees" beneath an
 * indeterminate (or determinate) progress rule.
 *
 * Two modes:
 *   - "indeterminate" (default): a sweeping bar for waits of unknown length.
 *   - "determinate": pass `progress` (0–100) to drive the fill and percentage.
 *
 * Use as a route-level `loading.tsx`, or as an `overlay` that the host fades
 * out once the real content is ready (see `done`).
 */

type Props = {
  /** Eyebrow label above the decree line. */
  eyebrow?: string;
  /** "indeterminate" sweeps; "determinate" reflects `progress`. */
  mode?: "indeterminate" | "determinate";
  /** 0–100, used in determinate mode. */
  progress?: number;
  /** Override the rotating flavor lines. */
  decrees?: string[];
  /** Render fixed as a fading overlay rather than a standalone screen. */
  overlay?: boolean;
  /** When true (overlay mode), fade out and stop intercepting pointer events. */
  done?: boolean;
};

// Spark positions/timings copied from the handoff so the rise reads the same.
const SPARKS = [
  { left: "32%", dur: "3.4s", delay: "0s" },
  { left: "41%", dur: "4.1s", delay: "0.9s" },
  { left: "48%", dur: "3.0s", delay: "1.8s" },
  { left: "50%", dur: "3.8s", delay: "0.4s" },
  { left: "53%", dur: "4.4s", delay: "2.3s" },
  { left: "59%", dur: "3.2s", delay: "1.2s" },
  { left: "66%", dur: "4.0s", delay: "0.6s" },
  { left: "38%", dur: "3.6s", delay: "2.7s" },
  { left: "62%", dur: "3.5s", delay: "1.6s" },
];

// Academy flavor lines (from the handoff's decrees.txt).
const DEFAULT_DECREES = [
  "Semper ad astra.",
  "Racing wyverns...",
  "Resolving a fight in the Great Hall...",
  "Stay out of trouble.",
  "Consulting the grimoires...",
  "The fetch hound is working diligently.",
  "Awakening dragons...",
  "Consulting diviners...",
  "Wands out.",
  "Banishing demons...",
  "Never trust the fey.",
  "Keep storming.",
  "Eye on the sigil.",
  "Stormstepping...",
  "Casting Shatter...",
  "Consulting the ley lines...",
  "Learning a new spell...",
  "Calming duelbirds...",
  "Planning a heist...",
  "As long as stars shine.",
  "The Academy has stood for centuries. Don't mess it up.",
  "One star is near invisible. Stars shining together form a constellation.",
  "Never fight a dragon.",
  "The smaller the dragon, the bigger the ego.",
  "Consulting masterminds...",
  "Magic wants to be used. That's its most dangerous characteristic.",
  "The pursuit of the arcane is the pursuit of greatness.",
  "The quiet wand casts the loudest spells.",
  "By finding ourselves, we find each other.",
  "You are not smarter than the demon.",
];

export default function LoadingScreen({
  eyebrow = "Starfall Academy",
  mode = "indeterminate",
  progress = 0,
  decrees,
  overlay = false,
  done = false,
}: Props) {
  const lines = decrees && decrees.length ? decrees : DEFAULT_DECREES;
  const [decree, setDecree] = useState(() => lines[Math.floor(Math.random() * lines.length)]);

  // Rotate the decree, avoiding an immediate repeat when possible.
  useEffect(() => {
    const id = setInterval(() => {
      setDecree((current) => {
        if (lines.length <= 1) return lines[0];
        let next = current;
        let guard = 0;
        while (next === current && guard++ < 8) {
          next = lines[Math.floor(Math.random() * lines.length)];
        }
        return next;
      });
    }, 3400);
    return () => clearInterval(id);
  }, [lines]);

  const determinate = mode === "determinate";
  const pct = `${Math.max(0, Math.min(100, Math.round(progress)))}%`;

  const className = [
    "sa-loading",
    overlay && "sa-loading--overlay",
    overlay && done && "sa-loading--hidden",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} role="status" aria-live="polite" aria-busy={!done}>
      <div className="sa-loading__sparks">
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="sa-loading__spark"
            style={
              {
                left: s.left,
                "--spark-dur": s.dur,
                animationDelay: s.delay,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="sa-loading__crest">
        <div className="sa-loading__halo" />
        <div className="sa-loading__crest-frame">
          {/* eslint-disable-next-line @next/next/no-img-element -- tinted/clipped line art, not content imagery */}
          <img
            src="/coming-soon/assets/crest-lines.png"
            alt=""
            className="sa-loading__crest-img sa-loading__crest-img--base"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- second copy drives the sheen sweep */}
          <img
            src="/coming-soon/assets/crest-lines.png"
            alt=""
            className="sa-loading__crest-img sa-loading__crest-img--sheen"
          />
        </div>
      </div>

      <div className="sa-loading__text">
        <div className="sa-loading__eyebrow">{eyebrow}</div>
        <div className="sa-loading__decree-slot">
          <div key={decree} className="sa-loading__decree">
            {decree}
          </div>
        </div>
      </div>

      <div className="sa-loading__track">
        {determinate ? (
          <div className="sa-loading__fill" style={{ width: pct }} />
        ) : (
          <div className="sa-loading__fill sa-loading__fill--indeterminate" />
        )}
      </div>

      {determinate && <div className="sa-loading__pct">{pct}</div>}
    </div>
  );
}
