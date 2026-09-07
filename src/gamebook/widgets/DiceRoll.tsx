"use client";

import * as React from "react";
import type { Roll } from "../markdown";
import type { Tone } from "../cast";
import { resolveRoll, faceMeaning, type Resolved } from "../rolls";
import Tip from "./Tip";

/* ===========================================================================
   A roll, as the table saw it.
   ---------------------------------------------------------------------------
   The examples of play used to describe their dice in a parenthetical — "(Ahmed
   rolls 2d10 and gets a 2 and a 4, and adds his character Carlos's Logic, 0,
   and Analyze rank, 0, for a 6.)" — which is a lot of prose for a sum. Here
   the sum is laid out the way the character sheet lays out a roll: the faces
   in squares, the modifiers after them, the total, then the degrees.

   Only the numbers are on the card. What each one is comes on hover, so a
   reader who already knows how a check works just reads the arithmetic.
   =========================================================================== */

const signed = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n)}`;

/** The sum spelled back out, for the total's hover. */
function sumDetail(roll: Roll, r: Resolved): string {
  const parts: string[] = [];
  if (r.dice.kind === "faces") parts.push(`${r.dice.dice.join(" + ")} on the dice`);
  else if (r.dice.kind === "pool") parts.push(`${r.dice.total} on the dice`);
  for (const m of roll.mods) parts.push(`${signed(m.value)} ${m.label}`);
  if (!parts.length) return `A total of ${r.total}, as the example reports it.`;
  return `${parts.join(", ")} — ${r.total}.`;
}

export default function DiceRoll({ roll, tone, opponent }: { roll: Roll; tone: Tone; opponent?: Roll }) {
  const resolved = resolveRoll(roll, opponent);
  const shape = resolved.dice;
  const verdict = resolved.verdict;

  return (
    <div className="gb-roll" data-tone={tone} data-outcome={verdict?.tone}>
      <div className="gb-roll__head">
        <span className="gb-roll__who">
          {roll.who}
          {roll.as && <span className="gb-roll__as">as {roll.as}</span>}
        </span>
        {resolved.target && (
          <Tip
            className="gb-roll__target"
            detail={
              resolved.target.contested
                ? `A contest: this roll is measured against ${resolved.target.label}'s ${resolved.target.total} rather than a flat number, and a tie stays a tie.`
                : "The Difficulty Class to beat. Meeting it counts as clearing it, and every full 5 beyond is another degree."
            }
          >
            {resolved.target.contested ? "vs" : "DC"} {resolved.target.total}
          </Tip>
        )}
      </div>

      <div className="gb-roll__sum">
        {shape.kind === "faces" ? (
          shape.dice.map((face, i) => (
            <Tip
              key={i}
              className={`gb-num gb-num--die${face === 10 ? " is-ten" : face === 1 ? " is-one" : ""}`}
              detail={faceMeaning(face, shape.dice)}
            >
              {face}
            </Tip>
          ))
        ) : shape.kind === "pool" ? (
          <Tip
            className="gb-num gb-num--wide"
            detail={`${shape.total} across both dice. This example gave the dice as one number, so the individual faces aren't known — which also means there is no telling whether either was a critical.`}
          >
            {shape.total}
          </Tip>
        ) : (
          <Tip
            className="gb-num gb-num--wide gb-num--unknown"
            detail="This example gives the total only. The dice behind it aren't written down, so they aren't guessed at here."
          >
            2d10
          </Tip>
        )}

        {roll.mods.map((m, i) => (
          <Tip key={i} className="gb-num gb-num--mod" detail={m.label}>
            {signed(m.value)}
          </Tip>
        ))}

        <span className="gb-roll__eq" aria-hidden="true">
          =
        </span>
        <Tip className="gb-num gb-num--total" detail={sumDetail(roll, resolved)}>
          {resolved.total}
        </Tip>
      </div>

      {(verdict || resolved.flair) && (
        <div className="gb-roll__foot">
          {verdict && (
            <Tip className="gb-roll__verdict" detail={verdict.detail || verdict.label}>
              <span className="gb-roll__pips" aria-hidden="true">
                {Array.from({ length: Math.min(verdict.degrees, 6) }).map((_, i) => (
                  <i key={i} />
                ))}
              </span>
              {verdict.label}
            </Tip>
          )}
          {resolved.flair && (
            <span className="gb-roll__flair" data-flair={resolved.flair}>
              {resolved.flair === "inflection"
                ? "Inflection Point"
                : resolved.flair === "crit-success"
                  ? "Critical success"
                  : "Critical failure"}
            </span>
          )}
        </div>
      )}

      {roll.note && <p className="gb-roll__note">{roll.note}</p>}
    </div>
  );
}
