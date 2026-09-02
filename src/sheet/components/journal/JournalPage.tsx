"use client";

/* ===========================================================================
   Starfall Academy — Journal tab (player side)
   ---------------------------------------------------------------------------
   The read-only half of the GM's Notes tab: the pages the GM marked "Share
   with players" and nothing else. Same two-pane shape as the GM journal —
   page list on the left, the page itself on the right — but every control
   that writes (new page, delete, the title/tag/body inputs) is gone; the
   entries arrive already filtered by shared_campaign_notes().
   =========================================================================== */
import * as React from "react";
import { Icon } from "../Icon";
import type { GmNote } from "../../data/gm-seed";

const tagsOf = (note: GmNote) => (note.tags || "").split(",").map((s) => s.trim()).filter(Boolean);

export interface JournalPageProps {
  entries: GmNote[];
  /** Null when the character isn't in a campaign — nothing can be shared yet. */
  campaignId: string | null;
}

export function JournalPage({ entries, campaignId }: JournalPageProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [tagFilter, setTagFilter] = React.useState("");

  const active = entries.find((n) => n.id === activeId) || entries[0] || null;
  const tf = tagFilter.trim().toLowerCase();
  const filtered = tf ? entries.filter((n) => tagsOf(n).some((s) => s.toLowerCase().includes(tf))) : entries;

  const emptyMessage = !campaignId
    ? "Join a campaign to read the pages your Game Master shares."
    : "Nothing shared yet — pages your Game Master shares will appear here.";

  return (
    <div className="sf-canvas sf-journal">
      <div className="sf-journal__list">
        <div className="sf-journal__lead">
          <Icon name="book-open-text" style={{ color: "var(--gold-300)" }} />
          <span>Shared by the Game Master</span>
        </div>
        <div className="sf-journal__filter">
          <Icon name="search" />
          <input value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} placeholder="Filter by tag…" aria-label="Filter journal pages by tag" />
        </div>
        <div className="sf-journal__items">
          {filtered.map((n) => {
            const tags = tagsOf(n);
            return (
              <button
                key={n.id}
                className={"sf-journalitem" + (active && n.id === active.id ? " is-active" : "")}
                onClick={() => setActiveId(n.id)}
              >
                <span className="sf-journalitem__title">{n.title}</span>
                {tags.length > 0 && <span className="sf-journalitem__tags">{tags.map((s, i) => <span key={i} className="sf-journal__tag">{s}</span>)}</span>}
              </button>
            );
          })}
          {entries.length > 0 && filtered.length === 0 && (
            <div className="sf-journal__nomatch">No page carries that tag.</div>
          )}
        </div>
      </div>

      <div className="sf-journal__reader">
        {active ? (
          <React.Fragment>
            <div className="sf-journal__titlebar">
              <Icon name="scroll-text" />
              <h2>{active.title}</h2>
            </div>
            {tagsOf(active).length > 0 && (
              <div className="sf-journal__tagbar">
                <Icon name="tag" />
                {tagsOf(active).map((s, i) => <span key={i} className="sf-journal__tag">{s}</span>)}
              </div>
            )}
            <div className="sf-journal__body">{active.body || "This page is blank."}</div>
          </React.Fragment>
        ) : (
          <div className="sf-journal__empty"><Icon name="book-open-text" /><span>{emptyMessage}</span></div>
        )}
      </div>
    </div>
  );
}
