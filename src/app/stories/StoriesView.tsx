"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Feather,
  Library,
  ScrollText,
  Search,
  X,
} from "lucide-react";
import HudTopBar, { DISCORD_INVITE_URL } from "@/components/HudTopBar";
import { APP_VERSION } from "@/lib/version";
import "@/styles/landing.css";
import "@/styles/stories.css";

export type StoryCard = {
  id: string;
  title: string;
  author: string;
  docUrl: string;
  /** ISO timestamp — used for sorting only. */
  createdAt: string;
  /** Pre-formatted on the server so the two renders agree. */
  dateLabel: string;
  accession: string;
  initial: string;
};

type SortKey = "newest" | "oldest" | "title" | "author";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "title", label: "Title" },
  { key: "author", label: "Author" },
];

const TONES = ["gold", "plum", "teal", "forest", "crimson"] as const;

// Tales by the same hand share a colour, so the shelf reads as an author's
// collection at a glance. Deterministic so it survives a re-render.
function toneFor(author: string) {
  let hash = 0;
  for (let i = 0; i < author.length; i++) {
    hash = (hash * 31 + author.charCodeAt(i)) >>> 0;
  }
  return TONES[hash % TONES.length];
}

function compare(sort: SortKey) {
  return (a: StoryCard, b: StoryCard) => {
    switch (sort) {
      case "oldest":
        return a.createdAt.localeCompare(b.createdAt);
      case "title":
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      case "author":
        return (
          a.author.localeCompare(b.author, undefined, { sensitivity: "base" }) ||
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
        );
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  };
}

export default function StoriesView({
  stories,
  failed,
  signedIn,
}: {
  stories: StoryCard[];
  failed: boolean;
  signedIn: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const authors = useMemo(
    () => new Set(stories.map((s) => s.author.trim().toLowerCase())).size,
    [stories]
  );

  const shelf = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? stories.filter(
          (s) =>
            s.title.toLowerCase().includes(needle) ||
            s.author.toLowerCase().includes(needle)
        )
      : stories;
    return [...matched].sort(compare(sort));
  }, [stories, query, sort]);

  const searching = query.trim().length > 0;

  return (
    <div className="lp-root">
      <HudTopBar signedIn={signedIn} title="The Archive" />

      <main className="sf-main">
        <div className="sf-watermark" aria-hidden="true" />

        <section className="sf-section">
          {/* -------------------- HEADING -------------------- */}
          <div className="sf-head">
            <div>
              <div className="sf-eyebrow">
                <span className="sf-eyebrow__rule" />
                The Archive · {stories.length}{" "}
                {stories.length === 1 ? "story" : "stories"} catalogued
                {authors > 0 && (
                  <>
                    {" · "}
                    {authors} {authors === 1 ? "author" : "authors"}
                  </>
                )}
              </div>
              <h1 className="sf-title">Stories</h1>
              <p className="sf-lede">
                Stories of love, magic, and getting into trouble told by the
                Starfall community. Click a link to open a story, or{" "}
                <a
                  href={DISCORD_INVITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  submit your own here
                </a>
                .
              </p>
            </div>
            {/* An empty archive gets its call to action from the panel below,
                so the header keeps a single gold button on screen. */}
            {stories.length > 0 && (
              <a
                className="sa-btn-primary sf-submit"
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Feather size={17} aria-hidden="true" />
                Submit a Story
              </a>
            )}
          </div>

          <div className="sf-rule" />

          {failed && (
            <p className="sf-error">
              We&apos;re sorry. The fetch hound is sleeping. Try again later.
            </p>
          )}

          {/* -------------------- TOOLBAR -------------------- */}
          {stories.length > 0 && (
            <div className="sf-toolbar">
              <div className="sf-search">
                <span className="sf-search__icon">
                  <Search size={15} aria-hidden="true" />
                </span>
                <input
                  className="sa-input-ml sf-search__input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by title or author"
                  aria-label="Search stories by title or author"
                />
                {searching && (
                  <button
                    className="sf-search__clear"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="sf-sort" role="group" aria-label="Sort stories">
                {SORTS.map((option) => (
                  <button
                    key={option.key}
                    className="sf-sort__btn"
                    aria-pressed={sort === option.key}
                    onClick={() => setSort(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <span className="sf-count">
                {searching
                  ? `${shelf.length} of ${stories.length}`
                  : `${stories.length} on the shelf`}
              </span>
            </div>
          )}

          {/* -------------------- THE SHELF -------------------- */}
          {stories.length === 0 && !failed ? (
            <div className="sf-empty">
              <span className="sf-empty__icon">
                <Library size={26} aria-hidden="true" />
              </span>
              <h2 className="sf-empty__title">Not Much Here</h2>
              <p className="sf-empty__copy">
                What a strange twist of magic. The fetch hound has found
                nothing. Assuredly, a rascal has stolen the stories from the
                shelves. The Enforcers are on the case.
              </p>
              <a
                className="sa-btn-primary"
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Feather size={17} aria-hidden="true" />
                Submit a Story
              </a>
            </div>
          ) : shelf.length === 0 ? (
            <div className="sf-empty sf-empty--slim">
              <span className="sf-empty__icon">
                <ScrollText size={22} aria-hidden="true" />
              </span>
              <h2 className="sf-empty__title">Nothing Found</h2>
              <p className="sf-empty__copy">
                The fetch hound couldn&apos;t find anything to match “
                {query.trim()}”.
              </p>
              <button className="sa-btn-ghost" onClick={() => setQuery("")}>
                <X size={15} aria-hidden="true" />
                Clear Search
              </button>
            </div>
          ) : (
            <div className="sf-grid">
              {shelf.map((story) => (
                <a
                  key={story.id}
                  className={`sf-card sf-tone--${toneFor(story.author)}`}
                  href={story.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="sf-card__spine" aria-hidden="true" />

                  <span className="sf-card__top">
                    <span className="sf-plate">
                      <span className="sf-plate__initial">{story.initial}</span>
                    </span>
                    <span className="sf-id">
                      <span className="sf-id__accession">
                        № {story.accession}
                      </span>
                      <span className="sf-id__title">{story.title}</span>
                      <span className="sf-id__author">
                        <Feather size={13} aria-hidden="true" />
                        by {story.author}
                      </span>
                    </span>
                  </span>

                  <span className="sf-card__divider" />

                  <span className="sf-card__foot">
                    <span className="sf-card__filed">
                      Filed {story.dateLabel}
                    </span>
                    <span className="sf-card__read">
                      Read
                      <ArrowUpRight
                        className="sf-card__read-arrow"
                        size={14}
                        aria-hidden="true"
                      />
                      <span className="sf-sr"> (opens in a new tab)</span>
                    </span>
                  </span>
                </a>
              ))}

              {!searching && (
                <a
                  className="sf-newcard"
                  href={DISCORD_INVITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="sf-newcard__icon">
                    <Feather size={24} aria-hidden="true" />
                  </span>
                  <span className="sf-newcard__label">Submit a Story</span>
                  <span className="sf-newcard__sub">
                    Join the Discord community and share your stories with the
                    fetch hound.
                  </span>
                </a>
              )}
            </div>
          )}
        </section>

        <footer className="lp-footer">
          Starfall Academy · Semper Ad Astra
          <span className="lp-footer__version">v{APP_VERSION}</span>
        </footer>
      </main>
    </div>
  );
}
