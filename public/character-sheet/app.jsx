/* ===========================================================================
   Starfall Academy — App root component
   Composes all state modules; owns character vitals + inventory state.
   Wires cross-cutting concerns (wand sync, art moves) between modules.
   =========================================================================== */

const D   = window.SF_DATA;
const CL  = window.SF_CLASSES;
const INV = window.SF_INV;
const SHARED = window.SF_SHARED;
const { Button } = window.StarfallAcademyDesignSystem_61fef2;
const clamp = (v, min, max) => Math.max(min, max == null ? v : Math.min(max, v));

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "toastPosition": "br",
  "stackCap": 3,
  "toastLifetime": 5,
  "graceTail": 1.5,
  "expandDefault": false,
  "archiveWidth": 690,
  "ladderDensity": "roomy"
}/*EDITMODE-END*/;

function App() {
  // ---- Party roster (injected by the host from the DB, or seed if standalone) ----
  const ROSTER = (typeof window !== "undefined" && Array.isArray(window.SF_ROSTER) && window.SF_ROSTER.length)
    ? window.SF_ROSTER
    : D.roster;
  const HOST_ME = (typeof window !== "undefined" && window.SF_ME) ? window.SF_ME : null;

  // ---- Core UI / character state ----
  const [nav, setNav]               = React.useState("overview");
  const [c, setC]                   = React.useState(() => ({ ...D.character }));
  const [conditions, setConditions] = React.useState(() => D.conditions.map((x) => ({ ...x })));
  // Stats + the school/subject tree are editable via the Admission, so they
  // live in state (were read-only constants). Play mode reads these, not D.stats.
  const [stats, setStats]           = React.useState(() => D.stats.map((f) => ({ ...f, skills: f.skills.map((s) => ({ ...s })) })));
  const [schools, setSchools]       = React.useState(() => D.magicSchools.map((s) => ({ ...s, subjects: s.subjects.map((x) => ({ ...x })) })));
  const [activeChar, setActiveChar] = React.useState(HOST_ME || (ROSTER.find(r => r.active) || ROSTER[0]).id);
  // Picking a party member navigates to their sheet (host); standalone falls
  // back to switching the active member locally.
  const pickChar = (id) => {
    if (!id || id === activeChar) return;
    if (window.SF_HOST && typeof window.SF_HOST.switchCharacter === "function") window.SF_HOST.switchCharacter(id);
    else setActiveChar(id);
  };
  const [t, setTweak]               = useTweaks(TWEAK_DEFAULTS);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [collapsedStats, setCollapsedStats] = React.useState(() => new Set());
  const toggleStatCollapsed = (id) => setCollapsedStats((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const allStatsCollapsed = stats.length > 0 && collapsedStats.size === stats.length;
  const toggleAllStats = () => { if (allStatsCollapsed) setCollapsedStats(new Set()); else setCollapsedStats(new Set(stats.map((s) => s.id))); };
  const [collapsedSchools, setCollapsedSchools] = React.useState(() => new Set());
  const toggleSchoolCollapsed = (id) => setCollapsedSchools((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allSchoolsCollapsed = schools.length > 0 && collapsedSchools.size === schools.length;
  const toggleAllSchools = () => {
    if (allSchoolsCollapsed) setCollapsedSchools(new Set());
    else setCollapsedSchools(new Set(schools.map((s) => s.id)));
  };
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    try { return localStorage.getItem("sf-sidebar-collapsed") === "true"; } catch (_) { return false; }
  });
  const toggleSidebar = () => setSidebarCollapsed((v) => !v);

  // ---- Search menu state ----
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchMenuOpen, setSearchMenuOpen] = React.useState(false);
  const [mapFocus, setMapFocus] = React.useState(null);

  // Handle search selection
  const handleSearchSelect = (result) => {
    setSearchMenuOpen(false);
    setSearchQuery("");

    // Navigate to appropriate section
    if (result.section) {
      setNav(result.section);
    }

    // For map locations, send a focus message to the embedded map iframe
    if (result.type === "location") {
      const d = result.data;
      let focus = null;
      if (!d.parentRegion) {
        focus = d.isCitadel
          ? { type: "sf-map-focus", isCitadel: true }
          : { type: "sf-map-focus", regionId: d.id };
      } else if (d.parentRegion === "Starfall Citadel") {
        focus = { type: "sf-map-focus", isCitadel: true,
          districtName: d.parentDistrict ? d.parentDistrict : d.name };
      } else {
        focus = { type: "sf-map-focus", regionId: d.parentRegionId };
      }
      if (focus) setTimeout(() => setMapFocus(focus), 50);
    }

    // Scroll to the element on the page after navigation settles
    scrollToResult(result);
  };

  // Scroll the main content area to the matching element after navigation
  const scrollToResult = (result) => {
    if (result.type === "location") return;
    setTimeout(() => {
      const canvas = document.querySelector(".sf-canvas");
      if (!canvas) return;
      const name = result.name.toLowerCase();
      // Selector map: type → CSS selectors to search (in priority order)
      const SELECTORS = {
        stat:         [".sf-fac__name"],
        skill:        [".sf-skill__name span:first-child"],
        subject:      [".sf-skill__name span:first-child"],
        spell:        [".sf-spell__name"],
        move:         [".sf-move__name"],
        artifact:     [".sf-itm__name"],
        wand:         [".sf-itm__name"],
        potion:       [".sf-slot__name", ".sf-itm__name"],
        recipe:       [".sf-itm__name"],
        plant:        [".sf-itm__name"],
        item:         [".sf-itm__name"],
        glyph:        [".sf-glyph__name", ".sf-itm__name"],
        condition:    [".sf-cond__name", ".sf-condition__label"],
        resist:       [".sf-fac__name"],
        class:        [".sf-cc__name"],
        classAbility: [".sf-opt__title"],
        bonus:        [".sf-bonus__src"],
      };
      // Generic fallback: any element whose text closely matches
      const selectors = SELECTORS[result.type] || [];
      let target = null;
      for (const sel of selectors) {
        const nodes = canvas.querySelectorAll(sel);
        for (const node of nodes) {
          if (node.textContent.trim().toLowerCase().includes(name)) {
            target = node.closest(".sf-itm, .sf-spell, .sf-move, .sf-skill, .sf-fac, .sf-cc, .sf-opt, .sf-slot, .sf-glyph") || node;
            break;
          }
        }
        if (target) break;
      }
      // Generic text scan fallback
      if (!target) {
        const all = main.querySelectorAll("h2, h3, [class*='__name']");
        for (const node of all) {
          if (node.textContent.trim().toLowerCase() === name) {
            target = node.closest("[class]");
            break;
          }
        }
      }
      if (!target) return;
      const canvasRect = canvas.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = targetRect.top - canvasRect.top + canvas.scrollTop - 80;
      canvas.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
      target.style.outline = "2px solid var(--gold-500)";
      target.style.outlineOffset = "4px";
      setTimeout(() => { target.style.outline = ""; target.style.outlineOffset = ""; }, 1200);
    }, 180);
  };

  // Handle repair button
  const handleSearchRepair = (result) => {
    const artifact = result.data;
    invH.repairArtifact(artifact, "medium", document.body);
  };

  // Handle use button
  const handleSearchUse = (result) => {
    const { type, data } = result;
    if (type === "plant") {
      invH.usePlant(data, document.body);
    } else if (type === "item") {
      invH.useItem(data, document.body);
    }
    setSearchMenuOpen(false);
    setSearchQuery("");
    // Do NOT navigate
  };

  // Handle search roll button — fire the roll only, do NOT navigate
  const handleSearchRoll = (result) => {
    const { type, data } = result;
    if (type === "stat") {
      const fac = stats.find((f) => f.name === data.name);
      if (fac) onRollSkill(fac, { name: fac.name, rank: 0 }, fac.rank + statBonusFor(fac.name), { currentTarget: document.body });
    } else if (type === "skill") {
      const fac = stats.find((f) => f.id === data.stat?.id || f.name === data.stat?.name);
      if (fac) onRollSkill(fac, data.skill || data, (fac.rank + statBonusFor(fac.name)) + (data.skill?.rank ?? data.rank ?? 0), { currentTarget: document.body });
    } else if (type === "subject") {
      const sub = data.subject || data;
      const school = schools.find((s) => s.subjects?.some((x) => x.id === sub.id));
      if (school) {
        const total = effFacRank(sub.stat) + sub.rank + subjectBonusFor(sub.key);
        onRollSubject(school, sub, total, { currentTarget: document.body });
      }
    } else if (type === "spell") {
      onRollSpell(data, { currentTarget: document.body });
    } else if (type === "move") {
      onRollMove(data, { currentTarget: document.body });
    } else if (type === "artifact") {
      invH.attune(data, document.body);
    } else if (type === "wand") {
      const liveWand = wands.find((w) => w.id === data.id) || data;
      invH.repairWand(liveWand, document.body);
    } else if (type === "potion") {
      invH.takePotion(data, document.body);
    } else if (type === "recipe") {
      invH.brew(data, document.body);
    } else if (type === "plant") {
      invH.rollPlant(data, document.body);
    } else if (type === "item") {
      invH.useItem(data, document.body);
    } else if (type === "resist") {
      onRollResist(data, { currentTarget: document.body });
    }
    // Close menu after roll but do NOT navigate
    setSearchMenuOpen(false);
    setSearchQuery("");
  };

  React.useLayoutEffect(() => {
    try { localStorage.setItem("sf-sidebar-collapsed", String(sidebarCollapsed)); } catch (_) {}
    const app = document.querySelector(".sf-app");
    if (app) app.classList.toggle("sidebar-collapsed", sidebarCollapsed);
  }, [sidebarCollapsed]);

  // ---- Party whereabouts (Map tab) ----
  // Each character's current location is a sheet variable: one predefined zone.
  const LOC_DEFAULTS = { arianna: "starfall-citadel", lys: "amber-woods", claire: "glimmerdeep-lake", suri: "ryker-cliffs", trinity: "starfall-citadel" };
  const [locations, setLocations] = React.useState(() => {
    try { const s = JSON.parse(localStorage.getItem("sf-party-locations") || "null"); if (s && typeof s === "object") return { ...LOC_DEFAULTS, ...s }; } catch (_) {}
    return { ...LOC_DEFAULTS };
  });
  React.useEffect(() => { try { localStorage.setItem("sf-party-locations", JSON.stringify(locations)); } catch (_) {} }, [locations]);
  const setLocation = (id, regionId) => setLocations((prev) => ({ ...prev, [id]: regionId || null }));

  // ---- Compendium / manual-add UI ----
  const [compCat, setCompCat]       = React.useState("spell");
  const [drawer, setDrawer]         = React.useState(false);
  const [added, setAdded]           = React.useState([]);
  const [lastAdded, setLastAdded]   = React.useState(null);
  const [manualOpen, setManualOpen] = React.useState(false);
  const [manualKind, setManualKind] = React.useState(null);
  const [editRecipe,   setEditRecipe]   = React.useState(null);
  const [editArtifact, setEditArtifact] = React.useState(null);
  const [editWand,     setEditWand]     = React.useState(null);
  const [editPlant,    setEditPlant]    = React.useState(null);
  const [editGlyph,    setEditGlyph]    = React.useState(null);
  const [editSpell,  setEditSpell]  = React.useState(null);
  const [manualMoveOpen, setManualMoveOpen] = React.useState(false);
  // Bonus editor (add / expand / edit / delete)
  const [bonusEdit, setBonusEdit]   = React.useState({ open: false, mode: "new", bonus: null });
  const [givePayload, setGivePayload] = React.useState(null);
  const [choosePlant, setChoosePlant] = React.useState(null); // {pl, anchor} for CHOOSE plants

  // ---- State modules ----
  const classes = useClassState(CL.startingRp, CL);

  const facByName = (name) => stats.find((f) => f.name === name);
  const magic = useMagicState(D, INV, facByName, () => schools, (k) => (classes.state.classState[k] ? classes.state.classState[k].rank : 0));
  const roll  = useRollState(D, activeChar);

  // ---- Destructure frequently-used module members ----
  const { rp, classState }                         = classes.state;
  const { grantRp, chooseOpt, rankUp, refundRank } = classes.handlers;
  const { bonuses, spells, moves }                 = magic.state;
  const { toggleBonus, toggleBonusConditional, setBonusCondNote, addSpell, updateSpell, removeSpell, setSpellDays,
          addBonus, updateBonus, removeBonus, addMove } = magic.handlers;
  const { subjectByKey, schoolToneOf, subjectBonusFor, bonusFor, condBonusesFor, spellMod, moveMod,
          statBonusFor, moveBonusFor, rollBonusFor, resolveVal, dosShiftFor } = magic.helpers;
  const { log, dock, pending, resistRoll, artifactResistRoll } = roll.state;
  const { openPrompt, confirmPrompt, cancelPrompt, onResist, openForcedResist, closeResist, closeArtifactResist, setDock, meWho,
          conjureParty, conjureGM, conjureInflection } = roll.handlers;

  // ---- Derived character helpers ----
  const subRank  = (k) => { const r = subjectByKey(k); return r ? r.sub.rank : 0; };
  const facRank  = (n) => (facByName(n) ? facByName(n).rank : 0);
  // Effective stat rank — base rank plus any live "add to a stat" bonuses.
  const effFacRank = (n) => facRank(n) + statBonusFor(n);
  // Roll total for a magic subject — used by the AUTO spell sort to rank subjects
  // by the character's live proficiency (stat + stat bonuses + subject rank + subject bonuses).
  const subjectModFor = (subjectKey) => {
    const sk = subjectByKey(subjectKey);
    if (!sk) return 0;
    return effFacRank(sk.sub.stat) + sk.sub.rank + subjectBonusFor(subjectKey);
  };
  const caps     = { attuneCap: INV.attuneCap(subRank("artificy")), potionCap: INV.potionCap, plantCap: INV.plantCap(subRank("herbalism")) };
  const adjustMaterials = (delta) => setC((prev) => ({ ...prev, materials: Math.max(0, (prev.materials || 0) + delta) }));

  // ---- Metabolize Roll helpers ----
  // Sum of active bonuses that specifically target Metabolize Rolls (type: "metabolize").
  // Effects that grant such bonuses add them here; the modifier is baked into the roll.
  const metabolizeBonusFor = () => rollBonusFor("metabolize");
  // Conditional bonuses for a roll category (type, optional narrowed target).
  const catCond = (type, targetKey) => condBonusesFor((b) => b.type === type && (!b.target || b.target === targetKey));
  // Maps degrees of success / failure to the required wait time before the next potion.
  const metabolizeHL = (degrees, isSuccess) => {
    if (!isSuccess) {
      if (degrees >= 4) return " — wait 1 week before your next potion.";
      if (degrees === 3) return " — wait 3 days before your next potion.";
      if (degrees === 2) return " — wait 24 hours before your next potion.";
      return " — wait 8 hours before your next potion.";
    }
    if (degrees >= 6) return " — wait 1 minute before your next potion.";
    if (degrees === 5) return " — wait 5 minutes before your next potion.";
    if (degrees === 4) return " — wait 10 minutes before your next potion.";
    if (degrees === 3) return " — wait 1 hour before your next potion.";
    if (degrees === 2) return " — wait 2 hours before your next potion.";
    return " — wait 4 hours before your next potion.";
  };

  // ---- Attunement Roll helpers ----
  // On success the artifact is ATTUNED; on a failure the result line reports how
  // far its Intensity Rank eased (per INV.attuneEase) and where it now sits, so
  // the bearer can see it inching toward a reachable attunement.
  const attuneHL = (a) => (degrees, isSuccess) => {
    if (isSuccess) return " — Attunement Successful";
    const key = String(Math.max(-11, Math.min(-1, -degrees)));
    const change = INV.attuneEase[key] || 0;
    const next = Math.max(0, a.intensity + change);
    if (change === 0) return " — Intensity rank remains unchanged at " + next + ".";
    const dir = change < 0 ? "fallen by " + Math.abs(change) : "risen by " + change;
    return " — Intensity has " + dir + " to a new rank of " + next + ".";
  };

  // ---- Inventory state (owned here; wired to magic module for cross-cutting) ----
  const [artifacts, setArtifacts] = React.useState(() => INV.artifacts.map((x) => ({ ...x })));
  const [potions,   setPotions]   = React.useState(() => INV.potions.map((x)   => ({ ...x })));
  const [recipes,   setRecipes]   = React.useState(() => INV.recipes.map((x)   => ({ ...x })));
  const [plants,    setPlants]    = React.useState(() => INV.plants.map((x)    => ({ ...x })));
  const [wands,     setWands]     = React.useState(() => INV.wands.map((x)     => ({ ...x })));
  const [glyphs,    setGlyphs]    = React.useState(() => INV.glyphs.map((x)    => ({ ...x })));
  const [items,     setItems]     = React.useState(() => INV.items.map((x)     => ({ ...x })));
  const [runeStack, setRuneStack] = React.useState([]);
  const [invToast,  setInvToast]  = React.useState(null);

  const toast    = (msg) => { setInvToast(msg); clearTimeout(window.__sfInvToast); window.__sfInvToast = setTimeout(() => setInvToast(null), 2800); };
  const mintVial = (recipe) => setPotions((prev) => {
    if (prev.reduce((s, p) => s + p.qty, 0) >= INV.potionCap) return prev;
    const ex = prev.find((p) => p.name === recipe.name);
    if (ex) return prev.map((p) => (p.id === ex.id ? { ...p, qty: p.qty + 1 } : p));
    return [...prev, { id: "pot-" + Date.now(), name: recipe.name, tone: recipe.tone, intensity: recipe.intensity, qty: 1, recipeId: recipe.id, desc: recipe.desc }];
  });

  const attunedCount = artifacts.filter((a) => a.attuned).length;
  const heldCount    = potions.reduce((s, p) => s + p.qty, 0);

  // Build search index — placed here so all state deps (wands, items, etc.) are in scope
  const searchIndex = React.useMemo(() => window.SF_SEARCH.buildIndex({
    stats, schools, spells, moves, artifacts, potions, recipes, plants,
    items, glyphs, wands, conditions, classState, bonuses,
    classes: CL.classes,
    locations: window.STARFALL_REGIONS || [],
  }), [stats, schools, spells, moves, artifacts, potions, recipes, plants, items, glyphs, wands, conditions, classState]);

  const searchResults = React.useMemo(
    () => window.SF_SEARCH.search(searchQuery, searchIndex),
    [searchQuery, searchIndex]
  );

  /* ---- Host persistence bridge (added for app integration) ----------------
     Serializes the durable character state into the `sheet` shape the host
     stores in Supabase, hydrates from a host-provided sheet on mount, and
     pushes debounced snapshots back up. No-ops when run standalone. */
  const serializeSheet = () => ({
    v: 1,
    c, conditions, stats, schools,
    classes: { rp, classState },
    magic: { bonuses, spells, moves },
    inventory: { artifacts, potions, recipes, plants, wands, glyphs, items, runeStack },
    locations,
  });
  const applySheet = (s) => {
    if (!s || typeof s !== "object") return;
    if (s.c)          setC((prev) => ({ ...prev, ...s.c }));
    if (s.conditions) setConditions(s.conditions.map((x) => ({ ...x })));
    if (s.stats)      setStats(s.stats.map((f) => ({ ...f, skills: (f.skills || []).map((k) => ({ ...k })) })));
    if (s.schools)    setSchools(s.schools.map((sc) => ({ ...sc, subjects: (sc.subjects || []).map((x) => ({ ...x })) })));
    if (s.classes)    classes.handlers.loadState(s.classes.classState, s.classes.rp);
    if (s.magic) {
      if (s.magic.bonuses) magic.setState.setBonuses(s.magic.bonuses.map((x) => ({ ...x })));
      if (s.magic.spells)  magic.setState.setSpells(s.magic.spells.map((x) => ({ ...x })));
      if (s.magic.moves)   magic.setState.setMoves(s.magic.moves.map((x) => ({ ...x })));
    }
    if (s.inventory) {
      const i = s.inventory;
      if (i.artifacts) setArtifacts(i.artifacts.map((x) => ({ ...x })));
      if (i.potions)   setPotions(i.potions.map((x) => ({ ...x })));
      if (i.recipes)   setRecipes(i.recipes.map((x) => ({ ...x })));
      if (i.plants)    setPlants(i.plants.map((x) => ({ ...x })));
      if (i.wands)     setWands(i.wands.map((x) => ({ ...x })));
      if (i.glyphs)    setGlyphs(i.glyphs.map((x) => ({ ...x })));
      if (i.items)     setItems(i.items.map((x) => ({ ...x })));
      if (i.runeStack) setRuneStack(i.runeStack.map((x) => ({ ...x })));
    }
    if (s.locations && typeof s.locations === "object") setLocations((prev) => ({ ...prev, ...s.locations }));
  };

  // Hydrate once from the host-provided sheet (set by host-bridge before mount).
  const hydratedRef = React.useRef(false);
  React.useEffect(() => {
    const seed = (typeof window !== "undefined") ? window.SF_SHEET : null;
    if (seed && Object.keys(seed).length) applySheet(seed);
    // Flag on the next tick so the hydration re-render isn't mistaken for an edit.
    const id = setTimeout(() => { hydratedRef.current = true; }, 0);
    return () => clearTimeout(id);
  }, []);

  // Persist debounced snapshots back to the host after hydration settles.
  React.useEffect(() => {
    if (!hydratedRef.current || !window.SF_HOST) return;
    window.SF_HOST.save(serializeSheet());
  }, [c, conditions, stats, schools, rp, classState, bonuses, spells, moves,
      artifacts, potions, recipes, plants, wands, glyphs, items, runeStack, locations]);

  /* ---- GM roll prompts (added for multiplayer) --------------------------
     When the GM forces a save on this character, the host delivers a prompt
     targeting SF_ME. We open the resist prompt preset to the GM's condition +
     DC; the player's own sheet rolls it (BackfireResist uses our facRank), and
     on a failed save we apply the condition here — the sheet owns that state. */
  const forcedResistRef = React.useRef(null);
  React.useEffect(() => {
    if (!window.SF_HOST || typeof window.SF_HOST.onPrompt !== "function") return;
    window.SF_HOST.onPrompt((prompt) => {
      if (!prompt || prompt.target !== window.SF_ME) return; // not for me → ignore
      if (prompt.kind === "resist" && prompt.condition) {
        forcedResistRef.current = { conditionId: prompt.condition };
        openForcedResist({ conditionId: prompt.condition, dc: prompt.dc });
      }
    });
  }, []);
  // Wrap the resist callback: log the roll (shared), then — only for a forced
  // save that failed — inflict the condition on this sheet.
  const handleResist = (args) => {
    const made = onResist(args);
    const forced = forcedResistRef.current;
    forcedResistRef.current = null;
    if (forced && made && made.pass === false) {
      setConditions((cs) => cs.map((x) =>
        x.id === args.condition.id
          ? { ...x, value: Math.min(x.max != null ? x.max : 99, (x.value || 0) + 1) }
          : x));
    }
  };
  const handleResistClose = () => { forcedResistRef.current = null; closeResist(); };

  // ---- invH: wires inventory setters + magic sync + roll prompt ----
  // op() is a shorthand that injects `who` so call-sites stay lean.
  const op = (partial, anchor) => openPrompt({ ...partial, who: meWho() }, anchor);

  const invH = {
    adjustMaterials,
    openManual:      (kind) => setManualKind(kind),
    editRecipe:      (r) => { setEditRecipe(r);   setManualKind("recipe");   },
    editArtifact:    (a) => { setEditArtifact(a); setManualKind("artifact"); },
    editWand:        (w) => { setEditWand(w);     setManualKind("wand");     },
    editGlyph:       (g) => { setEditGlyph(g);   setManualKind("glyph");   },
    editPlant:       (p) => { setEditPlant(p);   setManualKind("plant");    },
    openCompendium:  (cat)  => openCompendiumTo(cat),
    give:            (kind, subject) => setGivePayload({ kind, subject }),

    attune: (a, anchor) => {
      if (a.attuned || attunedCount >= caps.attuneCap) return;
      op({ label: "Attune to " + a.name, kind: "attune", stat: "Creativity", faculty: "Creativity", mod: effFacRank("Creativity") + subRank("artificy") + rollBonusFor("attune"), dc: a.intensity, meta: ["Artificy", "Attunement"], detail: a.desc, hl: attuneHL(a), dosMod: dosShiftFor((b) => b.type === "attune"),
        condBonuses: catCond("attune"),
        resist: { condition: "wound", dcPerDegree: 5, eyebrow: "Failed attunement", heading: "SOULBURNED", verdict: "The artifact\u2019s magic bites back, lashing out against yours." },
        onResult: (r) => {
          if (r.pass) { setArtifacts((prev) => prev.map((x) => (x.id === a.id ? { ...x, attuned: true, intensity: 0 } : x))); magic.handlers.addArtMove(a); }
          else { const key = String(Math.max(-11, Math.min(-1, -r.degrees))); const ease = INV.attuneEase[key] || 0; setArtifacts((prev) => prev.map((x) => (x.id === a.id ? { ...x, intensity: Math.max(0, x.intensity + ease) } : x))); }
        },
      }, anchor);
    },

    repairArtifact: (a, speed, anchor) => {
      const cfg = INV.repair[speed] || INV.repair.medium;
      const dc  = (cfg.dc && cfg.dc[a.condition]) || 18;
      const time = (typeof cfg.time === "object" ? cfg.time[a.condition] : cfg.time) || "";
      op({ label: cfg.label + " repair \u00b7 " + a.name, kind: "repair", stat: "Creativity", faculty: "Creativity", mod: effFacRank("Creativity") + subRank("artificy") + rollBonusFor("artifact-repair"), dc, meta: ["Artificy", "Repair", cfg.label], detail: "Mend the " + a.condition + " " + a.name + " \u2014 " + time + " of work.",
        condBonuses: catCond("artifact-repair"),
        onResult: (r) => {
          if (r.pass) {
            setArtifacts((prev) => prev.map((x) => (x.id === a.id ? { ...x, condition: "stable" } : x)));
            magic.handlers.setMoveCond(a.id, "stable");
            toast(a.name + " restored to Stable");
          } else if (a.condition === "broken") {
            setArtifacts((prev) => prev.map((x) => (x.id === a.id ? { ...x, condition: "damaged" } : x)));
            magic.handlers.setMoveCond(a.id, "damaged");
            toast(a.name + " \u00b7 partially mended \u2014 now Damaged");
          }
        },
      }, anchor);
    },
    removeArtifact: (a) => { setArtifacts((prev) => prev.filter((x) => x.id !== a.id)); magic.handlers.removeArtMove(a.id); },

    brew: (r, anchor) => {
      op({ label: "Brew " + r.name, kind: "skill", faculty: "Creativity", mod: effFacRank("Creativity") + subRank("alchemy") + rollBonusFor("brew"), dc: r.intensity, meta: ["Alchemy", "Brew"], detail: r.desc, dosMod: dosShiftFor((b) => b.type === "brew"),
        condBonuses: catCond("brew"),
        onResult: (roll) => { adjustMaterials(-r.cost); if (roll.pass) mintVial(r); },
      }, anchor);
    },
    brewMore:     (p, anchor) => { const r = recipes.find((x) => x.name === p.name); if (r) invH.brew(r, anchor); },
    takePotion:   (p, anchor) => {
      op({ label: "METABOLIZE " + p.name, kind: "metabolize", stat: "Body", mod: effFacRank("Body") + subRank("alchemy") + metabolizeBonusFor(), dc: p.intensity, meta: ["Metabolize", "Body", "Alchemy"], detail: p.desc, hl: metabolizeHL, dosMod: dosShiftFor((b) => b.type === "metabolize"),
        condBonuses: catCond("metabolize"),
        onResult: () => setPotions((prev) => prev.map((x) => (x.id === p.id ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0)),
      }, anchor);
    },
    removePotion: (p) => setPotions((prev) => prev.filter((x) => x.id !== p.id)),
    discardPotion:(p) => setPotions((prev) => prev.map((x) => (x.id === p.id ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0)),
    removeRecipe: (r) => setRecipes((prev) => prev.filter((x) => x.id !== r.id)),

    usePlant: (pl, anchor) => {
      const mode = SHARED.parsePlantRoll(pl.requiresRoll).mode;
      if (mode === "no")     return invH.markPlantUsed(pl);
      if (mode === "choose") return setChoosePlant({ pl, anchor });
      return invH.rollPlant(pl, anchor); // "yes" (and any default)
    },
    // YES processing — roll Herbalism vs the plant's intensity.
    rollPlant: (pl, anchor) => {
      op({ label: "Use " + pl.name, kind: "skill", faculty: "Insight", mod: effFacRank("Insight") + subRank("herbalism") + rollBonusFor("plantuse"), dc: pl.intensity, meta: ["Herbalism"], detail: pl.ability || pl.desc, dosMod: dosShiftFor((b) => b.type === "plantuse"),
        condBonuses: catCond("plantuse"),
        onResult: () => { if (pl.removeOnUse) setPlants((prev) => prev.filter((x) => x.id !== pl.id)); else setPlants((prev) => prev.map((x) => (x.id === pl.id ? { ...x, used: true } : x))); },
      }, anchor);
    },
    // NO processing — no roll; just mark used (or consume if single-use).
    markPlantUsed: (pl) => {
      if (pl.removeOnUse) { setPlants((prev) => prev.filter((x) => x.id !== pl.id)); toast(pl.name + " used up"); }
      else { setPlants((prev) => prev.map((x) => (x.id === pl.id ? { ...x, used: true } : x))); toast(pl.name + " used this scene"); }
    },
    harvestPlant: (pl) => { adjustMaterials(pl.value); setPlants((prev) => prev.filter((x) => x.id !== pl.id)); toast(pl.name + " harvested \u00b7 +" + pl.value + " materials"); },
    refreshPlant: (pl) => setPlants((prev) => prev.map((x) => (x.id === pl.id ? { ...x, used: false } : x))),
    refreshAllPlants: () => { setPlants((prev) => prev.map((x) => ({ ...x, used: false }))); toast("All plants refreshed"); },
    removePlant:  (pl) => setPlants((prev) => prev.filter((x) => x.id !== pl.id)),

    equipWand: (w) => {
      const equipping = !w.equipped;
      setWands((prev) => prev.map((x) => (x.id === w.id ? { ...x, equipped: equipping } : { ...x, equipped: false })));
      magic.handlers.syncWandEquip(w, equipping);
    },
    repairWand: (w, anchor) => {
      // Wandcraft roll for all wand repairs
      const currentMaterials = c.materials || 0;
      const box = { hours: 1 };
      const fmtHrs = (h) => h === 1 ? "1 hour" : Number.isInteger(h) ? h + " hours" : h.toFixed(1) + " hours";
      const wandcraftHL = (degrees, isSuccess) => {
        if (!isSuccess) return " — the work yields no progress this session.";
        const hrs = box.hours;
        const rate = 20 * degrees;
        const needed = w.maxCondition - w.condition;
        const potential = rate * hrs;
        const spent = Math.min(potential, needed, currentMaterials);
        if (spent <= 0) return " — no materials available to work with.";
        const actualHrs = spent / rate;
        const finished = spent >= needed;
        const ranOut = !finished && potential > currentMaterials;
        if (finished) return " — " + w.name + " is complete after " + fmtHrs(actualHrs) + " of work. " + spent + " materials applied.";
        if (ranOut) return " — materials exhausted after " + fmtHrs(actualHrs) + ". " + spent + " materials applied.";
        return " — " + fmtHrs(hrs) + " of work complete. " + spent + " materials applied.";
      };
      op({
        label: "Wandcraft \u00b7 " + w.name, kind: "wandcraft", faculty: "Focus",
        mod: effFacRank("Focus") + subRank("wandcrafting"), dc: 5,
        meta: ["Wandcrafting", "Wandcraft Roll"], detail: w.desc, hl: wandcraftHL,
        dosMod: dosShiftFor((b) => b.type === "wandcraft"),
        onResult: (r) => {
          box.hours = r.hours || 1;
          if (!r.pass) return;
          const rate = 20 * r.degrees;
          const needed = w.maxCondition - w.condition;
          const potential = rate * (r.hours || 1);
          const spent = Math.min(potential, needed, currentMaterials);
          if (spent <= 0) return;
          setWands((prev) => prev.map((x) => {
            if (x.id !== w.id) return x;
            const newCond = Math.min(x.maxCondition, x.condition + spent);
            return { ...x, condition: newCond, ...(newCond >= x.maxCondition ? { crafting: false } : {}) };
          }));
          adjustMaterials(-spent);
        },
      }, anchor);
    },
    setWandCondition: (w, value) => {
      const v = clamp(Math.round(value || 0), 0, w.maxCondition);
      setWands((prev) => prev.map((x) => (x.id === w.id ? { ...x, condition: v, ...(x.crafting && v >= x.maxCondition ? { crafting: false } : {}) } : x)));
    },
    removeWand: (w) => { setWands((prev) => prev.filter((x) => x.id !== w.id)); magic.handlers.syncWandRemove(w.id); },

    addToRune:     (g) => setRuneStack((prev) => [...prev, g]),
    removeFromRune:(i) => setRuneStack((prev) => prev.filter((_, idx) => idx !== i)),
    clearRune:     ()  => setRuneStack([]),
    createRune: (anchor) => {
      const cost      = runeStack.reduce((s, g) => s + (g.cost || 0), 0);
      const intensity = runeStack.reduce((s, g) => s + (g.intensity || 0), 0);
      const name      = runeStack.map((g) => g.name).join(" + ");
      op({ label: "Rune \u00b7 " + name, kind: "skill", faculty: "Logic", mod: effFacRank("Logic") + subRank("runology") + rollBonusFor("rune"), dc: intensity, meta: ["Runology", "Rune"], detail: "Inscribe a rune combining " + name + ".", dosMod: dosShiftFor((b) => b.type === "rune"),
        condBonuses: catCond("rune"),
        onResult: () => { adjustMaterials(-cost); setRuneStack([]); },
      }, anchor);
    },
    removeGlyph: (g)  => setGlyphs((prev) => prev.filter((x) => x.id !== g.id)),
    removeItem:  (it) => setItems((prev) => prev.filter((x) => x.id !== it.id)),

    useItem: (it, anchor) => {
      const isSingleUse = it.singleUse === true || String(it.singleUse || "").toUpperCase() === "YES";
      const tags = Array.isArray(it.tags) ? it.tags : (it.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
      const lostOnBackfire = tags.some((t) => t.toUpperCase().includes("LOST_ON_BACKFIRE") || t.toUpperCase().includes("BACKFIRE"));
      const lostOnFailure  = tags.some((t) => t.toUpperCase().includes("LOST_ON_FAILURE") || t.toUpperCase().includes("FAILURE"));

      const consumeOne = () => setItems((prev) =>
        prev.map((x) => x.id === it.id ? { ...x, qty: Math.max(0, (x.qty || 1) - 1) } : x)
            .filter((x) => (x.qty || 0) > 0)
      );

      // No check — just consume (if single-use) and show a toast.
      const rawCheck = (it.check || "").trim();
      if (!rawCheck || rawCheck.toUpperCase() === "NONE") {
        if (isSingleUse) { consumeOne(); toast(it.name + " \u00b7 expended"); }
        return;
      }

      // Parse "SKILL NAME + BONUS" or "SKILL NAME, DC=N" or "SKILL NAME".
      let skillName = rawCheck, flatBonus = 0, dc = null;
      const dcMatch    = rawCheck.match(/,?\s*DC\s*=\s*(\d+)/i);
      const bonusMatch = rawCheck.match(/\+\s*(\d+)\s*$/);
      if (dcMatch)    { dc = parseInt(dcMatch[1], 10);    skillName = rawCheck.slice(0, dcMatch.index).trim(); }
      if (bonusMatch) { flatBonus = parseInt(bonusMatch[1], 10); skillName = rawCheck.slice(0, bonusMatch.index).trim(); }
      skillName = skillName.replace(/,$/, "").trim();

      // Find which faculty owns this skill and what the skill's rank is.
      const normSkill = skillName.toLowerCase();
      let faculty = null, skillRank = 0;
      for (const fac of (stats || [])) {
        const match = (fac.skills || []).find((sk) => sk.name.toLowerCase() === normSkill);
        if (match) { faculty = fac.name; skillRank = match.rank; break; }
      }
      const facName = faculty || "Body";
      const mod = effFacRank(facName) + skillRank + flatBonus + rollBonusFor("item");

      op({
        label: "Use · " + it.name,
        kind: "skill",
        faculty: facName,
        mod,
        dc,
        meta: [skillName, "Item"],
        detail: it.desc,
        condBonuses: catCond("item"),
        crit: lostOnBackfire ? { fail: { on: "one", forces: false, label: "Backfire" } } : undefined,
        onResult: (r) => {
          const didBackfire = lostOnBackfire && Array.isArray(r.dice) && r.dice.some((d) => d === 1);
          const lost = didBackfire || (lostOnFailure && !r.pass);
          if (isSingleUse || lost) {
            consumeOne();
            const reason = didBackfire ? "lost to backfire" : !r.pass ? "lost on failure" : "expended";
            toast(it.name + " \u00b7 " + reason);
          }
        },
      }, anchor);
    },
  };

  // ---- Plant ↔ Overview link sync ----
  // reconciler adds them and removes any whose plant has left the satchel.
  React.useEffect(() => { magic.handlers.syncPlantLinks(plants); }, [plants]);

  // ---- Class-rank ↔ Move link sync ----
  // A chosen class-rank ability whose database TAG is a move(…) auto-grants a
  // linked Move. Rebuild the active link list whenever class ranks/choices
  // change, then reconcile — moves appear when their ability is chosen and
  // vanish when it is dropped (rank refunded or the other option picked).
  const classRank = (k) => (classState[k] ? classState[k].rank : 0);
  React.useEffect(() => {
    const links = [];
    CL.classes.forEach((k) => {
      const st = classState[k.id];
      if (!st || !st.rank) return;
      for (let L = 1; L <= st.rank; L++) {
        const side = st.choices[L];
        if (side == null) continue;
        const rung = k.ranks[L - 1];
        const opt = rung && rung.options[side];
        if (opt && opt.move) {
          links.push({
            id: "mv-cls-" + k.id + "-" + L + "-" + side,
            classKey: k.id, classLabel: k.name, rankLevel: L, side,
            title: opt.title, desc: opt.desc, move: opt.move,
          });
        }
      }
    });
    magic.handlers.syncClassMoves(links);
  }, [classState]);

  // ---- Bonus editor handlers ----
  const openAddBonus   = () => setBonusEdit({ open: true, mode: "new", bonus: window.SF_BONUS.blank() });
  const openEditBonus  = (b) => setBonusEdit({ open: true, mode: "edit", bonus: { ...b } });
  const closeBonusEdit = () => setBonusEdit((s) => ({ ...s, open: false }));
  const saveBonus      = (rec) => { if (bonusEdit.mode === "edit") updateBonus(rec.id, rec); else addBonus(rec); };
  const bonusClasses   = CL.classes
    .filter((cl) => classState[cl.id] && classState[cl.id].rank >= 1)
    .map((cl) => ({ id: cl.id, name: cl.name, rank: classState[cl.id].rank }));

  // ---- Give confirm ----
  const onGiveConfirm = (p) => {
    const who = ROSTER.find((r) => r.id === p.target) || { name: "a party-mate" };
    if (p.kind === "materials") { adjustMaterials(-p.amount); toast("Sent " + p.amount + " materials to " + who.name); }
    else {
      const nm = p.subject ? p.subject.name : "It";
      if      (p.kind === "artifact") invH.removeArtifact(p.subject);
      else if (p.kind === "potion")   setPotions((prev) => prev.map((x) => (x.id === p.subject.id ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0));
      else if (p.kind === "plant")    setPlants((prev) => prev.filter((x) => x.id !== p.subject.id));
      else if (p.kind === "wand")     invH.removeWand(p.subject);
      else if (p.kind === "glyph")    setGlyphs((prev) => prev.filter((x) => x.id !== p.subject.id));
      else if (p.kind === "item")     setItems((prev) => prev.map((x) => (x.id === p.subject.id ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0));
      toast((p.kind === "recipe" ? "Shared " : "Gave ") + nm + " to " + who.name);
    }
    setGivePayload(null);
  };

  // ---- Manual item add ----
  const saveManual = (kind, f) => {
    const id   = kind + "-" + Date.now();
    const num  = (v, d = 0) => { const n = parseInt(v, 10); return isNaN(n) ? d : n; };
    const subjOf   = (key) => subjectByKey(key);
    const subjName = (key) => { const r = subjOf(key); return r ? r.sub.name : ""; };
    const subjTone = (key) => { const r = subjOf(key); return r ? r.school.tone : "gold"; };
    const subjStat = (key) => { const r = subjOf(key); return r ? r.sub.stat : "Insight"; };
    // Build the DB-style "Requires roll" string from the manual plant form.
    const plantRequiresFromForm = (f) => { return (f.requiresRoll || "no").toUpperCase(); };
    if      (kind === "artifact") {
      if (editArtifact) {
        const artMove = { ...editArtifact.move, name: f.name + " \u2014 Boon", skill: (f.skill || "").trim() || "\u2014", dc: f.dc ? num(f.dc) : null, desc: f.desc || "" };
        setArtifacts((prev) => prev.map((x) => x.id === editArtifact.id ? { ...x, name: f.name, level: f.level || x.level, tone: f.subject ? subjTone(f.subject) : x.tone, subject: subjName(f.subject) || x.subject, subjectKey: f.subject || x.subjectKey, intensity: num(f.intensity, 1), desc: f.desc || "", move: artMove } : x));
        toast("Artifact updated"); setEditArtifact(null); return;
      }
      const artMove = { name: f.name + " \u2014 Boon", stat: f.subject ? subjStat(f.subject) : "Insight", skill: (f.skill || "").trim() || "\u2014", bonus: 0, dc: f.dc ? num(f.dc) : null, desc: f.desc || "" };
      setArtifacts((prev) => [...prev, { id, name: f.name, level: f.level || "Basic", tone: f.subject ? subjTone(f.subject) : "plum", subject: subjName(f.subject) || "\u2014", subjectKey: f.subject || "", intensity: num(f.intensity, 1), attuned: !!f.attuned, condition: "stable", desc: f.desc || "", move: artMove }]);
      if (f.attuned) addMove({ id: "mv-art-" + id, name: artMove.name, tag: f.level || "Basic", stat: artMove.stat, skill: artMove.skill, bonus: artMove.bonus, dc: artMove.dc, desc: artMove.desc });
      toast(f.attuned ? "Added to attunements" : "Added to inventory");
    }
    else if (kind === "recipe") {
      if (editRecipe) {
        setRecipes((prev) => prev.map((x) => x.id === editRecipe.id ? { ...x, name: f.name, intensity: num(f.intensity, 1), cost: num(f.cost, 0), twisted: !!f.twisted, desc: f.desc || "" } : x));
        toast("Recipe updated");
      } else {
        setRecipes((prev) => [...prev, { id, name: f.name, tone: "teal", intensity: num(f.intensity, 1), cost: num(f.cost, 0), twisted: !!f.twisted, desc: f.desc || "" }]);
        toast("Added to your potion recipes");
      }
      setEditRecipe(null);
      return;
    }
    else if (kind === "potion")   setPotions((prev) => [...prev, { id, name: f.name, tone: "teal", intensity: num(f.intensity, 1), qty: 1, twisted: !!f.twisted, recipeId: null, desc: f.desc || "" }]);
    else if (kind === "plant") {
      const passiveData = f.bonusType && f.bonusType !== "none" && f.bonusTarget
        ? { type: f.bonusType, target: f.bonusTarget, value: parseInt(f.bonusValue, 10) || 1, conditional: !!f.bonusConditional, condNote: f.bonusConditional ? (f.bonusCondNote || "") : "" }
        : null;
      if (editPlant) {
        setPlants((prev) => prev.map((x) => x.id === editPlant.id ? { ...x, name: f.name, value: num(f.value, 0), intensity: num(f.intensity, 1), removeOnUse: !!f.singleUse, requiresRoll: plantRequiresFromForm(f), desc: f.desc || "", ability: f.ability || "", passive: passiveData } : x));
        if (passiveData) {
          const bonusTargetLabel = passiveData.type === "subject" ? (subjName(passiveData.target) || passiveData.target) : passiveData.target;
          addBonus({ id: "bn-plant-" + editPlant.id, source: f.name, type: passiveData.type, target: passiveData.target, targetLabel: bonusTargetLabel, valueMode: "flat", value: passiveData.value, classKey: "", classLabel: "", active: true, conditional: passiveData.conditional, condNote: passiveData.condNote });
        }
        toast("Plant updated"); setEditPlant(null); return;
      }
      setPlants((prev) => [...prev, { id, name: f.name, tone: "forest", value: num(f.value, 0), intensity: num(f.intensity, 1), used: false, removeOnUse: !!f.singleUse, requiresRoll: plantRequiresFromForm(f), desc: f.desc || "", ability: f.ability || "", passive: passiveData }]);
      if ((f.requiresRoll || "no") !== "no") {
        addMove({ id: "mv-plant-" + id, name: f.name, tag: "Plant", stat: "Insight", skill: "Herbalism", bonus: 0, dc: num(f.intensity, 1), desc: f.ability || f.desc || "" });
      }
      if (passiveData) {
        const bonusTargetLabel = passiveData.type === "subject" ? (subjName(passiveData.target) || passiveData.target) : passiveData.target;
        addBonus({ id: "bn-plant-" + id, source: f.name, type: passiveData.type, target: passiveData.target, targetLabel: bonusTargetLabel, valueMode: "flat", value: passiveData.value, classKey: "", classLabel: "", active: true, conditional: passiveData.conditional, condNote: passiveData.condNote });
      }
    }
    else if (kind === "wand") {
      if (editWand) {
        setWands((prev) => prev.map((x) => x.id === editWand.id ? { ...x, name: f.name, cost: num(f.cost, x.cost), twisted: !!f.twisted, desc: f.desc || "" } : x));
        toast("Wand updated"); setEditWand(null); return;
      }
      const cost = num(f.cost, 6);
      let grantedMove = null;
      if (f.grantsMove) {
        let stat = f.moveStat || "Insight"; let skill = "\u2014"; let subjectKey = null; let moveKind = f.moveRollType || "stat";
        if (moveKind === "subject") {
          let sub = null;
          schools.forEach((s) => s.subjects.forEach((x) => { if (x.key === f.moveSubjectKey) sub = x; }));
          if (sub) { stat = sub.stat; skill = sub.name; subjectKey = sub.key; }
        } else if (moveKind === "skill") {
          skill = f.moveSkill || "\u2014";
          const allSk = []; stats.forEach((s) => s.skills.forEach((sk) => allSk.push({ value: sk.name, stat: s.name })));
          const found = allSk.find((sk) => sk.value === f.moveSkill); if (found) stat = found.stat;
        }
        grantedMove = { stat, skill, subjectKey, kind: moveKind, dc: f.moveDC ? num(f.moveDC) : null, backfire: !!f.moveBackfire };
      }
      let grantedSpell = null;
      if (f.grantsSpell) {
        if (f.grantedSpell) {
          grantedSpell = f.grantedSpell;
        } else if ((f.spellName || "").trim() && f.spellSubjectKey) {
          let sub = null, school = null;
          schools.forEach((s) => s.subjects.forEach((x) => { if (x.key === f.spellSubjectKey) { sub = x; school = s; } }));
          if (sub) grantedSpell = { id: "sp-wand-" + id, name: f.spellName.trim(), level: f.spellLevel || "Basic", subjectKey: sub.key, subject: sub.name, school: school.id, stat: f.spellStat || sub.stat, ap: num(f.spellAp, 0), dc: f.spellDC ? num(f.spellDC) : null, ritual: !!f.spellRitual, volatile: !!f.spellVolatile, days: 0, desc: (f.spellDesc || "").trim() };
        }
      }
      const condition = f._crafting ? 0 : cost;
      setWands((prev) => [...prev, { id, name: f.name, equipped: false, condition, maxCondition: cost, desc: f.desc || "", twisted: !!f.twisted, grantedMove, grantedSpell, ...(f._crafting ? { crafting: true } : {}) }]);
    }
    else if (kind === "glyph") {
      if (editGlyph) {
        setGlyphs((prev) => prev.map((x) => x.id === editGlyph.id ? { ...x, name: f.name, cost: num(f.cost, 0), intensity: num(f.intensity, 1), desc: f.desc || "" } : x));
        toast("Glyph updated"); setEditGlyph(null); return;
      }
      setGlyphs((prev) => [...prev, { id, name: f.name, tone: "gold", cost: num(f.cost, 0), intensity: num(f.intensity, 1), desc: f.desc || "" }]);
    }
    else if (kind === "item")  {
      const checkStr = f.hasMove && f.moveRollType
        ? (() => {
            let skill = "";
            if (f.moveRollType === "stat") skill = f.moveStat || "Insight";
            else if (f.moveRollType === "subject") {
              let sub = null;
              allSubjects.forEach((s) => { if (s.key === f.moveSubjectKey) sub = s; });
              skill = sub ? sub.name : "";
            } else if (f.moveRollType === "skill") skill = f.moveSkill || "";
            return skill + (f.moveDC ? ", DC=" + f.moveDC : "");
          })()
        : null;
      const itemTags = [];
      if (f.lostOnFailure) itemTags.push("LOST_ON_FAILURE");
      if (f.lostOnBackfire) itemTags.push("LOST_ON_BACKFIRE");
      setItems((prev) => {
        const ex = prev.find((x) => x.name === f.name);
        if (ex) return prev.map((x) => x.id === ex.id ? { ...x, qty: (x.qty || 1) + 1 } : x);
        return [...prev, { id, name: f.name, qty: Math.max(1, num(f.qty, 1)), singleUse: !!f.singleUse, check: checkStr, tags: itemTags, desc: f.desc || "" }];
      });
    }
    if (kind === "wand") toast(f._crafting ? "Ready to craft" : "Added to your inventory");
    else if (kind === "potion") toast("Added to your potions sheaf");
    else if (kind === "recipe") toast("Added to your potion recipes");
    else if (kind === "plant") toast("Added to your cultivation");
    else if (kind === "glyph") toast("Added to your library");
    else if (kind === "item") toast("Added to your inventory");
    else if (kind !== "artifact") toast((f.name || "It") + " added to your satchel");
  };

  // ---- Compendium add ----
  const allSubjects = [];
  schools.forEach((s) => s.subjects.forEach((sub) => allSubjects.push({ key: sub.key, name: sub.name })));

  const onAdd = (id) => {
    const e = D.compendium.find((x) => x.id === id);
    if (added.includes(id) && e?.cat !== "plant" && e?.cat !== "item") return;
    if (e?.cat !== "plant" && e?.cat !== "item") setAdded((a) => [...a, id]);
    setLastAdded(e ? e.name : null);
    if      (e && e.cat === "spell")    addSpell({ id: "sp-comp-" + e.id, name: e.name, level: e.level, subjectKey: e.subjectKey, subject: e.subject, school: e.school, stat: e.stat, ap: e.ap, dc: e.dc, ritual: !!e.ritual, volatile: false, days: 0, desc: e.desc });
    else if (e && e.cat === "move")     magic.handlers.addMoveFromCompendium(e);
    else if (e && e.cat === "artifact") setArtifacts((prev) => [...prev, { id: "art-comp-" + e.id, name: e.name, level: e.level, tone: e.tone, subject: e.subject || "\u2014", intensity: e.intensity != null ? e.intensity : 3, attuned: false, condition: "stable", desc: e.desc, move: { name: e.name + " \u2014 Boon", stat: "Insight", skill: "\u2014", bonus: 0, dc: null, desc: e.desc } }]);
    else if (e && e.cat === "potion")   { const cost = parseInt(String(e.cost || "0").replace(/[^0-9]/g, ""), 10) || 0; setRecipes((prev) => [...prev, { id: "rec-comp-" + e.id, name: e.name, tone: e.tone, intensity: e.intensity != null ? e.intensity : 1, cost, desc: e.desc }]); }
    else if (e && e.cat === "plant")    setPlants((prev) => [...prev, { id: "plt-comp-" + e.id, name: e.name, tone: e.tone, value: e.value || 0, intensity: e.intensity || 1, used: false, removeOnUse: !!e.removeOnUse, requiresRoll: e.requiresRoll || "YES", desc: e.desc, ability: e.ability || e.desc }]);
    else if (e && e.cat === "wand")     { const bm = /([+-]?\d+)\s+(.+)/.exec(e.bonusLabel || ""); const val = bm ? parseInt(bm[1], 10) : 0; const lbl = bm ? bm[2] : "Bonus"; setWands((prev) => [...prev, { id: "wnd-comp-" + e.id, name: e.name, tone: e.tone, equipped: false, condition: 6, maxCondition: 6, desc: e.desc, bonus: { type: "subject", target: lbl.toLowerCase(), targetLabel: lbl, value: val } }]); }
    else if (e && e.cat === "glyph")    setGlyphs((prev) => [...prev, { id: "gly-comp-" + e.id, name: e.name, tone: e.tone, cost: e.value || 0, intensity: e.intensity || 1, desc: e.desc }]);
    else if (e && e.cat === "item")     setItems((prev) => { const ex = prev.find((x) => x.name === e.name); if (ex) return prev.map((x) => x.id === ex.id ? { ...x, qty: (x.qty || 1) + 1 } : x); return [...prev, { id: "itm-comp-" + e.id, name: e.name, qty: 1, cost: e.cost ?? null, singleUse: e.singleUse ?? false, check: e.check ?? null, tags: e.tags ?? [], desc: e.desc }]; });
    clearTimeout(window.__sfToast);
    window.__sfToast = setTimeout(() => setLastAdded(null), 2600);
  };

  const onAddAttuned = (id) => {
    if (added.includes(id)) return;
    const e = D.compendium.find((x) => x.id === id);
    if (!e || e.cat !== "artifact") return;
    const art = { id: "art-comp-" + e.id, name: e.name, level: e.level, tone: e.tone, subject: e.subject || "\u2014", intensity: 0, attuned: true, condition: "stable", desc: e.desc, move: { name: e.name + " \u2014 Boon", stat: "Insight", skill: "\u2014", bonus: 0, dc: null, desc: e.desc } };
    setAdded((a) => [...a, id]);
    setLastAdded(e.name);
    setArtifacts((prev) => [...prev, art]);
    magic.handlers.addArtMove(art);
    clearTimeout(window.__sfToast);
    window.__sfToast = setTimeout(() => setLastAdded(null), 2600);
  };

  const learnDaysFor = (level) => {
    const l = (level || "").toLowerCase();
    if (l.startsWith("basic")) return 1;
    if (l.startsWith("standard")) return 2;
    if (l.startsWith("advanced")) return 5;
    return 10;
  };
  const onAddLearning = (id) => {
    if (added.includes(id)) return;
    const e = D.compendium.find((x) => x.id === id);
    if (!e || e.cat !== "spell") return;
    setAdded((a) => [...a, id]);
    setLastAdded(e.name);
    addSpell({ id: "sp-comp-" + e.id, name: e.name, level: e.level, subjectKey: e.subjectKey, subject: e.subject, school: e.school, stat: e.stat, ap: e.ap, dc: e.dc, ritual: !!e.ritual, volatile: false, days: learnDaysFor(e.level), desc: e.desc });
    clearTimeout(window.__sfToast);
    window.__sfToast = setTimeout(() => setLastAdded(null), 2600);
  };

  const onAddPotionSheaf = (id) => {
    const e = D.compendium.find((x) => x.id === id);
    if (!e || e.cat !== "potion") return;
    setPotions((prev) => {
      if (prev.reduce((s, p) => s + p.qty, 0) >= INV.potionCap) return prev;
      const ex = prev.find((p) => p.name === e.name);
      if (ex) return prev.map((p) => (p.id === ex.id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { id: "pot-comp-" + e.id, name: e.name, tone: e.tone, intensity: e.intensity != null ? e.intensity : 1, qty: 1, recipeId: null, desc: e.desc }];
    });
    setLastAdded(e.name);
    clearTimeout(window.__sfToast);
    window.__sfToast = setTimeout(() => setLastAdded(null), 2600);
  };
  const onAddPotionRecipe = (id) => {
    const e = D.compendium.find((x) => x.id === id);
    if (!e || e.cat !== "potion") return;
    if (recipes.find((r) => r.name === e.name)) return;
    const cost = parseInt(String(e.cost || "0").replace(/[^0-9]/g, ""), 10) || 0;
    setRecipes((prev) => [...prev, { id: "rec-comp-" + e.id, name: e.name, tone: e.tone, intensity: e.intensity != null ? e.intensity : 1, cost, desc: e.desc }]);
    setLastAdded(e.name);
    clearTimeout(window.__sfToast);
    window.__sfToast = setTimeout(() => setLastAdded(null), 2600);
  };

  const onAddWandCraft = (id) => {
    const e = D.compendium.find((x) => x.id === id);
    if (!e || e.cat !== "wand") return;
    const bm = /([+-]?\d+)\s+(.+)/.exec(e.bonusLabel || ""); const val = bm ? parseInt(bm[1], 10) : 0; const lbl = bm ? bm[2] : "Bonus";
    const matMax = e.mat || 6;
    setWands((prev) => [...prev, { id: "wnd-craft-" + e.id + "-" + Date.now(), name: e.name, tone: e.tone, equipped: false, condition: 0, maxCondition: matMax, crafting: true, desc: e.desc, bonus: { type: "subject", target: lbl.toLowerCase(), targetLabel: lbl, value: val } }]);
    setLastAdded(e.name);
    clearTimeout(window.__sfToast);
    window.__sfToast = setTimeout(() => setLastAdded(null), 2600);
  };

  // ---- The Admission (character creation / respec) ----
  const F = window.SF_ADMISSION;
  const [admission, setForge] = React.useState({ open: false, mode: "new", draft: null });
  const openForgeNew  = () => {
    let draft = F.blankDraft(D);
    try { const s = JSON.parse(localStorage.getItem("sf-admission-draft") || "null"); if (s && s.mode === "new") draft = { ...F.blankDraft(D), ...s }; } catch (_) {}
    setForge({ open: true, mode: "new", draft });
  };
  const openForgeEdit = () => setForge({ open: true, mode: "edit", draft: F.draftFromLive(D, { c, stats, schools, classState }) });
  const closeForge    = () => setForge((s) => ({ ...s, open: false }));

  const commitForge = (draft) => {
    setStats(F.buildStats(draft, D));
    setSchools(F.buildSchools(draft, D));
    setC((prev) => ({ ...prev, ...F.buildCharacter(draft, D) }));
    setConditions(D.conditions.map((x) => ({ ...x, value: 0 })));
    classes.handlers.loadState(F.buildClassState(draft), 0);
    // Magic: fresh ledgers from the build.
    magic.setState.setBonuses(F.buildWandBonuses(draft, D));
    magic.setState.setSpells(F.buildSpells(draft, D));
    magic.setState.setMoves([]);
    // Inventory: yields + starting/purchased gear.
    const pots = F.buildPotions(draft, D);
    setRecipes(pots.map((p) => p.recipe));
    setPotions(pots.map((p) => p.vial));
    setPlants(F.buildPlants(draft, D));
    setItems([]);
    setGlyphs(F.buildGlyphs(draft, D));
    setArtifacts(F.buildArtifacts(draft, D));
    setWands([F.buildStartingWand(draft, D), ...F.buildExtraWands(draft, D)]);
    setRuneStack([]);
    setNav("overview");
    closeForge();
    // Tell the host the build committed so create-mode persists it as a new row.
    if (window.SF_HOST && typeof window.SF_HOST.notifyCommitted === "function") window.SF_HOST.notifyCommitted();
  };

  // ---- Navigation ----
  const openDrawer       = () => setDrawer(true);
  const openCompendiumTo = (cat) => { setCompCat(cat); setDrawer(true); };
  const closeDrawer      = () => setDrawer(false);
  const onNavigate       = (id) => { if (id === "compendium") openDrawer(); else setNav(id); };
  React.useEffect(() => { window.__sfGoOverview = () => setNav("overview"); }, []);
  // Host's "create a character" flow sets this flag (in the init payload) before
  // mount, so we open the Forge on load without racing a one-shot message.
  React.useEffect(() => { if (typeof window !== "undefined" && window.SF_OPEN_FORGE) openForgeNew(); }, []);

  // ---- Character vital + condition steppers ----
  const stepVital = (key, delta) => setC((prev) => {
    const max = key === "actionPoints" ? prev.actionPointsMax : key === "resolve" ? prev.resolveMax : key === "trouble" ? 10 : null;
    return { ...prev, [key]: clamp((prev[key] || 0) + delta, 0, max) };
  });
  const stepCond = (id, delta) => setConditions((prev) =>
    prev.map((cd) => (cd.id === id ? { ...cd, value: clamp(cd.value + delta, 0, cd.max) } : cd))
  );

  // ---- Roll handlers (thin wrappers; all context injected here) ----
  const onRollSkill   = (fac, sk, total, e) => openPrompt({ who: meWho(), label: sk.name,     kind: "skill",  stat: fac.name,   mod: total, dosMod: dosShiftFor((b) => (b.type === "skill" && b.target === sk.id) || (b.type === "stat" && b.target === fac.name)), condBonuses: condBonusesFor((b) => (b.type === "skill" && b.target === sk.id) || (b.type === "stat" && b.target === fac.name)) }, e.currentTarget);
  const onRollAction = (e) => openPrompt({
    who: meWho(), label: "Action Roll", kind: "action", stat: "Insight",
    mod: effFacRank("Insight") + rollBonusFor("action"),
    dc: 10,
    meta: ["Action Roll", "DC 10 Insight"],
    condBonuses: catCond("action"),
    onResult: (r) => {
      const ap = r.pass ? Math.min(Math.max(0, r.degrees), c.actionPointsMax) : 0;
      setC((prev) => ({ ...prev, actionPoints: ap }));
    },
  }, e.currentTarget);
  const onRollResist  = (cd, e)              => openPrompt({ who: meWho(), label: "Resist " + cd.name, kind: "resist", stat: cd.resist, mod: effFacRank(cd.resist) + rollBonusFor("resist", cd.id), dosMod: dosShiftFor((b) => b.type === "resist" && (!b.target || b.target === cd.id)), condBonuses: catCond("resist", cd.id) }, e.currentTarget);
  const onRollMove    = (m, e, optIdx)       => {
    const i = optIdx || 0;
    const opt = (m.rollOptions && m.rollOptions[i]) || { stat: m.stat, skill: m.skill };
    const cond = condBonusesFor((b) => (b.type === "skill" && b.targetLabel === (opt.skill || opt.label)) || (b.type === "move" && b.target === m.id));
    // A +rankConditional move offers its class rank as an opt-in bonus, gated on
    // the condition text from the database tag.
    if (m.rankConditional && m.fromClass) {
      cond.push({ id: "rc-" + m.id, source: (m.classLabel || "Class") + " rank", value: classRank(m.fromClass), targetLabel: m.name, condNote: m.rankConditional });
    }
    openPrompt({
      who: meWho(), label: m.name, kind: "move", stat: opt.stat, mod: moveMod(m, i),
      detail: m.desc, success: m.success, fail: m.fail, hl: m.hl, dc: m.dc,
      crit: m.backfire ? window.SF_ROLL.spellCrit("Standard")
          : m.fromArtifact ? { fail: { on: "one", forces: false, backfire: true, artifactBackfire: true, label: "Backfire" } }
          : undefined,
      artifactId: m.fromArtifact || null,
      artifactLevel: m.artifactLevel || null,
      artifactCost: m.artifactCost || 0,
      artifactCondition: m.artifactCondition || null,
      dosMod: dosShiftFor((b) => (b.type === "move" && b.target === m.id) || (b.type === "stat" && b.target === opt.stat)),
      condBonuses: cond,
    }, e.currentTarget);
  };
  const onArtifactResist = () => {
    if (!artifactResistRoll) return;
    const dc  = window.SF_ROLL.artifactBackfireDC(artifactResistRoll.artifactLevel, artifactResistRoll.artifactCost);
    const mod = effFacRank("Creativity") + subRank("artificy");
    const made = roll.handlers.pushRoll({
      who: meWho(),
      label: "Artificy save \u00b7 " + artifactResistRoll.label,
      kind: "artificy",
      stat: "Creativity",
      mod, dc,
      meta: ["Artificy", "Artifact backfire"],
      crit: "resist",
    });
    if (made && !made.pass) {
      const artId    = artifactResistRoll.artifactId;
      const curCond  = artifactResistRoll.artifactCondition || "stable";
      const degraded = curCond === "stable" ? "damaged" : "broken";
      if (artId) {
        setArtifacts((prev) => prev.map((a) => (a.id === artId ? { ...a, condition: degraded } : a)));
        magic.handlers.setMoveCond(artId, degraded);
        toast(artifactResistRoll.label + " \u2014 now " + degraded);
      }
    }
    closeArtifactResist();
  };

  const onRollSubject = (school, sub, total, e) => openPrompt({ who: meWho(), label: sub.name, kind: "skill", stat: sub.stat,   mod: total, meta: [school.name.replace(" Magics", "")], dosMod: dosShiftFor((b) => (b.type === "subject" && b.target === sub.key) || (b.type === "stat" && b.target === sub.stat)), condBonuses: condBonusesFor((b) => (b.type === "subject" && b.target === sub.key) || (b.type === "stat" && b.target === sub.stat)) }, e.currentTarget);
  // DC to learn a spell by level.
  const spellLearnDC = (sp) => {
    const f = window.SF_ROLL.spellLevelKey(sp.level);
    if (f === "basic")     return 11;
    if (f === "standard")  return 16;
    if (f === "advanced")  return 21;
    if (f === "legendary") return 26;
    if (f === "hex" || f === "twisted") return 10 + 5 * (sp.ap || 0);
    return 11;
  };
  const onLearnSpell = (sp, e) => {
    const dc = spellLearnDC(sp);
    openPrompt({
      who: meWho(), label: "Learn — " + sp.name, kind: "learn", stat: sp.stat, mod: spellMod(sp) + rollBonusFor("learn", sp.subjectKey),
      dc, meta: [sp.subject, "Learning Roll"],
      detail: "You're runelocked on studying. On success, you move one step closer to being able to cast " + sp.name + ".",
      dosMod: dosShiftFor((b) => b.type === "learn" && (!b.target || b.target === sp.subjectKey)),
      condBonuses: catCond("learn", sp.subjectKey),
      onResult: (r) => {
        if (r.pass) {
          setSpellDays(sp.id, sp.days - 1);
          if (sp.days - 1 <= 0) toast(sp.name + " — fully learned.");
        }
      },
    }, e.currentTarget);
  };
  const onRollSpell   = (sp, e)              => {
    const hasHL = !window.SF_SHARED.hlbIsNA(sp.higherLevel);
    const hl = hasHL ? ((deg, ok) => ok ? window.SF_SHARED.hlbResolveText(sp.higherLevel, deg) : "the weave slips, and the spell fails to take.") : null;
    const ap = sp.ap != null ? sp.ap : (parseInt((String(sp.level).match(/(\d+)\s*ap/i) || [])[1], 10) || 0);
    openPrompt({
      who: meWho(), label: sp.name, kind: "spell", stat: sp.stat, mod: spellMod(sp),
      dc: sp.dc, detail: sp.desc, meta: [sp.subject, sp.level], hl,
      spellLevel: sp.level, spellAp: ap, canRitual: !!sp.ritual, spellVolatile: !!sp.volatile, materials: c.materials,
      dosMod: dosShiftFor((b) => (b.type === "spell" && b.target === sp.id) || (b.type === "spellroll" && (!b.target || b.target === sp.subjectKey)) || (b.type === "subject" && b.target === sp.subjectKey)),
      condBonuses: condBonusesFor((b) => (b.type === "spell" && b.target === sp.id) || (b.type === "subject" && b.target === sp.subjectKey)),
      onCast: (cost) => { if (cost > 0) { adjustMaterials(-cost); toast(sp.name + " cast \u00b7 \u2212" + cost.toLocaleString() + " materials"); } },
    }, e.currentTarget);
  };

  // ---- Advancement: rank-up mutators ----
  const bumpStatById   = (facId)  => setStats((prev) => prev.map((f) => (f.id === facId ? { ...f, rank: f.rank + 1 } : f)));
  const bumpStatByName = (name)   => setStats((prev) => prev.map((f) => (f.name === name ? { ...f, rank: f.rank + 1 } : f)));
  const bumpSkillRank  = (facId, skId)      => setStats((prev) => prev.map((f) => (f.id === facId ? { ...f, skills: f.skills.map((s) => (s.id === skId ? { ...s, rank: s.rank + 1 } : s)) } : f)));
  const bumpSubjectRank = (schoolId, subKey) => setSchools((prev) => prev.map((sc) => (sc.id === schoolId ? { ...sc, subjects: sc.subjects.map((s) => (s.key === subKey ? { ...s, rank: s.rank + 1 } : s)) } : sc)));

  // ---- Improvement rolls ----
  // Roll the associated STAT (2d10 + stat rank) vs DC 10 + ranks in the field.
  // On a success the field deepens by a rank; on a natural 10 the stat rises instead.
  const improveCrit = (statName) => ({ success: { on: "ten", forces: true, label: "Breakthrough", text: "A natural 10 \u2014 the lesson lifts your " + statName + " itself by a rank." } });

  const onImproveSkill = (fac, sk, e) => {
    const dc = 10 + sk.rank;
    openPrompt({
      who: meWho(), label: sk.name, kind: "improve", stat: fac.name, mod: effFacRank(fac.name) + rollBonusFor("improve", sk.id), dc,
      meta: ["Improvement", "DC 10 + " + sk.rank + " rank" + (sk.rank === 1 ? "" : "s")],
      crit: improveCrit(fac.name),
      dosMod: dosShiftFor((b) => b.type === "improve" && (!b.target || b.target === sk.id)),
      condBonuses: catCond("improve", sk.id),
      detail: "An improvement roll \u2014 test your " + fac.name + " against the lesson. Succeed and " + sk.name + " deepens by a rank; roll a natural 10 and " + fac.name + " itself rises instead.",
      fail: "The lesson eludes you \u2014 no progress this time.",
      onResult: (r) => {
        if (r.crit && r.crit.kind === "success") { bumpStatById(fac.id); toast(fac.name + " rises to rank " + (fac.rank + 1)); }
        else if (r.pass) { bumpSkillRank(fac.id, sk.id); toast(sk.name + " deepens to rank " + (sk.rank + 1)); }
      },
    }, e.currentTarget);
  };

  const onImproveSubject = (school, sub, e) => {
    const fr = facRank(sub.stat);
    const dc = 10 + sub.rank;
    openPrompt({
      who: meWho(), label: sub.name, kind: "improve", stat: sub.stat, mod: effFacRank(sub.stat) + rollBonusFor("improve", sub.key), dc,
      meta: [school.name.replace(" Magics", ""), "Improvement", "DC 10 + " + sub.rank + " rank" + (sub.rank === 1 ? "" : "s")],
      crit: improveCrit(sub.stat),
      dosMod: dosShiftFor((b) => b.type === "improve" && (!b.target || b.target === sub.key)),
      condBonuses: catCond("improve", sub.key),
      detail: "An improvement roll \u2014 test your " + sub.stat + " against the field. Succeed and " + sub.name + " deepens by a rank; roll a natural 10 and " + sub.stat + " itself rises instead.",
      fail: "The field resists you \u2014 no progress this time.",
      onResult: (r) => {
        if (r.crit && r.crit.kind === "success") { bumpStatByName(sub.stat); toast(sub.stat + " rises to rank " + (fr + 1)); }
        else if (r.pass) { bumpSubjectRank(school.id, sub.key); toast(sub.name + " deepens to rank " + (sub.rank + 1)); }
      },
    }, e.currentTarget);
  };

  const titleMap = { overview: "Overview", classes: "Classes", magic: "Magic", inventory: "Inventory", map: "Map" };

  return (
    <div className="sf-app" data-nav={nav}>
      <SF_Sidebar data={D} active={nav} onNavigate={onNavigate} roster={ROSTER} activeChar={activeChar} onPickChar={pickChar} compCount={D.compendium.length} onAddCharacter={openForgeNew} onEditCharacter={openForgeEdit} collapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <main className="sf-main">
        <SF_TopBar title={titleMap[nav] || "Overview"} eyebrow={c.name + " · " + c.house} c={{ ...c, resolve: Math.max(0, 5 - conditions.filter((cd) => cd.value > 0).length), resolveMax: 5 }} onStep={stepVital} onRollAction={onRollAction} onOpenCompendium={openDrawer} onToggleMobileMenu={() => setMobileMenuOpen((v) => !v)} hideVitals={nav === "map"} searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} searchResults={searchResults} onSearchSelect={handleSearchSelect} onSearchRoll={handleSearchRoll} onSearchRepair={handleSearchRepair} onSearchUse={handleSearchUse} searchMenuOpen={searchMenuOpen} onSearchMenuOpen={() => setSearchMenuOpen(true)} onSearchMenuClose={() => setSearchMenuOpen(false)} onSearchMobileOpen={() => setSearchMenuOpen(true)} />

        {nav === "overview" && (
          <div className="sf-canvas">
            <SF_IdentityHero c={c} onEdit={openForgeEdit} />
            <div className="sf-sec-head"><h2>Conditions</h2><hr className="sf-rule" /></div>
            <SF_ConditionsRail conditions={conditions} onStep={stepCond} onRoll={onRollResist} />
            <div className="sf-grid">
              <div className="sf-col">
                <div className="sf-sec-head sf-sec-head--actions">
                  <h2>Stats</h2><hr className="sf-rule" />
                  <span className="sf-sec-head__count">6 stats · 24 skills</span>
                  <div className="sf-sec-actions">
                    <button className="sf-ghost-btn" onClick={toggleAllStats}>
                      <SF_Ic name={allStatsCollapsed ? "chevrons-down" : "chevrons-up"} />
                      {allStatsCollapsed ? "Expand" : "Collapse"}
                    </button>
                  </div>
                </div>
                <div className="sf-stats">
                  {stats.map((f) => <SF_StatCard key={f.id} fac={f} collapsed={collapsedStats.has(f.id)} onToggleCollapse={() => toggleStatCollapsed(f.id)} bonusFor={bonusFor} statBonusFor={statBonusFor} onRoll={onRollSkill} onImprove={onImproveSkill} />)}
                </div>
              </div>
              <div className="sf-col">
                <SF_MovesRail moves={moves} onRoll={onRollMove} modFor={moveMod} onAddManually={() => setManualMoveOpen(true)} />
                <SF_BonusLedger bonuses={bonuses} resolveValue={resolveVal} onToggle={toggleBonus} onToggleConditional={toggleBonusConditional} onCondNote={setBonusCondNote} onAdd={openAddBonus} onEdit={openEditBonus} />
              </div>
            </div>
          </div>
        )}

        {nav === "magic" && (
          <div className="sf-canvas">
            <div className="sf-sec-head sf-sec-head--actions">
              <h2>Subjects</h2><hr className="sf-rule" />
              <span className="sf-sec-head__count">4 schools · 24 fields</span>
              <div className="sf-sec-actions">
                <button className="sf-ghost-btn" onClick={toggleAllSchools}>
                  <SF_Ic name={allSchoolsCollapsed ? "chevrons-down" : "chevrons-up"} />
                  {allSchoolsCollapsed ? "Expand" : "Collapse"}
                </button>
              </div>
            </div>
            <div className="sf-schools">
              {schools.map((s) => <SF_SchoolCard key={s.id} school={s} collapsed={collapsedSchools.has(s.id)} onToggleCollapse={() => toggleSchoolCollapsed(s.id)} facByName={facByName} subjectBonusFor={subjectBonusFor} statBonusFor={statBonusFor} onRoll={onRollSubject} onImprove={onImproveSubject} />)}
            </div>
            <SF_SpellSection
              spells={spells}
              spellMod={spellMod}
              schoolToneOf={schoolToneOf}
              subjectModFor={subjectModFor}
              onRoll={onRollSpell}
              onRemove={removeSpell}
              onLearn={onLearnSpell}
              onSetDays={(s, d) => setSpellDays(s.id, d)}
              onAddManually={() => { setEditSpell(null); setManualOpen(true); }}
              onEdit={(spell) => { setEditSpell(spell); setManualOpen(true); }}
              onBrowseCompendium={() => openCompendiumTo("spell")}
            />
          </div>
        )}

        {nav === "classes" && (
          <SF_ClassesPage data={CL} state={classState} rp={rp} density={t.ladderDensity}
            onGrantRp={grantRp} onChoose={chooseOpt} onRankUp={rankUp} onRefund={refundRank} />
        )}

        {nav === "inventory" && (
          <SF_InventoryPage
            materials={c.materials} caps={caps}
            artifacts={artifacts} potions={potions} recipes={recipes} plants={plants} wands={wands} glyphs={glyphs} items={items}
            runeStack={runeStack} roster={ROSTER} activeChar={activeChar} h={invH} />
        )}

        {nav === "map" && (
          <SF_MapPage
            roster={ROSTER} activeChar={activeChar}
            locations={locations} onSetLocation={setLocation}
            focusLocation={mapFocus} />
        )}
      </main>

      <SF_Compendium open={drawer} onClose={closeDrawer} data={D} addedIds={added} onAdd={onAdd} onAddAttuned={onAddAttuned} onAddLearning={onAddLearning} onAddPotionSheaf={onAddPotionSheaf} onAddPotionRecipe={onAddPotionRecipe} onAddWandCraft={onAddWandCraft} potionSheafCount={heldCount} potionCap={INV.potionCap} potionRecipes={recipes} lastAdded={lastAdded} cat={compCat} setCat={setCompCat} width={t.archiveWidth} attuneFull={artifacts.filter((a) => a.attuned).length >= caps.attuneCap} cultivationCap={caps.plantCap} plantSum={plants.reduce((s, p) => s + (p.value || 0), 0)} />
      <SF_ManualMove
        open={manualMoveOpen}
        onClose={() => setManualMoveOpen(false)}
        onSave={addMove}
        schools={D.magicSchools}
        stats={stats}
        classesList={CL.classes.map((c) => ({ id: c.id, name: c.name, rank: classRank(c.id) }))}
      />
      <SF_ManualSpell open={manualOpen} onClose={() => { setManualOpen(false); setEditSpell(null); }} onSave={(sp) => { editSpell ? updateSpell(sp) : addSpell(sp); }} schools={D.magicSchools} editSpell={editSpell} />
      <SF_ManualInv open={!!manualKind} kind={manualKind} subjects={allSubjects} skills={stats.flatMap((st) => st.skills)} stats={stats} schools={schools} compendiumSpells={D.compendium.filter((e) => e.cat === "spell")} attuneFull={artifacts.filter((a) => a.attuned).length >= caps.attuneCap} sheafFull={heldCount >= caps.potionCap} editSubject={manualKind === "recipe" ? editRecipe : manualKind === "artifact" ? editArtifact : manualKind === "wand" ? editWand : manualKind === "plant" ? editPlant : manualKind === "glyph" ? editGlyph : null} cultivationCap={caps.plantCap} cultivationUsed={plants.reduce((s, p) => s + (p.value || 0), 0)} onSave={saveManual} onClose={() => { setManualKind(null); setEditRecipe(null); setEditArtifact(null); setEditWand(null); setEditPlant(null); setEditGlyph(null); }} />
      <SF_GiveModal open={!!givePayload} payload={givePayload} roster={ROSTER} activeChar={activeChar} onConfirm={onGiveConfirm} onClose={() => setGivePayload(null)} />
      <SF_ChoosePlantModal
        open={!!choosePlant}
        plant={choosePlant ? choosePlant.pl : null}
        onRoll={() => { const ctx = choosePlant; setChoosePlant(null); if (ctx) invH.rollPlant(ctx.pl, ctx.anchor); }}
        onJustUse={() => { const ctx = choosePlant; setChoosePlant(null); if (ctx) invH.markPlantUsed(ctx.pl); }}
        onClose={() => setChoosePlant(null)} />
      {admission.open ? <SF_Admission mode={admission.mode} initial={admission.draft} data={D} classData={CL} onCommit={commitForge} onClose={closeForge} /> : null}
      <SF_BonusEditor open={bonusEdit.open} bonus={bonusEdit.bonus} mode={bonusEdit.mode} ctx={{ stats, schools, moves, spells, conditions }} classes={bonusClasses} onSave={saveBonus} onDelete={removeBonus} onClose={closeBonusEdit} />
      <div className={"sf-inv-toast" + (invToast ? " show" : "")} role="status">
        {invToast && <span><SF_Ic name="check-circle" /> {invToast}</span>}
      </div>

      <SF_RollToasts log={log} position={t.toastPosition} cap={t.stackCap} lifetime={Math.round(t.toastLifetime * 1000)} graceMs={Math.round(t.graceTail * 1000)} expandDefault={t.expandDefault} />
      <SF_RollDock log={log} open={dock} onToggle={() => setDock((v) => !v)} meId={activeChar} />
      <SF_RollPrompt pending={pending} onConfirm={confirmPrompt} onCancel={cancelPrompt} />
      <SF_BackfireResist open={!!resistRoll} roll={resistRoll} conditions={conditions} facRank={facRank} onResist={handleResist} onClose={handleResistClose} />
      <SF_ArtifactBackfire open={!!artifactResistRoll} roll={artifactResistRoll} effFacRank={effFacRank} subRank={subRank} onRoll={onArtifactResist} onClose={closeArtifactResist} />

      <TweaksPanel>
        <TweakSection label="Classes" />
        <TweakRadio label="Ladder density" value={t.ladderDensity} options={[{ value: "roomy", label: "Roomy" }, { value: "compact", label: "Compact" }]} onChange={(v) => setTweak("ladderDensity", v)} />
        <TweakSection label="Roll toasts" />
        <TweakRadio label="Position" value={t.toastPosition} options={[{ value: "tr", label: "Top right" }, { value: "br", label: "Bottom right" }, { value: "bc", label: "Bottom center" }]} onChange={(v) => setTweak("toastPosition", v)} />
        <TweakRadio label="Stack cap" value={String(t.stackCap)} options={["2", "3", "4"]} onChange={(v) => setTweak("stackCap", parseInt(v, 10))} />
        <TweakSlider label="Lifetime" value={t.toastLifetime} min={2} max={12} step={0.5} unit="s" onChange={(v) => setTweak("toastLifetime", v)} />
        <TweakSlider label="Grace tail" value={t.graceTail} min={0.5} max={4} step={0.5} unit="s" onChange={(v) => setTweak("graceTail", v)} />
        <TweakToggle label="Always expanded" value={t.expandDefault} onChange={(v) => setTweak("expandDefault", v)} />
        <TweakSection label="Conjure a roll" />
        <TweakButton label="From a party mate" onClick={conjureParty} />
        <TweakButton label="From the Game Master" onClick={conjureGM} />
        <TweakButton label="Ascension (inflection)" onClick={conjureInflection} />
        <TweakSection label="The Archive" />
        <TweakButton label="Open the Compendium" onClick={() => openCompendiumTo("spell")} />
        <TweakSlider label="Drawer width" value={t.archiveWidth} min={460} max={920} step={10} unit="px" onChange={(v) => setTweak("archiveWidth", v)} />
      </TweaksPanel>
    </div>
  );
}

// Mount through the host bridge: it waits for the host's initial sheet (or
// falls back to seed data when run standalone), then calls this. We also wait
// on the live Compendium / Classes loader so the sheet paints from the real
// database (it resolves immediately to seed data if the Sheet is unreachable).
const __sfMount = () => ReactDOM.createRoot(document.getElementById("root")).render(<App />);
const __sfReady = (window.SF_COMPENDIUM_DB && window.SF_COMPENDIUM_DB.ready) || Promise.resolve();
const __sfBoot  = () => __sfReady.then(__sfMount, __sfMount);
if (window.SF_HOST && typeof window.SF_HOST.onMount === "function") {
  window.SF_HOST.onMount(__sfBoot);
} else {
  __sfBoot();
}
