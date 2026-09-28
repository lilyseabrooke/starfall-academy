"use client";

/* ===========================================================================
   Starfall Academy — Journal tab (player side)
   ---------------------------------------------------------------------------
   Two sections, one two-pane frame (page list left, page right):

     · "Shared by the Game Master" — the GM's journal pages that were marked
       shared, always read-only. They arrive already filtered by
       shared_campaign_notes(), so the GM's private prep never reaches here.
     · "Your notes" — the character's own pages, the same writing surface as
       the GM's Notes tab minus the sharing control. They live on the sheet,
       so opening a party-mate's sheet shows *their* notes instead, read-only:
       the section is headed with their name and the editor becomes a reader.
   =========================================================================== */
import * as React from "react";
import { Icon } from "../Icon";
import type { GmNote } from "../../data/gm-seed";
import type { SheetNote } from "../../types";

type Section = "gm" | "mine";
interface Selection { section: Section; id: string }

const tagsOf = (note: { tags?: string }) => (note.tags || "").split(",").map((s) => s.trim()).filter(Boolean);
const matchesTag = (note: { tags?: string }, tf: string) => !tf || tagsOf(note).some((s) => s.toLowerCase().includes(tf));

export interface JournalPageProps {
  /** Pages the GM shared with the whole table. */
  shared: GmNote[];
  /** Why the shared pages couldn't be read, if they couldn't. */
  sharedError?: string | null;
  /** Re-read the shared pages (the retry behind the error state). */
  onReloadShared?: () => void;
  /** The sheet owner's own pages. */
  notes: SheetNote[];
  /** False when this is somebody else's sheet — their notes are read-only. */
  ownsSheet: boolean;
  /** Whose notes these are, for the section heading on another's sheet. */
  ownerName: string;
  /** Null when the character isn't in a campaign — nothing can be shared yet. */
  campaignId: string | null;
  onCreate: () => string;
  onPatch: (id: string, patch: Partial<SheetNote>) => void;
  onDelete: (id: string) => void;
}

export function JournalPage({ shared, sharedError, onReloadShared, notes, ownsSheet, ownerName, campaignId, onCreate, onPatch, onDelete }: JournalPageProps) {
  const [sel, setSel] = React.useState<Selection | null>(null);
  const [tagFilter, setTagFilter] = React.useState("");
  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  const tf = tagFilter.trim().toLowerCase();
  const gmFiltered = shared.filter((n) => matchesTag(n, tf));
  const mineFiltered = notes.filter((n) => matchesTag(n, tf));

  // Fall back to the first page that still exists — the selection can outlive
  // its page (deleted, or un-shared by the GM from under us).
  const picked =
    (sel?.section === "gm" && shared.find((n) => n.id === sel.id) && { section: "gm" as const, note: shared.find((n) => n.id === sel.id)! }) ||
    (sel?.section === "mine" && notes.find((n) => n.id === sel.id) && { section: "mine" as const, note: notes.find((n) => n.id === sel.id)! }) ||
    (shared[0] ? { section: "gm" as const, note: shared[0] } : notes[0] ? { section: "mine" as const, note: notes[0] } : null);

  const emptyMessage = !ownsSheet
    ? "Nothing to read on this sheet yet."
    : campaignId
      ? "Nothing here yet — pages your Game Master shares, and pages you write, both land here."
      : "Start a page of your own — and join a campaign to read what your Game Master shares.";

  const pageButton = (section: Section, note: GmNote | SheetNote) => {
    const tags = tagsOf(note);
    const active = !!picked && picked.section === section && picked.note.id === note.id;
    const confirming = section === "mine" && confirmId === note.id;
    if (confirming) {
      return (
        <div key={note.id} className="sf-journalitem sf-journalitem--confirm">
          <span>Tear out this page?</span>
          <div className="sf-journalitem__confirmbtns">
            <button className="sf-journal__btn" onClick={() => setConfirmId(null)}>Keep</button>
            <button className="sf-journal__btn sf-journal__btn--danger" onClick={() => { onDelete(note.id); setConfirmId(null); }}><Icon name="trash-2" />Delete</button>
          </div>
        </div>
      );
    }
    return (
      <div key={note.id} className={"sf-journalitem" + (active ? " is-active" : "")}>
        <button className="sf-journalitem__sel" onClick={() => { setSel({ section, id: note.id }); setConfirmId(null); }}>
          <span className="sf-journalitem__title">{note.title}</span>
          {tags.length > 0 && <span className="sf-journalitem__tags">{tags.map((s, i) => <span key={i} className="sf-journal__tag">{s}</span>)}</span>}
        </button>
        {section === "mine" && ownsSheet && (
          <button className="sf-journalitem__del" title="Delete this page" onClick={() => setConfirmId(note.id)}><Icon name="trash-2" /></button>
        )}
      </div>
    );
  };

  return (
    <div className="sf-canvas sf-journal">
      <div className="sf-journal__list">
        <div className="sf-journal__filter">
          <Icon name="search" />
          <input value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} placeholder="Filter by tag…" aria-label="Filter journal pages by tag" />
        </div>

        <div className="sf-journal__scroll">
          <div className="sf-journal__sechead">
            <Icon name="book-open-text" />
            <span>Shared by the Game Master</span>
            <span className="sf-journal__count">{shared.length}</span>
          </div>
          <div className="sf-journal__items">
            {gmFiltered.map((n) => pageButton("gm", n))}
            {sharedError ? (
              <div className="sf-journal__sectionempty sf-journal__sectionempty--error">
                <span>The shared pages couldn’t be loaded.</span>
                {onReloadShared && <button className="sf-journal__btn" onClick={onReloadShared}><Icon name="refresh-cw" />Try again</button>}
              </div>
            ) : gmFiltered.length === 0 && (
              <div className="sf-journal__sectionempty">{shared.length ? "No shared page carries that tag." : "Nothing shared yet."}</div>
            )}
          </div>

          <div className="sf-journal__sechead">
            <Icon name="feather" />
            <span>{ownsSheet ? "Your notes" : ownerName + "’s notes"}</span>
            <span className="sf-journal__count">{notes.length}</span>
          </div>
          {ownsSheet && (
            <button className="sf-journal__new" onClick={() => { const id = onCreate(); setSel({ section: "mine", id }); setConfirmId(null); }}>
              <Icon name="feather" style={{ color: "var(--gold-300)" }} />New page
            </button>
          )}
          <div className="sf-journal__items">
            {mineFiltered.map((n) => pageButton("mine", n))}
            {mineFiltered.length === 0 && (notes.length > 0 || !ownsSheet) && (
              <div className="sf-journal__sectionempty">{notes.length ? "No note carries that tag." : "No notes yet."}</div>
            )}
          </div>
        </div>
      </div>

      <div className="sf-journal__reader">
        {picked ? (
          picked.section === "mine" && ownsSheet ? (
            <React.Fragment>
              <div className="sf-journal__titlebar">
                <Icon name="feather" />
                <input value={picked.note.title} onChange={(e) => onPatch(picked.note.id, { title: e.target.value })} aria-label="Page title" />
              </div>
              <div className="sf-journal__tagbar sf-journal__tagbar--edit">
                <Icon name="tag" />
                <input value={picked.note.tags || ""} onChange={(e) => onPatch(picked.note.id, { tags: e.target.value })} placeholder="tags, comma separated" aria-label="Page tags" />
              </div>
              <textarea className="sf-journal__editor" value={picked.note.body} onChange={(e) => onPatch(picked.note.id, { body: e.target.value })} placeholder="Write your entry here..." />
            </React.Fragment>
          ) : (
            <React.Fragment>
              <div className="sf-journal__titlebar">
                <Icon name={picked.section === "gm" ? "scroll-text" : "feather"} />
                <h2>{picked.note.title}</h2>
                <span className="sf-journal__source">{picked.section === "gm" ? "Shared by the Game Master" : ownerName + "’s note"}</span>
              </div>
              {tagsOf(picked.note).length > 0 && (
                <div className="sf-journal__tagbar">
                  <Icon name="tag" />
                  {tagsOf(picked.note).map((s, i) => <span key={i} className="sf-journal__tag">{s}</span>)}
                </div>
              )}
              <div className="sf-journal__body">{picked.note.body || "This page is blank."}</div>
            </React.Fragment>
          )
        ) : (
          <div className="sf-journal__empty"><Icon name="book-open-text" /><span>{emptyMessage}</span></div>
        )}
      </div>
    </div>
  );
}
