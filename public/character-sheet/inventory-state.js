/* ===========================================================================
   Starfall Academy — Inventory state management
   Consolidates all inventory-related state (artifacts, potions, recipes,
   plants, wands, glyphs, items, rune stack) and their handlers into one
   reusable hook. Character data + roll/prompt system passed in.
   =========================================================================== */
(function () {
  function useInventoryState(character, facByName, subRank, caps, rollSystem) {
    // rollSystem: { openPrompt, pushRoll }
    // character: { materials }
    // facByName, subRank: lookup functions for ranks

    const INV = window.SF_INV;
    const D = window.SF_DATA;

    // ---- State ----
    const [artifacts, setArtifacts] = React.useState(() =>
      (INV.artifacts || []).map((x) => ({ ...x }))
    );
    const [potions, setPotions] = React.useState(() =>
      (INV.potions || []).map((x) => ({ ...x }))
    );
    const [recipes, setRecipes] = React.useState(() =>
      (INV.recipes || []).map((x) => ({ ...x }))
    );
    const [plants, setPlants] = React.useState(() =>
      (INV.plants || []).map((x) => ({ ...x }))
    );
    const [wands, setWands] = React.useState(() =>
      (INV.wands || []).map((x) => ({ ...x }))
    );
    const [glyphs, setGlyphs] = React.useState(() =>
      (INV.glyphs || []).map((x) => ({ ...x }))
    );
    const [items, setItems] = React.useState(() =>
      (INV.items || []).map((x) => ({ ...x }))
    );
    const [runeStack, setRuneStack] = React.useState([]);
    const [invToast, setInvToast] = React.useState(null);

    const toast = (msg) => {
      setInvToast(msg);
      clearTimeout(window.__sfInvToast);
      window.__sfInvToast = setTimeout(() => setInvToast(null), 2800);
    };

    // ---- Helpers ----
    const adjustMaterials = (delta, cb) => {
      if (cb) cb((prev) => ({ ...prev, materials: Math.max(0, (prev.materials || 0) + delta) }));
    };

    const facRank = (n) => (facByName(n) ? facByName(n).rank : 0);
    const heldCount = potions.reduce((s, p) => s + p.qty, 0);
    const attunedCount = artifacts.filter((a) => a.attuned).length;
    const plantSum = plants.reduce((s, p) => s + (p.value || 0), 0);

    // ---- Artifact handlers ----
    const attune = (a, anchor, setCB) => {
      if (a.attuned || attunedCount >= caps.attuneCap) return;
      const mod = facRank("Creativity") + subRank("artificy");
      rollSystem.openPrompt(
        {
          label: "Attune to " + a.name,
          kind: "skill",
          stat: "Creativity",
          mod,
          dc: a.intensity,
          meta: ["Artificy", "Attunement"],
          detail: a.desc,
          onResult: (roll) => {
            if (roll.pass) {
              setArtifacts((prev) =>
                prev.map((x) =>
                  x.id === a.id ? { ...x, attuned: true, intensity: 0 } : x
                )
              );
              // Grant move if not already present
              if (setCB) {
                setCB((prev) =>
                  prev.find((m) => m.fromArtifact === a.id)
                    ? prev
                    : [...prev, { id: "mv-" + a.id, name: a.name, tag: "Artifact", stat: a.move.stat, skill: a.move.skill, bonus: a.move.bonus, dc: a.move.dc, desc: a.desc, success: a.move.success, fail: a.move.fail, fromArtifact: a.id, artifactCondition: "stable" }]
                );
              }
            } else {
              const key = String(Math.max(-11, Math.min(-1, -roll.degrees)));
              const ease = INV.attuneEase[key] || 0;
              setArtifacts((prev) =>
                prev.map((x) =>
                  x.id === a.id ? { ...x, intensity: Math.max(0, x.intensity + ease) } : x
                )
              );
            }
          },
        },
        anchor
      );
    };

    const repairArtifact = (a, speed, anchor, setCB) => {
      const cfg = INV.repair[speed] || INV.repair.medium;
      const dc = (cfg.dc && cfg.dc[a.condition]) || 18;
      const time = (typeof cfg.time === "object" ? cfg.time[a.condition] : cfg.time) || cfg.time;
      const mod = facRank("Creativity") + subRank("artificy");
      rollSystem.openPrompt(
        {
          label: cfg.label + " repair · " + a.name,
          kind: "repair",
          stat: "Creativity",
          mod,
          dc,
          meta: ["Artificy", "Repair", cfg.label],
          detail: "Mend the " + a.condition + " " + a.name + " — " + time + " of work.",
          onResult: (roll) => {
            if (roll.pass) {
              // Success: restore to Stable regardless of starting condition.
              setArtifacts((prev) =>
                prev.map((x) => (x.id === a.id ? { ...x, condition: "stable" } : x))
              );
              if (setCB) {
                setCB((prev) =>
                  prev.map((m) =>
                    m.fromArtifact === a.id ? { ...m, artifactCondition: "stable" } : m
                  )
                );
              }
            } else if (a.condition === "broken") {
              // Failure on a Broken artifact still restores it at least to Damaged.
              setArtifacts((prev) =>
                prev.map((x) => (x.id === a.id ? { ...x, condition: "damaged" } : x))
              );
              if (setCB) {
                setCB((prev) =>
                  prev.map((m) =>
                    m.fromArtifact === a.id ? { ...m, artifactCondition: "damaged" } : m
                  )
                );
              }
            }
          },
        },
        anchor
      );
    };

    const removeArtifact = (a, setMoves) => {
      setArtifacts((prev) => prev.filter((x) => x.id !== a.id));
      if (setMoves) {
        setMoves((prev) => prev.filter((m) => m.fromArtifact !== a.id));
      }
    };

    // ---- Potion handlers ----
    const mintVial = (recipe) => {
      setPotions((prev) => {
        if (prev.reduce((s, p) => s + p.qty, 0) >= INV.potionCap) return prev;
        const ex = prev.find((p) => p.name === recipe.name);
        if (ex) return prev.map((p) => (p.id === ex.id ? { ...p, qty: p.qty + 1 } : p));
        return [
          ...prev,
          {
            id: "pot-" + Date.now(),
            name: recipe.name,
            tone: recipe.tone,
            intensity: recipe.intensity,
            qty: 1,
            recipeId: recipe.id,
            desc: recipe.desc,
          },
        ];
      });
    };

    const brew = (r, anchor, setCB) => {
      const mod = facRank("Creativity") + subRank("alchemy");
      rollSystem.openPrompt(
        {
          label: "Brew " + r.name,
          kind: "skill",
          stat: "Creativity",
          mod,
          dc: r.intensity,
          meta: ["Alchemy", "Brew"],
          detail: r.desc,
          onResult: (roll) => {
            adjustMaterials(-r.cost, setCB);
            if (roll.pass) mintVial(r);
          },
        },
        anchor
      );
    };

    const takePotion = (p, anchor, setCB) => {
      const mod = facRank("Creativity") + subRank("alchemy");
      rollSystem.openPrompt(
        {
          label: "Take " + p.name,
          kind: "skill",
          stat: "Creativity",
          mod,
          dc: p.intensity,
          meta: ["Potion"],
          detail: p.desc,
          onResult: () => {
            setPotions((prev) =>
              prev
                .map((x) => (x.id === p.id ? { ...x, qty: x.qty - 1 } : x))
                .filter((x) => x.qty > 0)
            );
          },
        },
        anchor
      );
    };

    const discardPotion = (p) => {
      setPotions((prev) =>
        prev
          .map((x) => (x.id === p.id ? { ...x, qty: x.qty - 1 } : x))
          .filter((x) => x.qty > 0)
      );
    };

    const removePotion = (p) => {
      setPotions((prev) => prev.filter((x) => x.id !== p.id));
    };

    const removeRecipe = (r) => {
      setRecipes((prev) => prev.filter((x) => x.id !== r.id));
    };

    // ---- Plant handlers ----
    const usePlant = (pl, anchor) => {
      const mod = facRank("Insight") + subRank("herbalism");
      rollSystem.openPrompt(
        {
          label: "Use " + pl.name,
          kind: "skill",
          stat: "Insight",
          mod,
          dc: pl.intensity,
          meta: ["Herbalism"],
          detail: pl.ability || pl.desc,
          onResult: () => {
            if (pl.removeOnUse) {
              setPlants((prev) => prev.filter((x) => x.id !== pl.id));
            } else {
              setPlants((prev) =>
                prev.map((x) => (x.id === pl.id ? { ...x, used: true } : x))
              );
            }
          },
        },
        anchor
      );
    };

    const harvestPlant = (pl, setCB) => {
      adjustMaterials(pl.value, setCB);
      setPlants((prev) => prev.filter((x) => x.id !== pl.id));
      toast(pl.name + " harvested · +" + pl.value + " materials");
    };

    const removePlant = (pl) => {
      setPlants((prev) => prev.filter((x) => x.id !== pl.id));
    };

    // ---- Wand handlers ----
    const equipWand = (w, setBonuses, setMoves, setSpells) => {
      const equipping = !w.equipped;
      setWands((prev) =>
        prev.map((x) =>
          x.id === w.id ? { ...x, equipped: equipping } : { ...x, equipped: false }
        )
      );
      // Clear all wand-sourced grants
      setBonuses((prev) => prev.filter((b) => !b.fromWand));
      setMoves((prev) => prev.filter((m) => !m.fromWand));
      setSpells((prev) => prev.filter((s) => !s.fromWand));
      // Re-apply if equipping (logic in app for now; can extract later)
    };

    const repairWand = (w, anchor, setCB) => {
      const mod = facRank("Focus") + subRank("wandcrafting");
      rollSystem.openPrompt(
        {
          label: "Repair " + w.name,
          kind: "skill",
          stat: "Focus",
          mod,
          dc: 18,
          meta: ["Wandcrafting", "Repair"],
          detail: w.desc,
          onResult: (roll) => {
            if (roll.pass) {
              setWands((prev) =>
                prev.map((x) =>
                  x.id === w.id ? { ...x, condition: x.maxCondition } : x
                )
              );
            }
          },
        },
        anchor
      );
    };

    const removeWand = (w, setBonuses, setMoves, setSpells) => {
      setWands((prev) => prev.filter((x) => x.id !== w.id));
      setBonuses((prev) => prev.filter((b) => b.fromWand !== w.id));
      setMoves((prev) => prev.filter((m) => m.fromWand !== w.id));
      setSpells((prev) => prev.filter((s) => s.fromWand !== w.id));
    };

    // ---- Rune handlers ----
    const addToRune = (g) => setRuneStack((prev) => [...prev, g]);
    const removeFromRune = (i) => setRuneStack((prev) => prev.filter((_, idx) => idx !== i));
    const clearRune = () => setRuneStack([]);
    const createRune = (anchor, setCB) => {
      const cost = runeStack.reduce((s, g) => s + (g.cost || 0), 0);
      const intensity = runeStack.reduce((s, g) => s + (g.intensity || 0), 0);
      const name = runeStack.map((g) => g.name).join(" + ");
      const mod = facRank("Logic") + subRank("runology");
      rollSystem.openPrompt(
        {
          label: "Rune · " + name,
          kind: "skill",
          stat: "Logic",
          mod,
          dc: intensity,
          meta: ["Runology", "Rune"],
          detail: "Inscribe a rune combining " + name + ".",
          onResult: () => {
            adjustMaterials(-cost, setCB);
            setRuneStack([]);
          },
        },
        anchor
      );
    };

    const removeGlyph = (g) => setGlyphs((prev) => prev.filter((x) => x.id !== g.id));
    const removeItem = (it) => setItems((prev) => prev.filter((x) => x.id !== it.id));

    // ---- Item handler ---------------------------------------------------
    // Stub wired to the Use button on ItemCard. When the Items database is
    // plugged in, `it` will carry cost / singleUse / check / tags and this
    // handler should parse `it.check` into a skill + bonus/DC and fire
    // rollSystem.openPrompt accordingly. For now it just consumes single-use
    // items and shows a toast.
    const useItem = (it, anchor) => {
      const isSingleUse = it.singleUse === true || String(it.singleUse || "").toUpperCase() === "YES";
      if (isSingleUse) {
        setItems((prev) =>
          prev.map((x) => (x.id === it.id ? { ...x, qty: Math.max(0, (x.qty || 1) - 1) } : x))
              .filter((x) => (x.qty || 0) > 0)
        );
      }
      toast(it.name + " · used");
    };

    // ---- Return object ----
    return {
      state: {
        artifacts,
        potions,
        recipes,
        plants,
        wands,
        glyphs,
        items,
        runeStack,
        invToast,
        heldCount,
        attunedCount,
        plantSum,
      },
      handlers: {
        adjustMaterials,
        attune,
        repairArtifact,
        removeArtifact,
        mintVial,
        brew,
        takePotion,
        discardPotion,
        removePotion,
        removeRecipe,
        usePlant,
        harvestPlant,
        removePlant,
        equipWand,
        repairWand,
        removeWand,
        addToRune,
        removeFromRune,
        clearRune,
        createRune,
        removeGlyph,
        removeItem,
        useItem,
        toast,
      },
      setState: {
        setArtifacts,
        setPotions,
        setRecipes,
        setPlants,
        setWands,
        setGlyphs,
        setItems,
        setRuneStack,
      },
    };
  }

  window.useInventoryState = useInventoryState;
})();
