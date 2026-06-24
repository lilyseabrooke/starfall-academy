/* ===========================================================================
   Starfall Academy — Classes state management
   Consolidates class ranking logic: rank points, per-class rank & choices.
   =========================================================================== */
(function () {
  function useClassState(startingRp, classData) {
    // classData: { startingRp, start: { [id]: { rank, choices } }, cost() }
    const CL = classData;

    const [rp, setRp] = React.useState(CL.startingRp);
    const [classState, setClassState] = React.useState(() => {
      const o = {};
      for (const k in CL.start) {
        o[k] = { rank: CL.start[k].rank, choices: { ...CL.start[k].choices } };
      }
      return o;
    });

    // ---- Helpers ----
    const classEntry = (st, id) => st[id] || { rank: 0, choices: {} };

    // ---- Handlers ----
    const grantRp = (delta) => setRp((v) => Math.max(0, v + delta));

    const chooseOpt = (id, level, side) =>
      setClassState((prev) => {
        const cur = classEntry(prev, id);
        if (level > cur.rank) return prev; // can only re-choose a reached rank
        return {
          ...prev,
          [id]: { ...cur, choices: { ...cur.choices, [level]: side } },
        };
      });

    const rankUp = (id, level, side) => {
      const cur = classEntry(classState, id);
      if (level !== cur.rank + 1) return; // ranks are bought one at a time
      const c = CL.cost(level);
      if (rp < c) return;
      setRp((v) => v - c);
      setClassState((prev) => {
        const p = classEntry(prev, id);
        return {
          ...prev,
          [id]: { rank: level, choices: { ...p.choices, [level]: side } },
        };
      });
    };

    // Load a complete class state (used by the Admission on commit).
    const loadState = (nextState, nextRp) => {
      setClassState(() => {
        const o = {};
        for (const k in (nextState || {})) o[k] = { rank: nextState[k].rank, choices: { ...nextState[k].choices } };
        return o;
      });
      if (nextRp != null) setRp(nextRp);
    };

    const refundRank = (id) => {
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

    // ---- Return object ----
    return {
      state: {
        rp,
        classState,
      },
      handlers: {
        grantRp,
        chooseOpt,
        rankUp,
        refundRank,
        loadState,
      },
      helpers: {
        classEntry,
      },
    };
  }

  window.useClassState = useClassState;
})();
