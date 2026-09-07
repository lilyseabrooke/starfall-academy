"use client";

import * as React from "react";
import { Dices, RotateCcw } from "lucide-react";
import type { Roll } from "../markdown";
import type { Tone } from "../cast";
import { resolveRoll, verdictFor, faceMeaning, type Resolved } from "../rolls";
import { d10 } from "@/sheet/data/roll-engine";
import Tip from "./Tip";

/* ===========================================================================
   A roll, as the table saw it.
   ---------------------------------------------------------------------------
   The examples of play used to describe their dice in a parenthetical — "(Ahmed
   rolls 2d10 and gets a 2 and a 4, and adds his character Carlos's Logic, 0,
   and Analyze rank, 0, for a 6.)" — which is a lot of prose for a sum. Here
   the sum is drawn: faces, then the modifiers that stack onto them, then the
   total, then how it landed against the DC.

   Every piece explains itself on hover, so the arithmetic the parenthetical
   used to spell out is still there for anyone who wants it, and a reader who
   already knows how a check works can just read the numbers.
   =========================================================================== */

/* --------------------------------- pieces --------------------------------- */

/** The d10 silhouette. Drawn once, filled with whatever face came up. */
function Die({ value, dice }: { value: number; dice: number[] }) {
  const flair = dice.includes(1) && dice.includes(10) ? "inflection" : value === 10 ? "high" : value === 1 ? "low" : null;

  return (
    <Tip className="gb-die" detail={faceMeaning(value, dice)}>
      <svg className="gb-die__face" viewBox="0 0 24 24" aria-hidden="true" data-flair={flair}>
        <path d="M12 1.4 23 9.2 19.2 20.4 12 22.8 4.8 20.4 1 9.2Z" />
        <path className="gb-die__facet" d="M12 1.4 4.8 20.4M12 1.4 19.2 20.4M1 9.2 12 13.4 23 9.2" />
      </svg>
      <span className="gb-die__value">{value}</span>
    </Tip>
  );
}

/** What the dice contributed, for examples that never split the two faces. */
function Pool({ total }: { total: number }) {
  return (
    <Tip
      className="gb-die gb-die--pool"
      detail={`${total} across both dice. This example gave the dice as one number, so the individual faces aren't known — which also means there is no telling whether either of them was a critical.`}
    >
      <span className="gb-die__value">{total}</span>
      <span className="gb-die__sub">2d10</span>
    </Tip>
  );
}

/** For examples that print a total and skip the working entirely. */
function UnknownDice() {
  return (
    <Tip
      className="gb-die gb-die--unknown"
      detail="This example gives the total only. The dice behind it aren't written down, so they aren't guessed at here."
    >
      <span className="gb-die__value">?</span>
      <span className="gb-die__sub">2d10</span>
    </Tip>
  );
}

const signed = (n: number) => (n < 0 ? `− ${Math.abs(n)}` : `+ ${n}`);

function Modifier({ label, value }: { label: string; value: number }) {
  const detail =
    value === 0
      ? `${label} adds nothing here — a rank of 0 still gets named, so you can see it was counted.`
      : `${label} adds ${value < 0 ? "−" : "+"}${Math.abs(value)} to the total.`;

  return (
    <Tip className="gb-roll__mod" detail={detail}>
      <span className="gb-roll__mod-op">{value < 0 ? "−" : "+"}</span>
      <span className="gb-roll__mod-value">{Math.abs(value)}</span>
      <span className="gb-roll__mod-label">{label}</span>
    </Tip>
  );
}

/** The sum, spelled back out in words for the hover. */
function sumDetail(roll: Roll, r: Resolved): string {
  const parts: string[] = [];
  if (r.dice.kind === "faces") parts.push(r.dice.dice.join(" + ") + " on the dice");
  else if (r.dice.kind === "pool") parts.push(`${r.dice.total} on the dice`);
  for (const m of roll.mods) parts.push(`${signed(m.value)} ${m.label}`);
  if (!parts.length) return `A total of ${r.total}, as the example reports it.`;
  return `${parts.join(", ")} — ${r.total}.`;
}

/* -------------------------------- the card -------------------------------- */

/** A trial of the same check, rolled fresh by whoever is reading. */
interface Trial {
  dice: number[];
  total: number;
  verdict: string;
}

export default function DiceRoll({ roll, tone, opponent }: { roll: Roll; tone: Tone; opponent?: Roll }) {
  const resolved = resolveRoll(roll, opponent);
  const shape = resolved.dice;
  const [trial, setTrial] = React.useState<Trial | null>(null);

  // Rolling along is only offered where the card knows the whole sum: a fresh
  // 2d10 under the same modifiers, against the same number.
  const canTry = resolved.target != null && roll.declaredTotal == null && shape.kind === "faces";

  const rollAgain = () => {
    const dice = [d10(), d10()];
    const total = dice[0] + dice[1] + resolved.modTotal;
    setTrial({ dice, total, verdict: verdictFor(total, resolved.target!).label });
  };

  return (
    <div className="gb-roll" data-tone={tone}>
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
                : `The Difficulty Class to beat. Meeting it counts as clearing it, and every full 5 beyond is another degree.`
            }
          >
            {resolved.target.contested ? `vs ${resolved.target.total}` : `DC ${resolved.target.total}`}
          </Tip>
        )}
      </div>

      <div className="gb-roll__sum">
        {shape.kind === "faces" ? (
          shape.dice.map((face, i) => <Die key={i} value={face} dice={shape.dice} />)
        ) : shape.kind === "pool" ? (
          <Pool total={shape.total} />
        ) : (
          <UnknownDice />
        )}

        {roll.mods.map((m, i) => (
          <Modifier key={i} label={m.label} value={m.value} />
        ))}

        <span className="gb-roll__eq" aria-hidden="true">
          =
        </span>
        <Tip className="gb-roll__total" detail={sumDetail(roll, resolved)}>
          {resolved.total}
        </Tip>
      </div>

      <div className="gb-roll__foot">
        {resolved.verdict && (
          <Tip className="gb-roll__verdict" detail={resolved.verdict.detail || resolved.verdict.label}>
            <span className="gb-roll__verdict-dot" data-verdict={resolved.verdict.tone} aria-hidden="true" />
            {resolved.verdict.label}
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

        {canTry && (
          <button type="button" className="gb-roll__try-btn" onClick={rollAgain}>
            <Dices size={13} aria-hidden="true" />
            {trial ? "Again" : "Try it"}
          </button>
        )}
      </div>

      {roll.note && <p className="gb-roll__note">{roll.note}</p>}

      {trial && (
        <p className="gb-roll__try">
          <span className="gb-roll__try-label">Your roll</span>
          <span className="gb-roll__try-result">
            <span className="gb-roll__try-dice">
              {trial.dice[0]}, {trial.dice[1]}
            </span>
            {resolved.modTotal !== 0 && <span> {signed(resolved.modTotal)}</span>}
            {" = "}
            <span className="gb-roll__try-total">{trial.total}</span>
          </span>
          <span className="gb-roll__try-verdict">{trial.verdict}</span>
          <button
            type="button"
            className="gb-roll__try-reset"
            onClick={() => setTrial(null)}
            aria-label="Clear your roll and go back to the example"
          >
            <RotateCcw size={12} aria-hidden="true" />
          </button>
        </p>
      )}
    </div>
  );
}
