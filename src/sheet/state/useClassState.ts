"use client";

/* ===========================================================================
   Starfall Academy — classes state
   ---------------------------------------------------------------------------
   Ported from public/character-sheet/classes-state.js (window.useClassState).
   Rank points + per-class rank & option choices.
   =========================================================================== */
import * as React from "react";
import type { ClassRankState, ClassState } from "../types";

export interface ClassData {
  startingRp: number;
  start: Record<string, { rank: number; choices: Record<string, number> }>;
  cost: (targetRank: number) => number;
}

/** Overrides the class module's built-in demo starting point — used to
 *  hydrate straight from a saved sheet (or a blank slate) instead of
 *  flashing the seed's demo ranks on first paint. */
export interface ClassStateInit {
  rp: number;
  classState: ClassState;
}

export function useClassState(classData: ClassData, initial?: ClassStateInit | null) {
  const CL = classData;

  const [rp, setRp] = React.useState<number>(() => (initial ? initial.rp : CL.startingRp));
  const [classState, setClassState] = React.useState<ClassState>(() => {
    const source = initial ? initial.classState : CL.start;
    const o: ClassState = {};
    for (const k in source) {
      o[k] = { rank: source[k].rank, choices: { ...source[k].choices } };
    }
    return o;
  });

  const classEntry = (st: ClassState, id: string): ClassRankState => st[id] || { rank: 0, choices: {} };

  const grantRp = (delta: number) => setRp((v) => Math.max(0, v + delta));

  const chooseOpt = (id: string, level: number, side: number) =>
    setClassState((prev) => {
      const cur = classEntry(prev, id);
      if (level > cur.rank) return prev; // can only re-choose a reached rank
      return { ...prev, [id]: { ...cur, choices: { ...cur.choices, [level]: side } } };
    });

  const rankUp = (id: string, level: number, side: number) => {
    const cur = classEntry(classState, id);
    if (level !== cur.rank + 1) return; // ranks are bought one at a time
    const c = CL.cost(level);
    if (rp < c) return;
    setRp((v) => v - c);
    setClassState((prev) => {
      const p = classEntry(prev, id);
      return { ...prev, [id]: { rank: level, choices: { ...p.choices, [level]: side } } };
    });
  };

  const loadState = (nextState: ClassState | null | undefined, nextRp?: number | null) => {
    setClassState(() => {
      const o: ClassState = {};
      for (const k in nextState || {}) o[k] = { rank: nextState![k].rank, choices: { ...nextState![k].choices } };
      return o;
    });
    if (nextRp != null) setRp(nextRp);
  };

  const refundRank = (id: string) => {
    const cur = classEntry(classState, id);
    if (cur.rank <= 0) return;
    setRp((v) => v + CL.cost(cur.rank));
    setClassState((prev) => {
      const p = classEntry(prev, id);
      const choices = { ...p.choices };
      delete choices[p.rank];
      return { ...prev, [id]: { rank: p.rank - 1, choices } };
    });
  };

  return {
    state: { rp, classState },
    handlers: { grantRp, chooseOpt, rankUp, refundRank, loadState },
    helpers: { classEntry },
  };
}
