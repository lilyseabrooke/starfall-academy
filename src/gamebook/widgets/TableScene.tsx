"use client";

import * as React from "react";
import type { DialogEntry, Inline, Roll } from "../markdown";
import { type Cast, initials } from "../cast";
import { resolveTotal } from "../rolls";
import DiceRoll from "./DiceRoll";

/* ===========================================================================
   An example of play.
   ---------------------------------------------------------------------------
   These are transcripts of a real table, and the thing a reader most needs
   from them is to keep four voices straight while the rules being taught go
   past. As one column of prose that is hard work; as a feed of messages, each
   in its speaker's colour, it is nearly free.

   The header names the cast, and hovering — or clicking, to pin it — follows
   one voice through the scene: their lines come forward and everyone else
   recedes. Rolls are drawn as cards rather than described in parentheses;
   beats are the things that happen without anybody saying them.
   =========================================================================== */

type Rendered = React.ReactNode;

/* ------------------------------ the cast strip ---------------------------- */

interface Member {
  speaker: string;
  /** Whoever they most often speak as, for the chip's second line. */
  character: string | null;
  gm: boolean;
}

function castOf(entries: DialogEntry[], cast: Cast): Member[] {
  const seen = new Map<string, Member>();

  for (const entry of entries) {
    if (entry.kind !== "line" || !entry.speaker) continue;
    const existing = seen.get(entry.speaker);
    if (existing) {
      // A GM who steps into an NPC mid-scene keeps her billing as the GM.
      if (!existing.character && entry.character) existing.character = entry.character;
      continue;
    }
    seen.set(entry.speaker, {
      speaker: entry.speaker,
      character: entry.character,
      gm: !!cast.gm[entry.speaker],
    });
  }

  return [...seen.values()];
}

/* --------------------------------- entries -------------------------------- */

/**
 * Consecutive lines from one speaker are one run: the token and the name are
 * drawn once and the rest of the run tucks under them, the way a chat log
 * does. It keeps a long back-and-forth from turning into a wall of labels.
 */
function isContinuation(entries: DialogEntry[], i: number): boolean {
  const entry = entries[i];
  const before = entries[i - 1];
  return (
    !!before &&
    entry.kind === "line" &&
    before.kind === "line" &&
    !!entry.speaker &&
    before.speaker === entry.speaker
  );
}

export default function TableScene({
  entries,
  cast,
  render,
}: {
  entries: DialogEntry[];
  cast: Cast;
  /** Inline rendering is owned by the page — it resolves cross-part links. */
  render: (nodes: Inline[]) => Rendered;
}) {
  const members = React.useMemo(() => castOf(entries, cast), [entries, cast]);
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [pinned, setPinned] = React.useState<string | null>(null);
  const focused = pinned ?? hovered;

  const rollCount = entries.reduce((n, e) => n + (e.kind === "rolls" ? e.rolls.length : 0), 0);

  return (
    <figure className="gb-scene" data-focused={focused ? "" : undefined}>
      <figcaption className="gb-scene__head">
        <span className="gb-scene__label">At the table</span>

        <ul className="gb-scene__cast">
          {members.map((m) => (
            <li key={m.speaker}>
              <button
                type="button"
                className="gb-scene__member"
                data-tone={cast.tone[m.speaker]}
                data-state={focused === m.speaker ? "on" : focused ? "off" : undefined}
                aria-pressed={pinned === m.speaker}
                onMouseEnter={() => setHovered(m.speaker)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(m.speaker)}
                onBlur={() => setHovered(null)}
                onClick={() => setPinned((p) => (p === m.speaker ? null : m.speaker))}
                title={`Follow ${m.speaker} through this scene`}
              >
                <span className="gb-scene__token" aria-hidden="true">
                  {initials(m.speaker)}
                </span>
                <span className="gb-scene__names">
                  <span className="gb-scene__player">{m.speaker}</span>
                  {m.character && <span className="gb-scene__role">{m.gm ? m.character : `as ${m.character}`}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {rollCount > 0 && (
          <span className="gb-scene__meta">
            {rollCount} roll{rollCount === 1 ? "" : "s"}
          </span>
        )}
      </figcaption>

      <ol className="gb-scene__feed">
        {entries.map((entry, i) => {
          if (entry.kind === "beat") {
            // Following one voice sets everything that isn't theirs back.
            return (
              <li key={i} className="gb-beat" data-state={focused ? "off" : undefined}>
                <span className="gb-beat__text">{render(entry.children)}</span>
              </li>
            );
          }

          if (entry.kind === "rolls") {
            // Two rolls side by side are the two halves of a contest, and each
            // is resolved against the other rather than against a DC.
            const contest = entry.rolls.length === 2;
            return (
              <li
                key={i}
                className="gb-rolls"
                data-contest={contest ? "" : undefined}
                data-state={
                  focused ? (entry.rolls.some((r) => r.who === focused) ? "on" : "off") : undefined
                }
              >
                {entry.rolls.map((roll: Roll, j) => (
                  <React.Fragment key={j}>
                    {contest && j === 1 && (
                      <span className="gb-rolls__vs" aria-hidden="true">
                        {resolveTotal(entry.rolls[0]) === resolveTotal(entry.rolls[1]) ? "ties" : "vs"}
                      </span>
                    )}
                    <DiceRoll
                      roll={roll}
                      tone={cast.tone[roll.who] ?? "teal"}
                      opponent={contest ? entry.rolls[1 - j] : undefined}
                    />
                  </React.Fragment>
                ))}
              </li>
            );
          }

          const cont = isContinuation(entries, i);
          return (
            <li
              key={i}
              className="gb-msg"
              data-tone={cast.tone[entry.speaker] ?? "teal"}
              data-gm={cast.gm[entry.speaker] ? "" : undefined}
              data-cont={cont ? "" : undefined}
              data-state={focused ? (focused === entry.speaker ? "on" : "off") : undefined}
              onMouseEnter={() => setHovered(entry.speaker || null)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="gb-msg__token" aria-hidden="true">
                {cont ? "" : initials(entry.speaker)}
              </span>
              <div className="gb-msg__body">
                {!cont && entry.speaker && (
                  <span className="gb-msg__who">
                    {entry.speaker}
                    {entry.character && (
                      <span className="gb-msg__as">
                        {cast.gm[entry.speaker] && /\bGM\b|Game Master/i.test(entry.character)
                          ? entry.character
                          : `as ${entry.character}`}
                      </span>
                    )}
                  </span>
                )}
                <p className="gb-msg__text">{render(entry.body)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
