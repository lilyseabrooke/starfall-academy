"use client";

import * as React from "react";
import Link from "next/link";
import type { CompendiumEntry } from "@/sheet/types";

/* ===========================================================================
   An inline Compendium reference.
   ---------------------------------------------------------------------------
   Renders the term as it appeared in the prose, with the live entry available
   on hover or focus. Keyboard users get it on focus; the card is dismissible
   with Escape. The card is presentational — the link out to the Compendium is
   what actually navigates.
   =========================================================================== */

const CAT_LABEL: Record<string, string> = {
  spell: "Spell",
  potion: "Potion",
  wand: "Wand",
  artifact: "Artifact",
  glyph: "Glyph",
  plant: "Plant",
  item: "Item",
};

const CAT_TAB: Record<string, string> = {
  spell: "Spells",
  potion: "Potions",
  wand: "Wands",
  artifact: "Artifacts",
  glyph: "Glyphs",
  plant: "Plants",
  item: "Items",
};

export default function CompendiumTerm({
  text,
  entry,
}: {
  text: string;
  entry: CompendiumEntry;
}) {
  const [open, setOpen] = React.useState(false);

  const meta = [
    entry.subject || entry.school,
    entry.level && entry.level !== "—" ? entry.level : null,
    entry.cost != null && entry.cost !== "" ? `${entry.cost} materials` : null,
  ].filter(Boolean);

  return (
    <span
      className="gb-term"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="gb-term__trigger"
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {text}
      </button>

      {open && (
        <span className="gb-term__card" role="tooltip">
          <span className="gb-term__card-head">
            <strong>{entry.name}</strong>
            <em>{CAT_LABEL[entry.cat] ?? entry.cat}</em>
          </span>
          {meta.length > 0 && <span className="gb-term__card-meta">{meta.join(" · ")}</span>}
          {entry.desc && <span className="gb-term__card-desc">{entry.desc}</span>}
          <Link
            className="gb-term__card-link"
            href={`/compendium?tab=${CAT_TAB[entry.cat] ?? ""}`}
          >
            Open in the Compendium →
          </Link>
        </span>
      )}
    </span>
  );
}
