"use client";

import * as React from "react";
import Link from "next/link";
import type { Heading } from "./markdown";
import type { PartMeta } from "./parts";

/* ===========================================================================
   The gamebook rail: which part you're in, and where you are inside it.
   ---------------------------------------------------------------------------
   Scroll-spy uses IntersectionObserver against a band near the top of the
   viewport, so the highlighted entry is the heading you're actually reading
   rather than whichever one last crossed the top edge.
   =========================================================================== */

export default function Toc({
  headings,
  parts,
  activePart,
}: {
  headings: Heading[];
  parts: PartMeta[];
  activePart: string;
}) {
  // Only H2 and H3 make the rail; H4/H5 are too fine-grained for 20k words.
  const entries = React.useMemo(
    () => headings.filter((h) => h.level === 2 || h.level === 3),
    [headings]
  );

  const [active, setActive] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLOListElement>(null);

  React.useEffect(() => {
    if (!entries.length) return;

    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (records) => {
        for (const r of records) seen.set(r.target.id, r.isIntersecting);
        // The first heading currently inside the band wins.
        const current = entries.find((e) => seen.get(e.slug));
        if (current) setActive(current.slug);
      },
      { rootMargin: "-72px 0px -72% 0px", threshold: 0 }
    );

    for (const e of entries) {
      const el = document.getElementById(e.slug);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [entries]);

  // Keep the active rail entry scrolled into view within the rail itself.
  React.useEffect(() => {
    if (!active || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-slug="${CSS.escape(active)}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  // On narrow screens the rail sits above the chapter, so the heading list is
  // collapsed by default — otherwise the reader lands on a wall of contents
  // instead of the text. The class is all the CSS needs; on wide screens the
  // list is shown regardless of this state.
  const [open, setOpen] = React.useState(false);

  return (
    <nav className={`gb-rail${open ? " is-open" : ""}`} aria-label="Gamebook contents">
      <ol className="gb-rail__parts">
        {parts.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/gamebook/${p.slug}`}
              className={`gb-rail__part${p.slug === activePart ? " is-active" : ""}`}
            >
              <span className="gb-rail__numeral">{p.numeral}</span>
              {p.title}
            </Link>
          </li>
        ))}
      </ol>

      <div className="gb-rail__divider" />

      <button
        type="button"
        className="gb-rail__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>In this part</span>
        <span aria-hidden="true">{open ? "–" : "+"}</span>
      </button>

      <ol className="gb-rail__list" ref={listRef}>
        {entries.map((h) => (
          <li key={h.slug} data-slug={h.slug}>
            <a
              href={`#${h.slug}`}
              className={`gb-rail__link gb-rail__link--h${h.level}${
                h.slug === active ? " is-active" : ""
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
