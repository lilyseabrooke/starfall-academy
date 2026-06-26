"use client";

/* ===========================================================================
   Starfall Academy — roll state
   ---------------------------------------------------------------------------
   Ported from public/character-sheet/roll-state.js (window.useRollState). Owns
   the shared roll log, the roll prompt, the dock, and the backfire/attune
   resist flow.

   Integration-seam change: the prototype shared rolls through window.SF_HOST /
   SF_MULTIPLAYER (postMessage to the iframe host). Here that is replaced by
   explicit options — `onShareRoll(roll)` is called for each locally-made roll
   (the realtime hook persists + broadcasts it), and `injectRemote(roll)` adds
   an incoming roll, deduped by id so a client's own echo collapses to one.
   =========================================================================== */
import * as React from "react";
import type { Condition, Roll, RollWho, Tone } from "../types";
import { makeRoll, type RollInput } from "../data/roll-engine";
import type { PoolRoll } from "../data/seed";

/** Minimal roster member the roll log needs. */
export interface RollRosterMember {
  id: string;
  name: string;
  initials: string;
  tone: Tone;
  active?: boolean;
}

export interface RollStateData {
  roster: RollRosterMember[];
  ledgerSeed: PoolRoll[];
  partyPool: PoolRoll[];
  gmPool: PoolRoll[];
  gmInflection: PoolRoll;
}

export interface RollStateOptions {
  multiplayer?: boolean;
  /** Called for each locally-made roll (JSON-safe clone) to share with the party. */
  onShareRoll?: (roll: Roll) => void;
}

/** A conditional bonus offered as an opt-in in the roll prompt. */
export interface CondBonusOption {
  id: string;
  source: string;
  value: number;
  targetLabel: string;
  condNote: string | null;
}

/** A prompt partial: a roll input whose `who` is filled in at confirm time
 *  (defaults to the active character via meWho()). Spell/wandcraft prompts add
 *  casting context the RollPrompt reads. */
export type PromptPartial = Omit<RollInput, "who"> & {
  who?: RollWho;
  onCast?: (matCost: number) => void;
  onResult?: (roll: Roll) => void;
  // Spell-cast context:
  spellLevel?: string;
  spellAp?: number;
  spellVolatile?: boolean;
  canRitual?: boolean;
  condBonuses?: CondBonusOption[];
  materials?: number;
};

export interface PendingPrompt {
  id: number;
  partial: PromptPartial;
  rect: DOMRect;
}

export interface ConfirmPromptOpts {
  matCost?: number;
  asRitual?: boolean;
  condBonus?: number;
  condMeta?: string[];
  meta?: string[] | null;
  [k: string]: unknown;
}

export function useRollState(data: RollStateData, activeChar: string, options: RollStateOptions = {}) {
  const { roster, ledgerSeed, partyPool, gmPool, gmInflection } = data;
  const multiplayer = !!options.multiplayer;
  const onShareRollRef = React.useRef(options.onShareRoll);
  React.useEffect(() => {
    onShareRollRef.current = options.onShareRoll;
  }, [options.onShareRoll]);

  // ---- State ----
  const [log, setLog] = React.useState<Roll[]>(() => {
    // Multiplayer: start empty and fill from the campaign's shared backlog.
    if (multiplayer) return [];
    const me = roster.find((r) => r.active) || roster[0];
    const whoOf = (s: PoolRoll): Roll["who"] =>
      s.gm
        ? { name: s.actor || "", tone: "gold", gm: true }
        : (() => {
            const r = roster.find((x) => x.id === s.whoId) || me;
            return { id: r.id, name: r.name, initials: r.initials, tone: r.tone };
          })();
    return ledgerSeed.map((s) => makeRoll({ ...s, who: whoOf(s) } as RollInput)).reverse();
  });

  // ---- Shared dice log seam ----
  const seenRollIds = React.useRef<Set<string>>(new Set());
  const shareLocal = (roll: Roll | null) => {
    if (!roll) return;
    if (roll.id) seenRollIds.current.add(roll.id);
    const share = onShareRollRef.current;
    if (share) {
      let safe: Roll;
      try {
        safe = JSON.parse(JSON.stringify(roll)); // drops the `hl` function field
      } catch {
        return;
      }
      share(safe);
    }
  };

  /** Inject a roll received from the party (deduped by id). */
  const injectRemote = React.useCallback((roll: Roll) => {
    if (!roll || !roll.id || seenRollIds.current.has(roll.id)) return;
    seenRollIds.current.add(roll.id);
    setLog((prev) => [roll, ...prev]);
  }, []);

  const [dock, setDock] = React.useState(false);
  const [pending, setPending] = React.useState<PendingPrompt | null>(null);
  const [resistRoll, setResistRoll] = React.useState<Roll | (Record<string, unknown> & { id: string }) | null>(null);
  const [artifactResistRoll, setArtifactResistRoll] = React.useState<Roll | null>(null);
  const pendSeq = React.useRef(0);
  const bfAskTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const bfArtAskTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const activeCharRef = React.useRef(activeChar);
  React.useEffect(() => {
    activeCharRef.current = activeChar;
  }, [activeChar]);

  const meWho = (): Roll["who"] => {
    const me = roster.find((r) => r.id === activeCharRef.current) || roster[0];
    return { id: me.id, name: me.name, initials: me.initials, tone: me.tone };
  };

  // ---- Core roll mechanics ----
  const pushRoll = (full: RollInput): Roll => {
    const made = makeRoll(full);
    setLog((prev) => [made, ...prev]);
    shareLocal(made);
    return made;
  };

  const openPrompt = (partial: PendingPrompt["partial"], anchorEl: HTMLElement) =>
    setPending({ id: ++pendSeq.current, partial, rect: anchorEl.getBoundingClientRect() });

  const confirmPrompt = (opts: ConfirmPromptOpts) => {
    if (!pending) return;
    const { matCost, asRitual: _asRitual, condBonus, condMeta, ...rest } = opts;
    void _asRitual;
    const partial = pending.partial;
    const mergedMod = (partial.mod || 0) + (condBonus || 0);
    const baseMeta = rest.meta != null ? rest.meta : partial.meta || [];
    const mergedMeta = (baseMeta || []).concat(condMeta || []);
    const roll = makeRoll({
      ...partial,
      ...(rest as Partial<RollInput>),
      who: partial.who || meWho(),
      mod: mergedMod,
      meta: mergedMeta.length ? mergedMeta : null,
    });
    setLog((prev) => [roll, ...prev]);
    shareLocal(roll);
    setPending(null);
    if (partial.onCast && matCost) partial.onCast(matCost);
    if (partial.onResult) partial.onResult(roll);
    const forcesResist =
      (roll.crit && roll.crit.backfire && !(roll.crit as { artifactBackfire?: boolean }).artifactBackfire) ||
      (roll.resist && roll.pass === false);
    if (forcesResist) {
      clearTimeout(bfAskTimer.current);
      bfAskTimer.current = setTimeout(() => setResistRoll(roll), 900);
    }
    if (roll.crit && (roll.crit as { artifactBackfire?: boolean }).artifactBackfire) {
      clearTimeout(bfArtAskTimer.current);
      bfArtAskTimer.current = setTimeout(() => setArtifactResistRoll(roll), 900);
    }
  };

  const cancelPrompt = () => setPending(null);
  const closeResist = () => setResistRoll(null);
  const closeArtifactResist = () => setArtifactResistRoll(null);

  const onResist = ({ condition, dc, mod }: { condition: Condition; dc: number | null; mod: number }) => {
    const rr = resistRoll as Roll | null;
    const meta = rr && rr.resist ? [rr.resist.eyebrow || "Resist"] : ["Backfire recoil"];
    return pushRoll({
      who: meWho(),
      label: "Resist " + condition.name,
      kind: "resist",
      stat: condition.resist,
      mod,
      dc,
      meta,
    });
  };

  // GM-forced save: open the resist prompt preset to the GM's condition + DC.
  const openForcedResist = ({ conditionId, dc }: { conditionId: string; dc: number | null }) => {
    setResistRoll({
      id: "gmreq-" + Date.now(),
      label: "Forced save",
      dc: dc != null ? dc : null,
      degrees: 1,
      forced: { condition: conditionId, dc: dc != null ? dc : null },
      resist: {
        condition: conditionId,
        eyebrow: "Game Master",
        heading: "A save is called for",
        verdict: "The Game Master calls for a save — roll to resist.",
      },
    });
  };

  // ---- Demo conjure helpers (Tweaks panel) ----
  const initials = (n: string) =>
    String(n).split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

  const conjureFromPool = (g: PoolRoll, who: Roll["who"]) =>
    pushRoll({ who, label: g.label, kind: g.kind, stat: g.stat, mod: g.mod, dc: g.dc, meta: g.meta, detail: g.detail, success: g.success, fail: g.fail, hl: g.hl, dice: g.dice });

  const conjureParty = () => {
    const p = partyPool[Math.floor(Math.random() * partyPool.length)];
    const r = roster.find((x) => x.id === p.whoId) || roster[0];
    conjureFromPool(p, { id: r.id, name: r.name, initials: r.initials, tone: r.tone });
  };

  const conjureGM = () => {
    const g = gmPool[Math.floor(Math.random() * gmPool.length)];
    conjureFromPool(g, { name: g.actor || "", initials: initials(g.actor || ""), tone: "gold", gm: true });
  };

  const conjureInflection = () => {
    const g = gmInflection;
    pushRoll({ who: { name: g.actor || "", initials: initials(g.actor || ""), tone: "gold", gm: true }, label: g.label, kind: g.kind, stat: g.stat, mod: g.mod, dc: g.dc, meta: g.meta, detail: g.detail, success: g.success, fail: g.fail, hl: g.hl, dice: [10, 1] });
  };

  return {
    state: { log, dock, pending, resistRoll, artifactResistRoll },
    handlers: {
      pushRoll,
      openPrompt,
      confirmPrompt,
      cancelPrompt,
      onResist,
      openForcedResist,
      closeResist,
      closeArtifactResist,
      setDock,
      conjureParty,
      conjureGM,
      conjureInflection,
      meWho,
      injectRemote,
    },
  };
}
