"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
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

   They open on request rather than by default: a page of rules with nine
   full transcripts inlined reads as mostly transcript, so the header — the
   label and who is at the table — stands in for a closed one, and the reader
   decides when an example is worth the room.
   =========================================================================== */

interface Member {
  speaker: string;
  /** Whoever they are playing, for the chip's second line. */
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
  render: (nodes: Inline[]) => React.ReactNode;
}) {
  const members = React.useMemo(() => castOf(entries, cast), [entries, cast]);
  const [open, setOpen] = React.useState(false);

  return (
    <details
      className="gb-scene"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="gb-scene__head">
        <span className="gb-scene__label">At the table</span>

        <ul className="gb-scene__cast">
          {members.map((m) => (
            <li key={m.speaker} className="gb-scene__member" data-tone={cast.tone[m.speaker]}>
              <span className="gb-scene__token" aria-hidden="true">
                {initials(m.speaker)}
              </span>
              <span className="gb-scene__player">{m.speaker}</span>
              {m.character && (
                <span className="gb-scene__role">{m.gm ? m.character : `as ${m.character}`}</span>
              )}
            </li>
          ))}
        </ul>

        <span className="gb-scene__toggle">
          {open ? "Hide" : "See example"}
          <ChevronDown size={14} aria-hidden="true" />
        </span>
      </summary>

      <ol className="gb-scene__feed">
        {entries.map((entry, i) => {
          if (entry.kind === "beat") {
            return (
              <li key={i} className="gb-beat">
                <span className="gb-beat__text">{render(entry.children)}</span>
              </li>
            );
          }

          if (entry.kind === "rolls") {
            // Two rolls together are the two halves of a contest, and each is
            // resolved against the other rather than against a DC.
            const contest = entry.rolls.length === 2;
            return (
              <li key={i} className="gb-rolls">
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
    </details>
  );
}
