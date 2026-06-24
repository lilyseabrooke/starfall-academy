/* ===========================================================================
   Starfall Academy — Roll state management
   Owns the shared roll log, roll prompt, dock, and backfire resist flow.
   Also provides demo conjure helpers for the Tweaks panel.
   Export: window.useRollState(D, activeChar)
   =========================================================================== */
(function () {
  function useRollState(D, activeChar) {
    // ---- State ----
    const [log, setLog] = React.useState(() => {
      const me = D.roster.find((r) => r.active) || D.roster[0];
      const whoOf = (s) => s.gm
        ? { name: s.actor, tone: "gold", gm: true }
        : (() => { const r = D.roster.find((x) => x.id === s.whoId) || me; return { id: r.id, name: r.name, initials: r.initials, tone: r.tone }; })();
      return D.ledgerSeed.map((s) => window.SF_ROLL.makeRoll({ ...s, who: whoOf(s) })).reverse();
    });
    const [dock, setDock]           = React.useState(false);
    const [pending, setPending]     = React.useState(null);   // { id, partial, rect }
    const [resistRoll, setResistRoll] = React.useState(null); // backfiring roll awaiting a resist save
    const [artifactResistRoll, setArtifactResistRoll] = React.useState(null); // artifact crit-fail awaiting an Artificy check
    const pendSeq = React.useRef(0);

    // Use a ref so handlers always read the latest activeChar even across renders.
    const activeCharRef = React.useRef(activeChar);
    React.useEffect(() => { activeCharRef.current = activeChar; }, [activeChar]);

    const meWho = () => {
      const me = D.roster.find((r) => r.id === activeCharRef.current);
      return { id: me.id, name: me.name, initials: me.initials, tone: me.tone };
    };

    // ---- Core roll mechanics ----
    const pushRoll = (full) => {
      const made = window.SF_ROLL.makeRoll(full);
      setLog((prev) => [made, ...prev]);
      return made;
    };

    const openPrompt = (partial, anchorEl) =>
      setPending({ id: ++pendSeq.current, partial, rect: anchorEl.getBoundingClientRect() });

    const confirmPrompt = (opts) => {
      if (!pending) return;
      const { matCost, asRitual, condBonus, condMeta, ...rest } = opts;
      const partial = pending.partial;
      // Conditional bonuses the player opted into: fold their value into the
      // modifier and surface each as a meta chip on the resulting roll.
      const mergedMod = (partial.mod || 0) + (condBonus || 0);
      const baseMeta = rest.meta != null ? rest.meta : (partial.meta || []);
      const mergedMeta = baseMeta.concat(condMeta || []);
      const roll = window.SF_ROLL.makeRoll({ ...partial, ...rest, mod: mergedMod, meta: mergedMeta.length ? mergedMeta : null });
      setLog((prev) => [roll, ...prev]);
      setPending(null);
      // Spell Material cost: spent on the casting, whatever the roll's outcome.
      if (pending.partial.onCast && matCost) pending.partial.onCast(matCost);
      if (pending.partial.onResult) pending.partial.onResult(roll);
      // Spell backfire — or a failed attunement — defers a resist prompt so the
      // crit toast burst can play first.
      const forcesResist = (roll.crit && roll.crit.backfire && !roll.crit.artifactBackfire) || (roll.resist && roll.pass === false);
      if (forcesResist) {
        clearTimeout(window.__sfBfAsk);
        window.__sfBfAsk = setTimeout(() => setResistRoll(roll), 900);
      }
      if (roll.crit && roll.crit.artifactBackfire) {
        clearTimeout(window.__sfBfArtAsk);
        window.__sfBfArtAsk = setTimeout(() => setArtifactResistRoll(roll), 900);
      }
    };

    const cancelPrompt = () => setPending(null);
    const closeResist        = () => setResistRoll(null);
    const closeArtifactResist = () => setArtifactResistRoll(null);

    const onResist = ({ condition, dc, mod }) => {
      const meta = resistRoll && resistRoll.resist ? [resistRoll.resist.eyebrow || "Resist"] : ["Backfire recoil"];
      pushRoll({
        who: meWho(),
        label: "Resist " + condition.name,
        kind: "resist",
        stat: condition.resist,
        mod, dc,
        meta,
      });
    };

    // ---- Demo conjure helpers (Tweaks panel) ----
    const initials = (n) => String(n).split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

    const conjureParty = () => {
      const p = D.partyPool[Math.floor(Math.random() * D.partyPool.length)];
      const r = D.roster.find((x) => x.id === p.whoId);
      pushRoll({ who: { id: r.id, name: r.name, initials: r.initials, tone: r.tone }, label: p.label, kind: p.kind, stat: p.stat, mod: p.mod, dc: p.dc, meta: p.meta, detail: p.detail, success: p.success, fail: p.fail, hl: p.hl });
    };

    const conjureGM = () => {
      const g = D.gmPool[Math.floor(Math.random() * D.gmPool.length)];
      pushRoll({ who: { name: g.actor, initials: initials(g.actor), tone: "gold", gm: true }, label: g.label, kind: g.kind, stat: g.stat, mod: g.mod, dc: g.dc, meta: g.meta, detail: g.detail, success: g.success, fail: g.fail, hl: g.hl });
    };

    const conjureInflection = () => {
      const g = D.gmInflection;
      pushRoll({ who: { name: g.actor, initials: initials(g.actor), tone: "gold", gm: true }, label: g.label, kind: g.kind, stat: g.stat, mod: g.mod, dc: g.dc, meta: g.meta, detail: g.detail, success: g.success, fail: g.fail, hl: g.hl, dice: [10, 1] });
    };

    return {
      state: { log, dock, pending, resistRoll, artifactResistRoll },
      handlers: {
        pushRoll, openPrompt, confirmPrompt, cancelPrompt,
        onResist, closeResist, closeArtifactResist,
        setDock,
        conjureParty, conjureGM, conjureInflection,
        meWho,
      },
    };
  }

  window.useRollState = useRollState;
})();
