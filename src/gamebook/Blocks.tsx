"use client";

import * as React from "react";
import Link from "next/link";
import type { Block, Inline } from "./markdown";
import { useCompendiumIndex, isReference } from "./widgets/CompendiumContext";
import CompendiumTerm from "./widgets/CompendiumTerm";
import StatsMatrix from "./widgets/StatsMatrix";
import HouseExplorer from "./widgets/HouseExplorer";
import TableScene from "./widgets/TableScene";
import { buildCast } from "./cast";

/* ===========================================================================
   Renders the parsed gamebook block tree.
   ---------------------------------------------------------------------------
   Runs on the client because two things here are interactive: the Compendium
   term scanner (which needs the live Compendium) and the embedded explorers.
   The tree itself is built on the server and passed down as plain JSON.
   =========================================================================== */

const WIDGETS: Record<string, React.ComponentType> = {
  "stats-matrix": StatsMatrix,
  "house-explorer": HouseExplorer,
};

/** Turn a bare "#anchor" from the ported prose into a real cross-part link. */
function useHref(anchorIndex: Record<string, string>, partSlug: string) {
  return React.useCallback(
    (href: string) => {
      if (!href.startsWith("#")) return href;
      const anchor = href.slice(1);
      const owner = anchorIndex[anchor];
      if (!owner || owner === partSlug) return href;
      return `/gamebook/${owner}#${anchor}`;
    },
    [anchorIndex, partSlug]
  );
}

/* --------------------------- compendium scanning -------------------------- */

/** Split a run of prose into plain text and Compendium references. */
function LinkedText({ text }: { text: string }) {
  const { matcher, byName } = useCompendiumIndex();

  if (!matcher || !text) return <>{text}</>;

  const out: React.ReactNode[] = [];
  let last = 0;

  // matchAll builds its own regex internally, so the shared matcher's lastIndex
  // is never mutated — important, since it is reused across every text node.
  for (const m of text.matchAll(matcher)) {
    if (!isReference(m[0])) continue;
    const entry = byName.get(m[0].toLowerCase());
    if (!entry || m.index === undefined) continue;
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<CompendiumTerm key={`${m.index}-${m[0]}`} text={m[0]} entry={entry} />);
    last = m.index + m[0].length;
  }

  if (!out.length) return <>{text}</>;
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

function Inlines({
  nodes,
  href,
}: {
  nodes: Inline[];
  href: (h: string) => string;
}) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.kind) {
          case "text":
            return <LinkedText key={i} text={n.text} />;
          case "strong":
            return (
              <strong key={i}>
                <Inlines nodes={n.children} href={href} />
              </strong>
            );
          case "em":
            return (
              <em key={i}>
                <Inlines nodes={n.children} href={href} />
              </em>
            );
          case "cue":
            return (
              <span key={i} className="gb-cue">
                {n.text}
              </span>
            );
          case "break":
            return <br key={i} />;
          case "link": {
            const target = href(n.href);
            const external = /^https?:\/\//.test(target);
            return external ? (
              <a key={i} href={target} target="_blank" rel="noreferrer">
                <Inlines nodes={n.children} href={href} />
              </a>
            ) : (
              <Link key={i} href={target}>
                <Inlines nodes={n.children} href={href} />
              </Link>
            );
          }
        }
      })}
    </>
  );
}

/* -------------------------------- blocks ---------------------------------- */

export default function Blocks({
  blocks,
  anchorIndex,
  partSlug,
}: {
  blocks: Block[];
  anchorIndex: Record<string, string>;
  partSlug: string;
}) {
  const href = useHref(anchorIndex, partSlug);

  // Speaker colours are settled across the whole page, so a voice keeps the
  // same colour from the first example of play to the last.
  const cast = React.useMemo(() => buildCast(blocks), [blocks]);
  const renderInlines = React.useCallback(
    (nodes: Inline[]) => <Inlines nodes={nodes} href={href} />,
    [href]
  );

  return (
    <>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "heading": {
            const Tag = `h${b.level}` as "h2" | "h3" | "h4" | "h5";
            return (
              <Tag key={i} id={b.slug} className={`gb-h gb-h${b.level}`}>
                <a className="gb-h__anchor" href={`#${b.slug}`} aria-label={`Link to ${b.text}`}>
                  #
                </a>
                {b.text}
              </Tag>
            );
          }

          case "para":
            return (
              <p key={i} className="gb-p">
                <Inlines nodes={b.children} href={href} />
              </p>
            );

          case "list":
            return b.ordered ? (
              <ol key={i} className="gb-list gb-list--ol">
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Inlines nodes={it} href={href} />
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={i} className="gb-list">
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Inlines nodes={it} href={href} />
                  </li>
                ))}
              </ul>
            );

          case "table":
            return (
              <figure key={i} className="gb-table-wrap">
                {b.caption && <figcaption className="gb-table__caption">{b.caption}</figcaption>}
                <div className="gb-table__scroll">
                  <table className="gb-table">
                    <thead>
                      <tr>
                        {b.head.map((c, j) => (
                          <th key={j}>
                            <Inlines nodes={c} href={href} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {b.rows.map((row, j) => (
                        <tr key={j}>
                          {row.map((c, k) => (
                            <td key={k}>
                              <Inlines nodes={c} href={href} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </figure>
            );

          case "dialog":
            return <TableScene key={i} entries={b.entries} cast={cast} render={renderInlines} />;

          case "quote":
            return (
              <blockquote key={i} className="gb-quote">
                <Inlines nodes={b.children} href={href} />
              </blockquote>
            );

          case "widget": {
            const W = WIDGETS[b.name];
            return W ? <W key={i} /> : null;
          }
        }
      })}
    </>
  );
}
