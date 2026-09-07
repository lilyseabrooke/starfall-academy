/* ===========================================================================
   Starfall Academy — resolving the rolls in an example of play
   ---------------------------------------------------------------------------
   The examples print their rolls at whatever detail the moment needed: two
   dice and every modifier here, a bare total there. This turns whichever of
   those a `@roll` line carries into the pieces a roll card draws, and works
   out the verdict from the same rules the game uses — degrees in blocks of
   five, criticals on a natural 1 or 10, an Inflection Point on both at once.

   Nothing is inferred across fields. If an example gave only a total, the
   dice stay unknown and the card says so rather than inventing faces that
   add up.
   =========================================================================== */
import type { Roll } from "./markdown";
import { classify, degreesFor } from "@/sheet/data/roll-engine";

export type DiceShape =
  /** Both faces, as the example rolled them. */
  | { kind: "faces"; dice: number[] }
  /** The dice subtotal only — the example never split it out. */
  | { kind: "pool"; total: number }
  /** The example gave a total and nothing else. */
  | { kind: "unknown" };

export interface Verdict {
  tone: "success" | "failure" | "tie";
  /** The headline on the badge — "Two degrees of failure", "Tie". */
  label: string;
  /** How many degrees, for the pips. A tie has none. */
  degrees: number;
  /** The arithmetic behind it, for the badge's hover. */
  detail: string;
}

/** The number a roll is measured against: a flat DC, or the other side. */
export interface Target {
  total: number;
  label: string;
  /** A contest, where a tie stays a tie — unlike a DC, which a tie clears. */
  contested: boolean;
}

export interface Resolved {
  dice: DiceShape;
  /** What the dice contributed, when that is known. */
  diceTotal: number | null;
  modTotal: number;
  total: number;
  /** Dice flair, when the faces are known: a crit, or an Inflection Point. */
  flair: "crit-success" | "crit-fail" | "inflection" | null;
  /** The number this roll was measured against, if any. */
  target: Target | null;
  verdict: Verdict | null;
}

function shapeOf(roll: Roll): DiceShape {
  if (roll.dice && roll.dice.length) return { kind: "faces", dice: roll.dice };
  if (roll.pool != null) return { kind: "pool", total: roll.pool };
  return { kind: "unknown" };
}

const ordinal = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** "Two degrees of failure" — the game counts these out loud, so we do too. */
function degreeLabel(count: number, pass: boolean): string {
  const word = ordinal[count] ?? String(count);
  return `${word.charAt(0).toUpperCase()}${word.slice(1)} degree${count === 1 ? "" : "s"} of ${
    pass ? "success" : "failure"
  }`;
}

/** Where a total landed against the number it was measured against. */
export function verdictFor(total: number, target: Target): Verdict {
  const margin = total - target.total;

  if (target.contested && margin === 0) {
    return {
      tone: "tie",
      label: "Tie",
      degrees: 0,
      detail: `Both sides land on ${total}. A contest that ties is a tie — what that means is the GM's call.`,
    };
  }

  const { pass, degrees } = degreesFor(total, target.total);
  const gap = Math.abs(margin);
  return {
    tone: pass ? "success" : "failure",
    label: degreeLabel(degrees, pass),
    degrees,
    detail:
      `${total} against ${target.contested ? `${target.label}'s ${target.total}` : target.total}` +
      `${gap === 0 ? ", exactly" : `, ${gap} ${pass ? "over" : "under"}`} — ` +
      `${pass ? "one degree for clearing it" : "one degree for missing it"}` +
      `${degrees > 1 ? `, plus ${degrees - 1} more for the full 5${degrees > 2 ? "s" : ""} beyond that` : ""}.`,
  };
}

/**
 * Resolve one roll. `opponent` is the other side of a contest, where the two
 * rolls are measured against each other and a tie stays a tie — unlike a flat
 * DC, which a tie clears.
 */
export function resolveRoll(roll: Roll, opponent?: Roll): Resolved {
  const dice = shapeOf(roll);
  const diceTotal =
    dice.kind === "faces" ? dice.dice.reduce((a, b) => a + b, 0) : dice.kind === "pool" ? dice.total : null;
  const modTotal = roll.mods.reduce((a, m) => a + m.value, 0);
  const total = roll.declaredTotal ?? (diceTotal ?? 0) + modTotal;

  const flair = dice.kind === "faces" ? classify(dice.dice) : "normal";

  const target = opponent
    ? { total: resolveTotal(opponent), label: opponent.as || opponent.who, contested: true }
    : roll.vs
      ? { total: roll.vs.total, label: roll.vs.label, contested: true }
      : roll.dc != null
        ? { total: roll.dc, label: `DC ${roll.dc}`, contested: false }
        : null;

  let verdict: Verdict | null = target ? verdictFor(total, target) : null;

  // A stated result wins: some rules bend the arithmetic — a critical failure
  // on a Resist fails outright however high the total came out.
  if (roll.result) {
    // "One degree of failure" — read the count back off the stated wording so
    // the pips agree with the words.
    const stated = roll.result.match(/^(\w+) degree/i);
    const counted = stated ? ordinal.indexOf(stated[1].toLowerCase()) : -1;
    verdict = {
      tone: /fail/i.test(roll.result) ? "failure" : /tie/i.test(roll.result) ? "tie" : "success",
      label: roll.result,
      degrees: counted > 0 ? counted : 1,
      detail: verdict?.detail ?? "",
    };
  }

  return {
    dice,
    diceTotal,
    modTotal,
    total,
    flair: flair === "normal" ? null : flair,
    target,
    verdict,
  };
}

/** A roll's total on its own, for reading the other side of a contest. */
export function resolveTotal(roll: Roll): number {
  if (roll.declaredTotal != null) return roll.declaredTotal;
  const dice = shapeOf(roll);
  const diceTotal = dice.kind === "faces" ? dice.dice.reduce((a, b) => a + b, 0) : dice.kind === "pool" ? dice.total : 0;
  return diceTotal + roll.mods.reduce((a, m) => a + m.value, 0);
}

/** What a single die face means beyond its number. */
export function faceMeaning(face: number, dice: number[]): string {
  const split = dice.includes(1) && dice.includes(10);
  if (split) return "A 10 and a 1 together: an Inflection Point. Something dramatic happens, whichever way the check lands.";
  if (face === 10) return "A natural 10 — a Critical Success.";
  if (face === 1) return "A natural 1 — a Critical Failure.";
  return "An ordinary face. Both dice and every modifier add into the total.";
}
