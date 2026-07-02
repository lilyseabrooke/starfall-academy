"use client";

/* ===========================================================================
   Starfall Academy — character sheet root (native React 19)
   ---------------------------------------------------------------------------
   Ported from public/character-sheet/app.jsx. Composes the state hooks
   (class / magic / roll / tweaks) plus inline character + inventory state, and
   renders the native component tree. The iframe + postMessage bridge are gone:
   persistence runs through useCharacterPersistence, shared rolls + GM prompts
   through useRollSync, and the live compendium through useCompendium.
   =========================================================================== */
import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { markJumpOrigin } from "./nav-return";

import "@/ds/ds.css";
import "./styles/app.css";
import "./styles/rolls.css";
import "./styles/inventory.css";
import "./styles/bonus.css";
import "./styles/map.css";
import "./styles/forge.css";
import "./styles/forge-alloc.css";

import { SEED } from "./data/seed";
import { CLASSES } from "./data/classes";
import { INV } from "./data/inventory";
import { parsePlantRoll, hlbIsNA, hlbResolveText } from "./data/shared";
import { spellCrit, artifactBackfireDC, spellLevelKey } from "./data/roll-engine";
import { blank as blankBonus } from "./data/bonus";
import { buildIndex, search as runSearch, type SearchResult } from "./data/search";
import { useCompendium } from "./data/compendium";
import { computeCompendiumGrant, computeAttunedArtifactGrant, computeLearningSpellGrant, computePotionSheafGrant, computePotionRecipeGrant, computeWandCraftGrant } from "./data/compendium-grant";
import type { GmTime } from "./data/gm-seed";

import { useClassState } from "./state/useClassState";
import { useMagicState } from "./state/useMagicState";
import { useRollState } from "./state/useRollState";
import { useTweaks } from "./state/useTweaks";
import { useCharacterPersistence } from "./integration/useCharacterPersistence";
import { useRollSync } from "./integration/useRollSync";

import { Sidebar } from "./components/parts/Sidebar";
import { TopBar } from "./components/parts/TopBar";
import { IdentityHero } from "./components/parts/IdentityHero";
import { ConditionsRail } from "./components/parts/ConditionsRail";
import { StatCard } from "./components/parts/StatCard";
import { MovesRail } from "./components/parts/MovesRail";
import { BonusLedger } from "./components/parts/BonusLedger";
import { SchoolCard } from "./components/parts/SchoolCard";
import { SpellSection } from "./components/parts/SpellSection";
import { Compendium } from "./components/parts/Compendium";
import { ManualMove } from "./components/parts/ManualMove";
import { ManualSpell } from "./components/parts/ManualSpell";
import { BackfireResist } from "./components/parts/BackfireResist";
import { ArtifactBackfireModal } from "./components/parts/ArtifactBackfireModal";
import { Icon } from "./components/Icon";
import { ClassesPage } from "./components/classes/ClassesPage";
import { InventoryPage } from "./components/inventory/InventoryPage";
import { ManualModal } from "./components/inventory/ManualModal";
import { GiveModal, ChoosePlantModal, type GivePayload } from "./components/inventory/Modals";
import { MapPage } from "./components/map/MapPage";
import { BonusEditor } from "./components/bonus/BonusEditor";
import { RollToasts } from "./components/rolls/RollToasts";
import { RollDock } from "./components/rolls/RollDock";
import { RollPrompt } from "./components/rolls/RollPrompt";
import { Admission } from "./forge/Forge";
import * as F from "./forge/forge-state";
import type { Draft } from "./forge/forge-state";

import type { RosterMember } from "@/app/(app)/characters/roster";
import type { RollRosterMember } from "./state/useRollState";
import type {
  Artifact, Bonus, CharacterVitals, Condition, Glyph, Item, MagicSchool, Move, Plant,
  Potion, Recipe, Roll, SerializedSheet, Spell, Stat, Tone, Wand, WandEffect,
} from "./types";

const clamp = (v: number, min: number, max: number | null) =>
  Math.max(min, max == null ? v : Math.min(max, v));

const TWEAK_DEFAULTS = {
  toastPosition: "br",
  stackCap: 3,
  toastLifetime: 5,
  graceTail: 1.5,
  expandDefault: false,
  archiveWidth: 690,
  ladderDensity: "roomy",
};

/** A GM-broadcast roll prompt (resist save / action roll / materials grant). */
interface GmPrompt {
  target?: string;
  kind?: string;
  condition?: string;
  dc?: number | null;
  amount?: number;
  cat?: string;
  entryId?: string;
  /** For kind:"item" — which specialized handler to route to (default = onAdd). */
  variant?: "attuned" | "learning" | "sheaf" | "recipe" | "craft";
  /** For kind:"ap" — the new actionPoints value the GM's Action Scene set. */
  value?: number;
  /** For kind:"time" — the campaign clock the GM set. */
  day?: number;
  block?: number;
  enabled?: boolean;
  /** For kind:"condition" — which character's conditions changed (this sheet's id, not a GM target). */
  character?: string;
  conds?: Record<string, number>;
}

export interface CharacterSheetProps {
  mode: "edit" | "create";
  id?: string | null;
  initialSheet?: SerializedSheet | null;
  roster?: RosterMember[];
  me?: string | null;
  campaignId?: string | null;
}

export function CharacterSheet({ mode, id, initialSheet, roster, me, campaignId }: CharacterSheetProps) {
  const router = useRouter();

  // ---- Live compendium + classes (seed until the loader resolves) ----
  const comp = useCompendium();
  const D = React.useMemo(() => ({ ...SEED, compendium: comp.compendium }), [comp.compendium]);
  const CL = React.useMemo(() => ({ ...CLASSES, classes: comp.classes }), [comp.classes]);

  // ---- Party roster (host-provided, or seed when standalone) ----
  const ROSTER = React.useMemo<RosterMember[]>(
    () => (roster && roster.length ? roster : SEED.roster.map((r) => ({ ...r }))),
    [roster]
  );
  const rollRoster = React.useMemo<RollRosterMember[]>(
    () => ROSTER.map((r) => ({ id: r.id, name: r.name, initials: r.initials, tone: r.tone as Tone, active: r.active })),
    [ROSTER]
  );

  // ---- Core UI / character state ----
  const [nav, setNav] = React.useState("overview");
  const [c, setC] = React.useState<CharacterVitals>(() => ({ ...SEED.character }));
  const [conditions, setConditions] = React.useState<Condition[]>(() => SEED.conditions.map((x) => ({ ...x })));
  const [stats, setStats] = React.useState<Stat[]>(() => SEED.stats.map((f) => ({ ...f, skills: f.skills.map((s) => ({ ...s })) })));
  const [schools, setSchools] = React.useState<MagicSchool[]>(() => SEED.magicSchools.map((s) => ({ ...s, subjects: s.subjects.map((x) => ({ ...x })) })));
  const [activeChar, setActiveChar] = React.useState(me || (ROSTER.find((r) => r.active) || ROSTER[0]).id);

  const pickChar = (cid: string) => {
    if (!cid || cid === activeChar) return;
    if (me) { markJumpOrigin(`/characters/${me}`); router.push(`/characters/${cid}`); }
    else setActiveChar(cid);
  };

  const [t] = useTweaks(TWEAK_DEFAULTS);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [collapsedStats, setCollapsedStats] = React.useState<Set<string>>(() => new Set());
  const toggleStatCollapsed = (sid: string) => setCollapsedStats((prev) => { const n = new Set(prev); if (n.has(sid)) n.delete(sid); else n.add(sid); return n; });
  const allStatsCollapsed = stats.length > 0 && collapsedStats.size === stats.length;
  const toggleAllStats = () => setCollapsedStats(allStatsCollapsed ? new Set() : new Set(stats.map((s) => s.id)));
  const [collapsedSchools, setCollapsedSchools] = React.useState<Set<string>>(() => new Set());
  const toggleSchoolCollapsed = (sid: string) => setCollapsedSchools((prev) => { const n = new Set(prev); if (n.has(sid)) n.delete(sid); else n.add(sid); return n; });
  const allSchoolsCollapsed = schools.length > 0 && collapsedSchools.size === schools.length;
  const toggleAllSchools = () => setCollapsedSchools(allSchoolsCollapsed ? new Set() : new Set(schools.map((s) => s.id)));
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(() => {
    try { return localStorage.getItem("sf-sidebar-collapsed") === "true"; } catch { return false; }
  });
  const toggleSidebar = () => setSidebarCollapsed((v) => !v);

  // ---- Search menu state ----
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchMenuOpen, setSearchMenuOpen] = React.useState(false);
  const [mapFocus, setMapFocus] = React.useState<unknown>(null);

  React.useLayoutEffect(() => {
    try { localStorage.setItem("sf-sidebar-collapsed", String(sidebarCollapsed)); } catch { /* ignore */ }
    const app = document.querySelector(".sf-app");
    if (app) app.classList.toggle("sidebar-collapsed", sidebarCollapsed);
  }, [sidebarCollapsed]);

  // ---- Party whereabouts (Map tab) ----
  const LOC_DEFAULTS: Record<string, string> = { arianna: "starfall-citadel", lys: "amber-woods", claire: "glimmerdeep-lake", suri: "ryker-cliffs", trinity: "starfall-citadel" };
  const [locations, setLocations] = React.useState<Record<string, string | null | undefined>>(() => {
    try { const s = JSON.parse(localStorage.getItem("sf-party-locations") || "null"); if (s && typeof s === "object") return { ...LOC_DEFAULTS, ...s }; } catch { /* ignore */ }
    return { ...LOC_DEFAULTS };
  });
  React.useEffect(() => { try { localStorage.setItem("sf-party-locations", JSON.stringify(locations)); } catch { /* ignore */ } }, [locations]);
  const setLocation = (cid: string, regionId: string | null) => setLocations((prev) => ({ ...prev, [cid]: regionId || null }));

  // ---- Compendium / manual-add UI ----
  const [compCat, setCompCat] = React.useState("spell");
  const [drawer, setDrawer] = React.useState(false);
  const [added, setAdded] = React.useState<string[]>([]);
  const [lastAdded, setLastAdded] = React.useState<string | null>(null);
  const [manualKind, setManualKind] = React.useState<string | null>(null);
  const [editRecipe, setEditRecipe] = React.useState<Recipe | null>(null);
  const [editArtifact, setEditArtifact] = React.useState<Artifact | null>(null);
  const [editWand, setEditWand] = React.useState<Wand | null>(null);
  const [editPlant, setEditPlant] = React.useState<Plant | null>(null);
  const [editGlyph, setEditGlyph] = React.useState<Glyph | null>(null);
  const [editSpell, setEditSpell] = React.useState<Spell | null>(null);
  const [manualOpen, setManualOpen] = React.useState(false);
  const [manualMoveOpen, setManualMoveOpen] = React.useState(false);
  const [bonusEdit, setBonusEdit] = React.useState<{ open: boolean; mode: "add" | "edit"; bonus: Bonus | null }>({ open: false, mode: "add", bonus: null });
  const [givePayload, setGivePayload] = React.useState<{ kind: string; subject: unknown } | null>(null);
  const [choosePlant, setChoosePlant] = React.useState<{ pl: Plant; anchor: HTMLElement } | null>(null);

  // ---- State modules ----
  const classes = useClassState(CL);
  const facByName = (name: string) => stats.find((f) => f.name === name);
  const magic = useMagicState(
    { bonuses: SEED.bonuses, spells: SEED.spells, moves: SEED.moves, magicSchools: SEED.magicSchools },
    { wands: INV.wands, artifacts: INV.artifacts },
    facByName,
    () => schools,
    (k) => (classes.state.classState[k] ? classes.state.classState[k].rank : 0)
  );

  // ---- Inventory state (owned here; wired to magic module for cross-cutting) ----
  const [artifacts, setArtifacts] = React.useState<Artifact[]>(() => INV.artifacts.map((x) => ({ ...x })));
  const [potions, setPotions] = React.useState<Potion[]>(() => INV.potions.map((x) => ({ ...x })));
  const [recipes, setRecipes] = React.useState<Recipe[]>(() => INV.recipes.map((x) => ({ ...x })));
  const [plants, setPlants] = React.useState<Plant[]>(() => INV.plants.map((x) => ({ ...x })));
  const [wands, setWands] = React.useState<Wand[]>(() => INV.wands.map((x) => ({ ...x })));
  const [glyphs, setGlyphs] = React.useState<Glyph[]>(() => INV.glyphs.map((x) => ({ ...x })));
  const [items, setItems] = React.useState<Item[]>(() => INV.items.map((x) => ({ ...x })));
  const [runeStack, setRuneStack] = React.useState<Glyph[]>([]);
  const [invToast, setInvToast] = React.useState<string | null>(null);
  const invToastTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ---- Roll state + sync seam ----
  const shareRef = React.useRef<(r: Roll) => void>(() => {});
  const roll = useRollState(
    { roster: rollRoster, ledgerSeed: SEED.ledgerSeed, partyPool: SEED.partyPool, gmPool: SEED.gmPool, gmInflection: SEED.gmInflection },
    activeChar,
    { multiplayer: !!campaignId, onShareRoll: (r) => shareRef.current(r) }
  );

  // ---- Destructure module members ----
  const { rp, classState } = classes.state;
  const { grantRp, chooseOpt, rankUp, refundRank } = classes.handlers;
  const { bonuses, spells, moves } = magic.state;
  const { toggleBonus, toggleBonusConditional, setBonusCondNote, addSpell, updateSpell, removeSpell, setSpellDays,
    addBonus, updateBonus, removeBonus, addMove } = magic.handlers;
  const { subjectByKey, schoolToneOf, subjectBonusFor, bonusFor, condBonusesFor, spellMod, moveMod,
    statBonusFor, rollBonusFor, resolveVal, dosShiftFor } = magic.helpers;
  const { log, dock, pending, resistRoll, artifactResistRoll } = roll.state;
  const { pushRoll, openPrompt, confirmPrompt, cancelPrompt, onResist, openForcedResist, closeResist,
    closeArtifactResist, setDock, meWho, injectRemote } = roll.handlers;

  // ---- Derived character helpers ----
  const subRank = (k: string) => { const r = subjectByKey(k); return r ? r.sub.rank : 0; };
  const facRank = (n: string) => (facByName(n) ? facByName(n)!.rank : 0);
  const effFacRank = (n: string) => facRank(n) + statBonusFor(n);
  const subjectModFor = (subjectKey: string) => {
    const sk = subjectByKey(subjectKey);
    if (!sk) return 0;
    return effFacRank(sk.sub.stat) + sk.sub.rank + subjectBonusFor(subjectKey);
  };
  const caps = { attuneCap: INV.attuneCap(subRank("artificy")), potionCap: INV.potionCap, plantCap: INV.plantCap(subRank("herbalism")) };
  const adjustMaterials = (delta: number) => setC((prev) => ({ ...prev, materials: Math.max(0, (prev.materials || 0) + delta) }));

  const toast = (msg: string) => { setInvToast(msg); clearTimeout(invToastTimer.current); invToastTimer.current = setTimeout(() => setInvToast(null), 2800); };
  const mintVial = (recipe: Recipe) => setPotions((prev) => {
    if (prev.reduce((s, p) => s + p.qty, 0) >= INV.potionCap) return prev;
    const ex = prev.find((p) => p.name === recipe.name);
    if (ex) return prev.map((p) => (p.id === ex.id ? { ...p, qty: p.qty + 1 } : p));
    return [...prev, { id: "pot-" + Date.now(), name: recipe.name, tone: recipe.tone, intensity: recipe.intensity, qty: 1, recipeId: recipe.id, desc: recipe.desc }];
  });

  const attunedCount = artifacts.filter((a) => a.attuned).length;
  const heldCount = potions.reduce((s, p) => s + p.qty, 0);

  // ---- Search index ----
  const searchIndex = React.useMemo(() => buildIndex({
    stats, schools, spells, moves, artifacts, potions, recipes, plants,
    items, glyphs, wands, conditions, classState, bonuses,
    classes: CL.classes,
    locations: [],
  }), [stats, schools, spells, moves, artifacts, potions, recipes, plants, items, glyphs, wands, conditions, classState, bonuses, CL.classes]);
  const searchResults = React.useMemo(() => runSearch(searchQuery, searchIndex), [searchQuery, searchIndex]);

  /* ---- Metabolize / attune higher-level text ---------------------------- */
  const metabolizeBonusFor = () => rollBonusFor("metabolize");
  const catCond = (type: string, targetKey?: string) => condBonusesFor((b) => b.type === type && (!b.target || b.target === targetKey));
  const metabolizeHL = (degrees: number, isSuccess: boolean) => {
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
  const attuneHL = (a: Artifact) => (degrees: number, isSuccess: boolean) => {
    if (isSuccess) return " — Attunement Successful";
    const key = String(Math.max(-11, Math.min(-1, -degrees)));
    const change = INV.attuneEase[key] || 0;
    const next = Math.max(0, a.intensity + change);
    if (change === 0) return " — Intensity rank remains unchanged at " + next + ".";
    const dir = change < 0 ? "fallen by " + Math.abs(change) : "risen by " + change;
    return " — Intensity has " + dir + " to a new rank of " + next + ".";
  };

  /* ---- Persistence + hydration ----------------------------------------- */
  const persistence = useCharacterPersistence({ mode, id });
  const serializeSheet = (): SerializedSheet => ({
    v: 1,
    c, conditions, stats, schools,
    classes: { rp, classState },
    magic: { bonuses, spells, moves },
    inventory: { artifacts, potions, recipes, plants, wands, glyphs, items, runeStack },
    locations,
  });
  const applySheet = (s: SerializedSheet | null | undefined) => {
    if (!s || typeof s !== "object") return;
    if (s.c) setC((prev) => ({ ...prev, ...s.c }));
    if (s.conditions) setConditions(s.conditions.map((x) => ({ ...x })));
    if (s.stats) setStats(s.stats.map((f) => ({ ...f, skills: (f.skills || []).map((k) => ({ ...k })) })));
    if (s.schools) setSchools(s.schools.map((sc) => ({ ...sc, subjects: (sc.subjects || []).map((x) => ({ ...x })) })));
    if (s.classes) classes.handlers.loadState(s.classes.classState, s.classes.rp);
    if (s.magic) {
      if (s.magic.bonuses) magic.setState.setBonuses(s.magic.bonuses.map((x) => ({ ...x })));
      if (s.magic.spells) magic.setState.setSpells(s.magic.spells.map((x) => ({ ...x })));
      if (s.magic.moves) magic.setState.setMoves(s.magic.moves.map((x) => ({ ...x })));
    }
    if (s.inventory) {
      const i = s.inventory;
      if (i.artifacts) setArtifacts(i.artifacts.map((x) => ({ ...x })));
      if (i.potions) setPotions(i.potions.map((x) => ({ ...x })));
      if (i.recipes) setRecipes(i.recipes.map((x) => ({ ...x })));
      if (i.plants) setPlants(i.plants.map((x) => ({ ...x })));
      if (i.wands) setWands(i.wands.map((x) => ({ ...x })));
      if (i.glyphs) setGlyphs(i.glyphs.map((x) => ({ ...x })));
      if (i.items) setItems(i.items.map((x) => ({ ...x })));
      if (i.runeStack) setRuneStack(i.runeStack.map((x) => ({ ...x })));
    }
    if (s.locations && typeof s.locations === "object") setLocations((prev) => ({ ...prev, ...(s.locations as Record<string, string | null>) }));
  };

  const hydratedRef = React.useRef(false);
  React.useEffect(() => {
    // Hydrate once from the server-provided sheet, before the first save.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialSheet && Object.keys(initialSheet).length) applySheet(initialSheet);
    const tid = setTimeout(() => { hydratedRef.current = true; }, 0);
    return () => clearTimeout(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!hydratedRef.current) return;
    persistence.save(serializeSheet());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, conditions, stats, schools, rp, classState, bonuses, spells, moves,
    artifacts, potions, recipes, plants, wands, glyphs, items, runeStack, locations]);

  /* ---- Shared roll sync + GM prompts ------------------------------------ */
  const forcedResistRef = React.useRef<{ conditionId: string } | null>(null);
  const insightModRef = React.useRef(0);

  // The campaign clock — read-only here (the GM's Clock modal is what sets
  // it). Loaded once on mount so a reload shows the current time even before
  // the next live "time" broadcast; onPrompt keeps it live after that.
  const [gmTime, setGmTime] = React.useState<GmTime>({ day: 0, block: 0, enabled: false });
  React.useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    createClient().from("campaigns").select("time_day,time_block,time_enabled").eq("id", campaignId).single().then(({ data }) => {
      if (!cancelled && data) setGmTime({ day: data.time_day ?? 0, block: data.time_block ?? 0, enabled: !!data.time_enabled });
    });
    return () => { cancelled = true; };
  }, [campaignId]);
  React.useEffect(() => { insightModRef.current = effFacRank("Insight"); });

  const onPrompt = React.useCallback((raw: unknown) => {
    const prompt = raw as GmPrompt | null;
    if (!prompt) return;
    if (prompt.kind === "time") {
      // Campaign-wide — no target, everyone at the table sees the same clock.
      setGmTime({ day: prompt.day ?? 0, block: prompt.block ?? 0, enabled: !!prompt.enabled });
      return;
    }
    if (prompt.target !== me) return;
    if (prompt.kind === "resist" && prompt.condition) {
      forcedResistRef.current = { conditionId: prompt.condition };
      openForcedResist({ conditionId: prompt.condition, dc: prompt.dc ?? null });
    } else if (prompt.kind === "action") {
      const dc = prompt.dc != null ? prompt.dc : 10;
      const r = pushRoll({ who: meWho(), kind: "action", label: "Action Roll", stat: "Insight", mod: insightModRef.current, dc, meta: ["Action Roll", "DC " + dc + " Insight"] });
      setC((prev) => ({ ...prev, actionPoints: r.pass ? Math.min(Math.max(0, r.degrees || 0), prev.actionPointsMax) : 0 }));
    } else if (prompt.kind === "ap" && prompt.value != null) {
      setC((prev) => ({ ...prev, actionPoints: Math.min(Math.max(0, prompt.value as number), prev.actionPointsMax) }));
      toast("The Game Master set your Action Points to " + prompt.value + ".");
    } else if (prompt.kind === "grant" && prompt.amount) {
      adjustMaterials(prompt.amount);
      toast("The Game Master granted you +" + prompt.amount.toLocaleString() + " materials");
    } else if (prompt.kind === "item" && prompt.entryId) {
      const e = D.compendium.find((x) => x.id === prompt.entryId);
      // onAdd/onAddAttuned/etc. are declared later in this component; by the
      // time this callback actually fires (after a full render), the closure
      // sees them fine.
      /* eslint-disable react-hooks/immutability */
      if (prompt.variant === "attuned") onAddAttuned(prompt.entryId);
      else if (prompt.variant === "learning") onAddLearning(prompt.entryId);
      else if (prompt.variant === "sheaf") onAddPotionSheaf(prompt.entryId);
      else if (prompt.variant === "recipe") onAddPotionRecipe(prompt.entryId);
      else if (prompt.variant === "craft") onAddWandCraft(prompt.entryId);
      else onAdd(prompt.entryId);
      /* eslint-enable react-hooks/immutability */
      toast("The Game Master granted you " + (e ? e.name : "an item"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const rollSync = useRollSync({ campaignId: campaignId ?? null, characterId: id ?? null, onRemoteRoll: injectRemote, onPrompt });
  React.useEffect(() => { shareRef.current = rollSync.shareRoll; }, [rollSync.shareRoll]);

  // Broadcast a "condition" prompt whenever this sheet's conditions change —
  // self-directed steps (stepCond) or a forced-resist failure (handleResist)
  // alike — so the GM's Party Board can update Resolve live. This is a live
  // nudge only; the debounced persistence effect above already durably saves
  // conditions, so a GM board that loads fresh always sees the right value.
  React.useEffect(() => {
    if (!hydratedRef.current || !campaignId || !id) return;
    const conds: Record<string, number> = {};
    for (const cd of conditions) conds[cd.id] = cd.value || 0;
    rollSync.requestRoll({ kind: "condition", character: id, conds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conditions]);

  const handleResist = (args: { condition: Condition; dc: number | null; mod: number }) => {
    const made = onResist(args);
    const forced = forcedResistRef.current;
    forcedResistRef.current = null;
    if (forced && made && made.pass === false) {
      setConditions((cs) => cs.map((x) => x.id === args.condition.id ? { ...x, value: Math.min(x.max != null ? x.max : 99, (x.value || 0) + 1) } : x));
    }
  };
  const handleResistClose = () => { forcedResistRef.current = null; closeResist(); };

  /* ---- invH: inventory handler bundle ----------------------------------- */
  const op = (partial: Parameters<typeof openPrompt>[0], anchor: HTMLElement) => openPrompt({ ...partial, who: meWho() }, anchor);

  const invH = {
    adjustMaterials,
    openManual: (kind: string) => setManualKind(kind),
    editRecipe: (r: Recipe) => { setEditRecipe(r); setManualKind("recipe"); },
    editArtifact: (a: Artifact) => { setEditArtifact(a); setManualKind("artifact"); },
    editWand: (w: Wand) => { setEditWand(w); setManualKind("wand"); },
    editGlyph: (g: Glyph) => { setEditGlyph(g); setManualKind("glyph"); },
    editPlant: (p: Plant) => { setEditPlant(p); setManualKind("plant"); },
    openCompendium: (cat?: string) => openCompendiumTo(cat || "spell"),
    give: (kind: string, subject: unknown) => setGivePayload({ kind, subject }),

    attune: (a: Artifact, anchor: HTMLElement) => {
      if (a.attuned || attunedCount >= caps.attuneCap) return;
      op({ label: "Attune to " + a.name, kind: "attune", stat: "Creativity", mod: effFacRank("Creativity") + subRank("artificy") + rollBonusFor("attune"), dc: a.intensity, meta: ["Artificy", "Attunement"], detail: a.desc, hl: attuneHL(a), dosMod: dosShiftFor((b) => b.type === "attune"),
        condBonuses: catCond("attune"),
        resist: { condition: "wound", dcPerDegree: 5, eyebrow: "Failed attunement", heading: "SOULBURNED", verdict: "The artifact’s magic bites back, lashing out against yours." },
        onResult: (r) => {
          if (r.pass) { setArtifacts((prev) => prev.map((x) => (x.id === a.id ? { ...x, attuned: true, intensity: 0 } : x))); magic.handlers.addArtMove(a); }
          else { const key = String(Math.max(-11, Math.min(-1, -(r.degrees || 0)))); const ease = INV.attuneEase[key] || 0; setArtifacts((prev) => prev.map((x) => (x.id === a.id ? { ...x, intensity: Math.max(0, x.intensity + ease) } : x))); }
        },
      }, anchor);
    },

    repairArtifact: (a: Artifact, speed: "fast" | "medium" | "slow", anchor: HTMLElement) => {
      const cfg = INV.repair[speed] || INV.repair.medium;
      const dc = (cfg.dc as Record<string, number>)[a.condition] || 18;
      const time = (cfg.time as Record<string, string>)[a.condition] || "";
      op({ label: cfg.label + " repair · " + a.name, kind: "repair", stat: "Creativity", mod: effFacRank("Creativity") + subRank("artificy") + rollBonusFor("artifact-repair"), dc, meta: ["Artificy", "Repair", cfg.label], detail: "Mend the " + a.condition + " " + a.name + " — " + time + " of work.",
        condBonuses: catCond("artifact-repair"),
        onResult: (r) => {
          if (r.pass) { setArtifacts((prev) => prev.map((x) => (x.id === a.id ? { ...x, condition: "stable" } : x))); magic.handlers.setMoveCond(a.id, "stable"); toast(a.name + " restored to Stable"); }
          else if (a.condition === "broken") { setArtifacts((prev) => prev.map((x) => (x.id === a.id ? { ...x, condition: "damaged" } : x))); magic.handlers.setMoveCond(a.id, "damaged"); toast(a.name + " · partially mended — now Damaged"); }
        },
      }, anchor);
    },
    removeArtifact: (a: Artifact) => { setArtifacts((prev) => prev.filter((x) => x.id !== a.id)); magic.handlers.removeArtMove(a.id); },

    brew: (r: Recipe, anchor: HTMLElement) => {
      op({ label: "Brew " + r.name, kind: "skill", mod: effFacRank("Creativity") + subRank("alchemy") + rollBonusFor("brew"), stat: "Creativity", dc: r.intensity, meta: ["Alchemy", "Brew"], detail: r.desc, dosMod: dosShiftFor((b) => b.type === "brew"),
        condBonuses: catCond("brew"),
        onResult: (rr) => { adjustMaterials(-r.cost); if (rr.pass) mintVial(r); },
      }, anchor);
    },
    brewMore: (p: Potion, anchor: HTMLElement) => { const r = recipes.find((x) => x.name === p.name); if (r) invH.brew(r, anchor); },
    takePotion: (p: Potion, anchor: HTMLElement) => {
      op({ label: "METABOLIZE " + p.name, kind: "metabolize", stat: "Body", mod: effFacRank("Body") + subRank("alchemy") + metabolizeBonusFor(), dc: p.intensity, meta: ["Metabolize", "Body", "Alchemy"], detail: p.desc, hl: metabolizeHL, dosMod: dosShiftFor((b) => b.type === "metabolize"),
        condBonuses: catCond("metabolize"),
        onResult: () => setPotions((prev) => prev.map((x) => (x.id === p.id ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0)),
      }, anchor);
    },
    removePotion: (p: Potion) => setPotions((prev) => prev.filter((x) => x.id !== p.id)),
    discardPotion: (p: Potion) => setPotions((prev) => prev.map((x) => (x.id === p.id ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0)),
    removeRecipe: (r: Recipe) => setRecipes((prev) => prev.filter((x) => x.id !== r.id)),

    usePlant: (pl: Plant, anchor: HTMLElement) => {
      const m = parsePlantRoll(pl.requiresRoll).mode;
      if (m === "no") return invH.markPlantUsed(pl);
      if (m === "choose") return setChoosePlant({ pl, anchor });
      return invH.rollPlant(pl, anchor);
    },
    rollPlant: (pl: Plant, anchor: HTMLElement) => {
      op({ label: "Use " + pl.name, kind: "skill", stat: "Insight", mod: effFacRank("Insight") + subRank("herbalism") + rollBonusFor("plantuse"), dc: pl.intensity, meta: ["Herbalism"], detail: pl.ability || pl.desc, dosMod: dosShiftFor((b) => b.type === "plantuse"),
        condBonuses: catCond("plantuse"),
        onResult: () => { if (pl.removeOnUse) setPlants((prev) => prev.filter((x) => x.id !== pl.id)); else setPlants((prev) => prev.map((x) => (x.id === pl.id ? { ...x, used: true } : x))); },
      }, anchor);
    },
    markPlantUsed: (pl: Plant) => {
      if (pl.removeOnUse) { setPlants((prev) => prev.filter((x) => x.id !== pl.id)); toast(pl.name + " used up"); }
      else { setPlants((prev) => prev.map((x) => (x.id === pl.id ? { ...x, used: true } : x))); toast(pl.name + " used this scene"); }
    },
    harvestPlant: (pl: Plant) => { adjustMaterials(pl.value); setPlants((prev) => prev.filter((x) => x.id !== pl.id)); toast(pl.name + " harvested · +" + pl.value + " materials"); },
    refreshPlant: (pl: Plant) => setPlants((prev) => prev.map((x) => (x.id === pl.id ? { ...x, used: false } : x))),
    refreshAllPlants: () => { setPlants((prev) => prev.map((x) => ({ ...x, used: false }))); toast("All plants refreshed"); },
    removePlant: (pl: Plant) => setPlants((prev) => prev.filter((x) => x.id !== pl.id)),

    equipWand: (w: Wand) => {
      const equipping = !w.equipped;
      setWands((prev) => prev.map((x) => (x.id === w.id ? { ...x, equipped: equipping } : { ...x, equipped: false })));
      magic.handlers.syncWandEquip(w, equipping);
    },
    repairWand: (w: Wand, anchor: HTMLElement) => {
      const currentMaterials = c.materials || 0;
      const box = { hours: 1 };
      const fmtHrs = (h: number) => (h === 1 ? "1 hour" : Number.isInteger(h) ? h + " hours" : h.toFixed(1) + " hours");
      const wandcraftHL = (degrees: number, isSuccess: boolean) => {
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
        label: "Wandcraft · " + w.name, kind: "wandcraft", stat: "Focus",
        mod: effFacRank("Focus") + subRank("wandcrafting"), dc: 5,
        meta: ["Wandcrafting", "Wandcraft Roll"], detail: w.desc, hl: wandcraftHL,
        dosMod: dosShiftFor((b) => b.type === "wandcraft"),
        onResult: (r) => {
          box.hours = r.hours || 1;
          if (!r.pass) return;
          const rate = 20 * (r.degrees || 0);
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
    setWandCondition: (w: Wand, value: number) => {
      const v = clamp(Math.round(value || 0), 0, w.maxCondition);
      setWands((prev) => prev.map((x) => (x.id === w.id ? { ...x, condition: v, ...(x.crafting && v >= x.maxCondition ? { crafting: false } : {}) } : x)));
    },
    removeWand: (w: Wand) => { setWands((prev) => prev.filter((x) => x.id !== w.id)); magic.handlers.syncWandRemove(w.id); },

    addToRune: (g: Glyph) => setRuneStack((prev) => [...prev, g]),
    removeFromRune: (i: number) => setRuneStack((prev) => prev.filter((_, idx) => idx !== i)),
    clearRune: () => setRuneStack([]),
    createRune: (anchor: HTMLElement) => {
      const cost = runeStack.reduce((s, g) => s + (g.cost || 0), 0);
      const intensity = runeStack.reduce((s, g) => s + (g.intensity || 0), 0);
      const name = runeStack.map((g) => g.name).join(" + ");
      op({ label: "Rune · " + name, kind: "skill", stat: "Logic", mod: effFacRank("Logic") + subRank("runology") + rollBonusFor("rune"), dc: intensity, meta: ["Runology", "Rune"], detail: "Inscribe a rune combining " + name + ".", dosMod: dosShiftFor((b) => b.type === "rune"),
        condBonuses: catCond("rune"),
        onResult: () => { adjustMaterials(-cost); setRuneStack([]); },
      }, anchor);
    },
    removeGlyph: (g: Glyph) => setGlyphs((prev) => prev.filter((x) => x.id !== g.id)),
    removeItem: (it: Item) => setItems((prev) => prev.filter((x) => x.id !== it.id)),

    useItem: (it: Item, anchor?: HTMLElement | null) => {
      const isSingleUse = it.singleUse === true || String(it.singleUse || "").toUpperCase() === "YES";
      const tags = Array.isArray(it.tags) ? it.tags : String(it.tags || "").split(",").map((s) => s.trim()).filter(Boolean);
      const lostOnBackfire = tags.some((s) => s.toUpperCase().includes("LOST_ON_BACKFIRE") || s.toUpperCase().includes("BACKFIRE"));
      const lostOnFailure = tags.some((s) => s.toUpperCase().includes("LOST_ON_FAILURE") || s.toUpperCase().includes("FAILURE"));
      const consumeOne = () => setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, qty: Math.max(0, (x.qty || 1) - 1) } : x)).filter((x) => (x.qty || 0) > 0));

      const rawCheck = (it.check || "").trim();
      if (!rawCheck || rawCheck.toUpperCase() === "NONE") {
        if (isSingleUse) { consumeOne(); toast(it.name + " · expended"); }
        return;
      }
      let skillName = rawCheck, flatBonus = 0, dc: number | null = null;
      const dcMatch = rawCheck.match(/,?\s*DC\s*=\s*(\d+)/i);
      const bonusMatch = rawCheck.match(/\+\s*(\d+)\s*$/);
      if (dcMatch) { dc = parseInt(dcMatch[1], 10); skillName = rawCheck.slice(0, dcMatch.index).trim(); }
      if (bonusMatch) { flatBonus = parseInt(bonusMatch[1], 10); skillName = rawCheck.slice(0, bonusMatch.index).trim(); }
      skillName = skillName.replace(/,$/, "").trim();

      const normSkill = skillName.toLowerCase();
      let faculty: string | null = null, skillRank = 0;
      for (const fac of stats) {
        const match = (fac.skills || []).find((sk) => sk.name.toLowerCase() === normSkill);
        if (match) { faculty = fac.name; skillRank = match.rank; break; }
      }
      const facName = faculty || "Body";
      const mod = effFacRank(facName) + skillRank + flatBonus + rollBonusFor("item");
      const target = anchor || document.body;
      op({
        label: "Use · " + it.name, kind: "skill", stat: facName, mod, dc, meta: [skillName, "Item"], detail: it.desc,
        condBonuses: catCond("item"),
        crit: lostOnBackfire ? { fail: { on: "one", forces: false, label: "Backfire" } } : undefined,
        onResult: (r) => {
          const didBackfire = lostOnBackfire && Array.isArray(r.dice) && r.dice.some((d) => d === 1);
          const lost = didBackfire || (lostOnFailure && !r.pass);
          if (isSingleUse || lost) {
            consumeOne();
            const reason = didBackfire ? "lost to backfire" : !r.pass ? "lost on failure" : "expended";
            toast(it.name + " · " + reason);
          }
        },
      }, target);
    },
  };

  // ---- Plant ↔ Overview link sync ----
  React.useEffect(() => { magic.handlers.syncPlantLinks(plants); }, [plants]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Class-rank ↔ Move link sync ----
  const classRank = (k: string) => (classState[k] ? classState[k].rank : 0);
  React.useEffect(() => {
    const links: Parameters<typeof magic.handlers.syncClassMoves>[0] = [];
    CL.classes.forEach((k) => {
      const st = classState[k.id];
      if (!st || !st.rank) return;
      for (let L = 1; L <= st.rank; L++) {
        const side = st.choices[L];
        if (side == null) continue;
        const rung = k.ranks[L - 1];
        const opt = rung && rung.options[side];
        if (opt && opt.move) {
          links.push({ id: "mv-cls-" + k.id + "-" + L + "-" + side, classKey: k.id, classLabel: k.name, rankLevel: L, desc: opt.desc, move: opt.move, title: opt.title });
        }
      }
    });
    magic.handlers.syncClassMoves(links);
  }, [classState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Bonus editor handlers ----
  const openAddBonus = () => setBonusEdit({ open: true, mode: "add", bonus: blankBonus() });
  const openEditBonus = (b: Bonus) => setBonusEdit({ open: true, mode: "edit", bonus: { ...b } });
  const closeBonusEdit = () => setBonusEdit((s) => ({ ...s, open: false }));
  const saveBonus = (rec: Bonus) => { if (bonusEdit.mode === "edit") updateBonus(rec.id, rec); else addBonus(rec); };
  const bonusClasses = CL.classes
    .filter((cl) => classState[cl.id] && classState[cl.id].rank >= 1)
    .map((cl) => ({ id: cl.id, name: cl.name, rank: classState[cl.id].rank }));

  // ---- Give confirm ----
  const onGiveConfirm = (p: { kind: string; subject?: { name?: string } | unknown; target: string; amount: number }) => {
    const who = ROSTER.find((r) => r.id === p.target) || { name: "a party-mate" };
    const subject = p.subject as { id?: string; name?: string } | undefined;
    if (p.kind === "materials") { adjustMaterials(-p.amount); toast("Sent " + p.amount + " materials to " + who.name); }
    else {
      const nm = subject && subject.name ? subject.name : "It";
      if (p.kind === "artifact") invH.removeArtifact(subject as Artifact);
      else if (p.kind === "potion") setPotions((prev) => prev.map((x) => (x.id === subject?.id ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0));
      else if (p.kind === "plant") setPlants((prev) => prev.filter((x) => x.id !== subject?.id));
      else if (p.kind === "wand") invH.removeWand(subject as Wand);
      else if (p.kind === "glyph") setGlyphs((prev) => prev.filter((x) => x.id !== subject?.id));
      else if (p.kind === "item") setItems((prev) => prev.map((x) => (x.id === subject?.id ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0));
      toast((p.kind === "recipe" ? "Shared " : "Gave ") + nm + " to " + who.name);
    }
    setGivePayload(null);
  };

  // ---- Manual item add ----
  const allSubjects = React.useMemo(() => schools.flatMap((s) => s.subjects), [schools]);
  const saveManual = (kind: string, f: Record<string, unknown>) => {
    const itemId = kind + "-" + Date.now();
    const fs = (k: string) => (f[k] == null ? "" : String(f[k]));
    const fb = (k: string) => !!f[k];
    const num = (v: unknown, d = 0) => { const n = parseInt(String(v ?? ""), 10); return isNaN(n) ? d : n; };
    const subjOf = (key: string) => subjectByKey(key);
    const subjName = (key: string) => { const r = subjOf(key); return r ? r.sub.name : ""; };
    const subjTone = (key: string): Tone => { const r = subjOf(key); return r ? r.school.tone : "gold"; };
    const subjStat = (key: string) => { const r = subjOf(key); return r ? r.sub.stat : "Insight"; };
    const plantRequiresFromForm = () => fs("requiresRoll").toUpperCase() || "NO";

    if (kind === "artifact") {
      if (editArtifact) {
        const artMove = { ...editArtifact.move, name: fs("name") + " — Boon", skill: fs("skill").trim() || "—", dc: fs("dc") ? num(fs("dc")) : null, desc: fs("desc") };
        setArtifacts((prev) => prev.map((x) => x.id === editArtifact.id ? { ...x, name: fs("name"), level: fs("level") || x.level, tone: fs("subject") ? subjTone(fs("subject")) : x.tone, subject: subjName(fs("subject")) || x.subject, intensity: num(fs("intensity"), 1), desc: fs("desc"), move: artMove } : x));
        toast("Artifact updated"); setEditArtifact(null); return;
      }
      const artMove = { name: fs("name") + " — Boon", stat: fs("subject") ? subjStat(fs("subject")) : "Insight", skill: fs("skill").trim() || "—", bonus: 0, dc: fs("dc") ? num(fs("dc")) : null, desc: fs("desc") };
      setArtifacts((prev) => [...prev, { id: itemId, name: fs("name"), level: fs("level") || "Basic", tone: fs("subject") ? subjTone(fs("subject")) : "plum", subject: subjName(fs("subject")) || "—", intensity: num(fs("intensity"), 1), attuned: fb("attuned"), condition: "stable", skills: fs("skill") ? [fs("skill")] : [], dc: fs("dc") ? num(fs("dc")) : 0, desc: fs("desc"), move: artMove }]);
      if (fb("attuned")) addMove({ id: "mv-art-" + itemId, name: artMove.name, tag: fs("level") || "Basic", stat: artMove.stat, skill: artMove.skill, bonus: artMove.bonus, dc: artMove.dc, desc: artMove.desc });
      toast(fb("attuned") ? "Added to attunements" : "Added to inventory");
    } else if (kind === "recipe") {
      if (editRecipe) {
        setRecipes((prev) => prev.map((x) => x.id === editRecipe.id ? { ...x, name: fs("name"), intensity: num(fs("intensity"), 1), cost: num(fs("cost"), 0), desc: fs("desc") } : x));
        toast("Recipe updated");
      } else {
        setRecipes((prev) => [...prev, { id: itemId, name: fs("name"), tone: "teal", intensity: num(fs("intensity"), 1), cost: num(fs("cost"), 0), desc: fs("desc") }]);
        toast("Added to your potion recipes");
      }
      setEditRecipe(null);
      return;
    } else if (kind === "potion") {
      setPotions((prev) => [...prev, { id: itemId, name: fs("name"), tone: "teal", intensity: num(fs("intensity"), 1), qty: 1, desc: fs("desc") }]);
    } else if (kind === "plant") {
      const passiveData = fs("bonusType") && fs("bonusType") !== "none" && fs("bonusTarget")
        ? { type: fs("bonusType"), target: fs("bonusTarget"), value: num(fs("bonusValue"), 1) || 1, conditional: fb("bonusConditional"), condNote: fb("bonusConditional") ? fs("bonusCondNote") : "" }
        : null;
      if (editPlant) {
        setPlants((prev) => prev.map((x) => x.id === editPlant.id ? { ...x, name: fs("name"), value: num(fs("value"), 0), intensity: num(fs("intensity"), 1), removeOnUse: fb("singleUse"), requiresRoll: plantRequiresFromForm(), desc: fs("desc"), ability: fs("ability") } : x));
        if (passiveData) {
          const bonusTargetLabel = passiveData.type === "subject" ? (subjName(passiveData.target) || passiveData.target) : passiveData.target;
          addBonus({ id: "bn-plant-" + editPlant.id, source: fs("name"), type: passiveData.type, target: passiveData.target, targetLabel: bonusTargetLabel, valueMode: "flat", value: passiveData.value, classKey: "", classLabel: "", active: true, conditional: passiveData.conditional, condNote: passiveData.condNote });
        }
        toast("Plant updated"); setEditPlant(null); return;
      }
      setPlants((prev) => [...prev, { id: itemId, name: fs("name"), tone: "forest", value: num(fs("value"), 0), intensity: num(fs("intensity"), 1), used: false, removeOnUse: fb("singleUse"), requiresRoll: plantRequiresFromForm(), desc: fs("desc"), ability: fs("ability") }]);
      if (fs("requiresRoll") && fs("requiresRoll") !== "no") {
        addMove({ id: "mv-plant-" + itemId, name: fs("name"), tag: "Plant", stat: "Insight", skill: "Herbalism", bonus: 0, dc: num(fs("intensity"), 1), desc: fs("ability") || fs("desc") });
      }
      if (passiveData) {
        const bonusTargetLabel = passiveData.type === "subject" ? (subjName(passiveData.target) || passiveData.target) : passiveData.target;
        addBonus({ id: "bn-plant-" + itemId, source: fs("name"), type: passiveData.type, target: passiveData.target, targetLabel: bonusTargetLabel, valueMode: "flat", value: passiveData.value, classKey: "", classLabel: "", active: true, conditional: passiveData.conditional, condNote: passiveData.condNote });
      }
    } else if (kind === "wand") {
      if (editWand) {
        setWands((prev) => prev.map((x) => x.id === editWand.id ? { ...x, name: fs("name"), maxCondition: num(fs("cost"), x.maxCondition), condition: Math.min(x.condition, num(fs("cost"), x.maxCondition)), twisted: fb("twisted"), desc: fs("desc") } : x));
        toast("Wand updated"); setEditWand(null); return;
      }
      const cost = num(fs("cost"), 6);
      let effect: WandEffect = { kind: "ability", label: "Wand" };
      if (fb("grantsMove")) {
        let stat = fs("moveStat") || "Insight", skill = "—";
        const moveKind = fs("moveRollType") || "stat";
        if (moveKind === "subject") {
          let sub: { stat: string; name: string } | null = null;
          schools.forEach((s) => s.subjects.forEach((x) => { if (x.key === fs("moveSubjectKey")) sub = x; }));
          if (sub) { stat = (sub as { stat: string }).stat; skill = (sub as { name: string }).name; }
        } else if (moveKind === "skill") {
          skill = fs("moveSkill") || "—";
          const allSk: { value: string; stat: string }[] = [];
          stats.forEach((s) => s.skills.forEach((sk) => allSk.push({ value: sk.name, stat: s.name })));
          const found = allSk.find((sk) => sk.value === fs("moveSkill")); if (found) stat = found.stat;
        }
        effect = { kind: "move", label: fs("name"), move: { name: fs("name"), stat, skill, dc: fs("moveDC") ? num(fs("moveDC")) : null, desc: fs("desc") } };
      } else if (fb("grantsSpell")) {
        const granted = f.grantedSpell as Spell | undefined;
        if (granted) effect = { kind: "spell", label: granted.name, spell: granted };
        else if (fs("spellName").trim() && fs("spellSubjectKey")) {
          let sub: { key: string; name: string; stat: string } | null = null;
          let school: MagicSchool | null = null;
          schools.forEach((s) => s.subjects.forEach((x) => { if (x.key === fs("spellSubjectKey")) { sub = x; school = s; } }));
          if (sub) {
            const sb = sub as { key: string; name: string; stat: string };
            const spell: Spell = { id: "sp-wand-" + itemId, name: fs("spellName").trim(), level: fs("spellLevel") || "Basic", subjectKey: sb.key, subject: sb.name, school: school ? (school as MagicSchool).id : "", stat: fs("spellStat") || sb.stat, ap: num(fs("spellAp"), 0), dc: fs("spellDC") ? num(fs("spellDC")) : null, ritual: fb("spellRitual"), volatile: fb("spellVolatile"), days: 0, desc: fs("spellDesc").trim() };
            effect = { kind: "spell", label: spell.name, spell };
          }
        }
      }
      const crafting = fb("_crafting");
      const condition = crafting ? 0 : cost;
      setWands((prev) => [...prev, { id: itemId, name: fs("name"), equipped: false, condition, maxCondition: cost, desc: fs("desc"), twisted: fb("twisted"), effect, ...(crafting ? { crafting: true } : {}) }]);
    } else if (kind === "glyph") {
      if (editGlyph) {
        setGlyphs((prev) => prev.map((x) => x.id === editGlyph.id ? { ...x, name: fs("name"), cost: num(fs("cost"), 0), intensity: num(fs("intensity"), 1), desc: fs("desc") } : x));
        toast("Glyph updated"); setEditGlyph(null); return;
      }
      setGlyphs((prev) => [...prev, { id: itemId, name: fs("name"), tone: "gold", cost: num(fs("cost"), 0), intensity: num(fs("intensity"), 1), desc: fs("desc") }]);
    } else if (kind === "item") {
      const checkStr = fb("hasMove") && fs("moveRollType")
        ? (() => {
            let skill = "";
            if (fs("moveRollType") === "stat") skill = fs("moveStat") || "Insight";
            else if (fs("moveRollType") === "subject") { let sub: { name: string } | null = null; allSubjects.forEach((s) => { if (s.key === fs("moveSubjectKey")) sub = s; }); skill = sub ? (sub as { name: string }).name : ""; }
            else if (fs("moveRollType") === "skill") skill = fs("moveSkill") || "";
            return skill + (fs("moveDC") ? ", DC=" + fs("moveDC") : "");
          })()
        : null;
      const itemTags: string[] = [];
      if (fb("lostOnFailure")) itemTags.push("LOST_ON_FAILURE");
      if (fb("lostOnBackfire")) itemTags.push("LOST_ON_BACKFIRE");
      setItems((prev) => {
        const ex = prev.find((x) => x.name === fs("name"));
        if (ex) return prev.map((x) => (x.id === ex.id ? { ...x, qty: (x.qty || 1) + 1 } : x));
        return [...prev, { id: itemId, name: fs("name"), qty: Math.max(1, num(fs("qty"), 1)), singleUse: fb("singleUse"), check: checkStr, tags: itemTags, desc: fs("desc") }];
      });
    }
    if (kind === "wand") toast(fb("_crafting") ? "Ready to craft" : "Added to your inventory");
    else if (kind === "potion") toast("Added to your potions sheaf");
    else if (kind === "glyph") toast("Added to your library");
    else if (kind === "item") toast("Added to your inventory");
  };

  // ---- Compendium add ----
  const finishToast = (name: string | null) => { setLastAdded(name); };
  const onAdd = (cid: string) => {
    const e = D.compendium.find((x) => x.id === cid);
    if (added.includes(cid) && e?.cat !== "plant" && e?.cat !== "item") return;
    if (e?.cat !== "plant" && e?.cat !== "item") setAdded((a) => [...a, cid]);
    finishToast(e ? e.name : null);
    if (e && e.cat === "spell") { const res = computeCompendiumGrant(e, spells); if (res?.field === "spells") magic.setState.setSpells(res.value); }
    else if (e && e.cat === "move") magic.handlers.addMoveFromCompendium(e);
    else if (e && e.cat === "artifact") { const res = computeCompendiumGrant(e, artifacts); if (res?.field === "artifacts") setArtifacts(res.value); }
    else if (e && e.cat === "potion") { const res = computeCompendiumGrant(e, recipes); if (res?.field === "recipes") setRecipes(res.value); }
    else if (e && e.cat === "plant") { const res = computeCompendiumGrant(e, plants); if (res?.field === "plants") setPlants(res.value); }
    else if (e && e.cat === "wand") { const res = computeCompendiumGrant(e, wands); if (res?.field === "wands") setWands(res.value); }
    else if (e && e.cat === "glyph") { const res = computeCompendiumGrant(e, glyphs); if (res?.field === "glyphs") setGlyphs(res.value); }
    else if (e && e.cat === "item") { const res = computeCompendiumGrant(e, items); if (res?.field === "items") setItems(res.value); }
    clearLastAddedSoon();
  };

  const lastAddedTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearLastAddedSoon = () => { clearTimeout(lastAddedTimer.current); lastAddedTimer.current = setTimeout(() => setLastAdded(null), 2600); };

  const onAddAttuned = (cid: string) => {
    if (added.includes(cid)) return;
    const e = D.compendium.find((x) => x.id === cid);
    if (!e) return;
    const res = computeAttunedArtifactGrant(e, artifacts, moves);
    if (!res) return;
    setAdded((a) => [...a, cid]);
    finishToast(e.name);
    setArtifacts(res.artifacts);
    magic.setState.setMoves(res.moves);
    clearLastAddedSoon();
  };

  const onAddLearning = (cid: string) => {
    if (added.includes(cid)) return;
    const e = D.compendium.find((x) => x.id === cid);
    if (!e) return;
    const res = computeLearningSpellGrant(e, spells);
    if (!res) return;
    setAdded((a) => [...a, cid]);
    finishToast(e.name);
    magic.setState.setSpells(res.value);
    clearLastAddedSoon();
  };

  const onAddPotionSheaf = (cid: string) => {
    const e = D.compendium.find((x) => x.id === cid);
    if (!e) return;
    const res = computePotionSheafGrant(e, potions, INV.potionCap);
    if (!res) return;
    setPotions(res.value);
    finishToast(e.name);
    clearLastAddedSoon();
  };
  const onAddPotionRecipe = (cid: string) => {
    const e = D.compendium.find((x) => x.id === cid);
    if (!e) return;
    const res = computePotionRecipeGrant(e, recipes);
    if (!res) return;
    setRecipes(res.value);
    finishToast(e.name);
    clearLastAddedSoon();
  };
  const onAddWandCraft = (cid: string) => {
    const e = D.compendium.find((x) => x.id === cid);
    if (!e) return;
    const res = computeWandCraftGrant(e, wands);
    if (!res) return;
    setWands(res.value);
    finishToast(e.name);
    clearLastAddedSoon();
  };

  // ---- The Admission (character creation / respec) ----
  const [admission, setForge] = React.useState<{ open: boolean; mode: "new" | "edit"; draft: Draft | null }>({ open: false, mode: "new", draft: null });
  const forgeData = React.useMemo(() => ({ creation: SEED.creation, houses: SEED.houses, stats, magicSchools: schools, compendium: D.compendium }), [stats, schools, D.compendium]);
  const openForgeNew = () => {
    
    let draft = F.blankDraft();
    try { const s = JSON.parse(localStorage.getItem("sf-admission-draft") || "null"); if (s && s.mode === "new") draft = { ...F.blankDraft(), ...s }; } catch { /* ignore */ }
    setForge({ open: true, mode: "new", draft });
  };
  const openForgeEdit = () => {
    
    setForge({ open: true, mode: "edit", draft: F.draftFromLive(forgeData, { c, stats, schools, classState }) });
  };
  const closeForge = () => {
    // In create mode there's no character until the Forge commits — closing
    // without committing would otherwise leave the seed demo sheet showing.
    if (admission.mode === "new" && mode === "create") { router.push("/characters"); return; }
    setForge((s) => ({ ...s, open: false }));
  };

  const commitForge = (draft: Draft) => {
    
    setStats(F.buildStats(draft, forgeData));
    setSchools(F.buildSchools(draft, forgeData));
    setC((prev) => ({ ...prev, ...F.buildCharacter(draft, forgeData) }));
    setConditions(SEED.conditions.map((x) => ({ ...x, value: 0 })));
    classes.handlers.loadState(F.buildClassState(draft), 0);
    magic.setState.setBonuses(F.buildWandBonuses(draft, forgeData));
    magic.setState.setSpells(F.buildSpells(draft, forgeData));
    magic.setState.setMoves([]);
    const pots = F.buildPotions(draft, forgeData);
    setRecipes(pots.map((p) => p.recipe));
    setPotions(pots.map((p) => p.vial));
    setPlants(F.buildPlants(draft, forgeData) as Plant[]);
    setItems([]);
    setGlyphs(F.buildGlyphs(draft, forgeData) as Glyph[]);
    setArtifacts(F.buildArtifacts(draft, forgeData) as unknown as Artifact[]);
    setWands([F.buildStartingWand(draft, forgeData) as unknown as Wand, ...(F.buildExtraWands(draft, forgeData) as unknown as Wand[])]);
    setRuneStack([]);
    setNav("overview");
    closeForge();
    persistence.notifyCommitted();
  };

  // ---- Navigation ----
  const openDrawer = () => setDrawer(true);
  const openCompendiumTo = (cat: string) => { setCompCat(cat); setDrawer(true); };
  const closeDrawer = () => setDrawer(false);
  const onNavigate = (navId: string) => { if (navId === "compendium") openDrawer(); else setNav(navId); };
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { if (mode === "create") openForgeNew(); }, [mode]);

  // ---- Character vital + condition steppers ----
  const stepVital = (key: string, delta: number) => setC((prev) => {
    const max = key === "actionPoints" ? prev.actionPointsMax : key === "resolve" ? prev.resolveMax : key === "trouble" ? 10 : null;
    const cur = (prev as unknown as Record<string, number>)[key] || 0;
    return { ...prev, [key]: clamp(cur + delta, 0, max) };
  });
  const stepCond = (cid: string, delta: number) => setConditions((prev) => prev.map((cd) => (cd.id === cid ? { ...cd, value: clamp(cd.value + delta, 0, cd.max) } : cd)));

  // ---- Roll handlers ----
  type RollSkill = { id?: string; name: string; rank?: number };
  const onRollSkill = (fac: Stat, sk: RollSkill, total: number, e: { currentTarget: Element }) => openPrompt({ who: meWho(), label: sk.name, kind: "skill", stat: fac.name, mod: total, dosMod: dosShiftFor((b) => (b.type === "skill" && b.target === sk.id) || (b.type === "stat" && b.target === fac.name)), condBonuses: condBonusesFor((b) => (b.type === "skill" && b.target === sk.id) || (b.type === "stat" && b.target === fac.name)) }, e.currentTarget as HTMLElement);
  const onRollAction = () => openPrompt({
    who: meWho(), label: "Action Roll", kind: "action", stat: "Insight",
    mod: effFacRank("Insight") + rollBonusFor("action"), dc: 10, meta: ["Action Roll", "DC 10 Insight"],
    condBonuses: catCond("action"),
    onResult: (r) => { const ap = r.pass ? Math.min(Math.max(0, r.degrees || 0), c.actionPointsMax) : 0; setC((prev) => ({ ...prev, actionPoints: ap })); },
  }, document.body);
  const onRollResist = (cd: Condition, e: { currentTarget: Element }) => openPrompt({ who: meWho(), label: "Resist " + cd.name, kind: "resist", stat: cd.resist, mod: effFacRank(cd.resist) + rollBonusFor("resist", cd.id), dosMod: dosShiftFor((b) => b.type === "resist" && (!b.target || b.target === cd.id)), condBonuses: catCond("resist", cd.id) }, e.currentTarget as HTMLElement);
  const onRollMove = (m: Move, e: { currentTarget: Element }, optIdx?: number) => {
    const i = optIdx || 0;
    const opt = (m.rollOptions && m.rollOptions[i]) || { stat: m.stat, skill: m.skill, label: m.skill };
    const cond = condBonusesFor((b) => (b.type === "skill" && b.targetLabel === (opt.skill || opt.label)) || (b.type === "move" && b.target === m.id));
    if (m.rankConditional && m.fromClass) {
      cond.push({ id: "rc-" + m.id, source: (m.classLabel || "Class") + " rank", value: classRank(m.fromClass), targetLabel: m.name, condNote: m.rankConditional });
    }
    openPrompt({
      who: meWho(), label: m.name, kind: "move", stat: opt.stat, mod: moveMod(m, i),
      detail: m.desc, success: m.success, fail: m.fail, hl: (m as { hl?: ((d: number, s: boolean) => string) | null }).hl ?? null, dc: m.dc,
      crit: m.backfire ? spellCrit("Standard", false, false)
        : m.fromArtifact ? { fail: { on: "one", forces: false, backfire: true, artifactBackfire: true, label: "Backfire" } }
        : undefined,
      artifactId: m.fromArtifact || null,
      artifactLevel: m.artifactLevel || null,
      artifactCost: m.artifactCost || 0,
      artifactCondition: m.artifactCondition || null,
      dosMod: dosShiftFor((b) => (b.type === "move" && b.target === m.id) || (b.type === "stat" && b.target === opt.stat)),
      condBonuses: cond,
    }, e.currentTarget as HTMLElement);
  };
  const onArtifactResist = () => {
    if (!artifactResistRoll) return;
    const ar = artifactResistRoll as Roll;
    const dc = artifactBackfireDC(ar.artifactLevel, ar.artifactCost);
    const mod = effFacRank("Creativity") + subRank("artificy");
    const made = pushRoll({ who: meWho(), label: "Artificy save · " + ar.label, kind: "artificy", stat: "Creativity", mod, dc, meta: ["Artificy", "Artifact backfire"], crit: "resist" });
    if (made && !made.pass) {
      const artId = ar.artifactId;
      const curCond = ar.artifactCondition || "stable";
      const degraded = curCond === "stable" ? "damaged" : "broken";
      if (artId) { setArtifacts((prev) => prev.map((a) => (a.id === artId ? { ...a, condition: degraded } : a))); magic.handlers.setMoveCond(artId, degraded); toast(ar.label + " — now " + degraded); }
    }
    closeArtifactResist();
  };
  type RollSubject = { key: string; name: string; stat: string; rank: number };
  const onRollSubject = (school: MagicSchool, sub: RollSubject, total: number, e: { currentTarget: Element }) => openPrompt({ who: meWho(), label: sub.name, kind: "skill", stat: sub.stat, mod: total, meta: [school.name.replace(" Magics", "")], dosMod: dosShiftFor((b) => (b.type === "subject" && b.target === sub.key) || (b.type === "stat" && b.target === sub.stat)), condBonuses: condBonusesFor((b) => (b.type === "subject" && b.target === sub.key) || (b.type === "stat" && b.target === sub.stat)) }, e.currentTarget as HTMLElement);

  const spellLearnDC = (sp: Spell) => {
    const f = spellLevelKey(sp.level);
    if (f === "basic") return 11;
    if (f === "standard") return 16;
    if (f === "advanced") return 21;
    if (f === "legendary") return 26;
    if (f === "hex" || f === "twisted") return 10 + 5 * (sp.ap || 0);
    return 11;
  };
  const onLearnSpell = (sp: Spell, e: { currentTarget: Element }) => {
    const dc = spellLearnDC(sp);
    openPrompt({
      who: meWho(), label: "Learn — " + sp.name, kind: "learn", stat: sp.stat, mod: spellMod(sp) + rollBonusFor("learn", sp.subjectKey),
      dc, meta: [sp.subject, "Learning Roll"],
      detail: "You're runelocked on studying. On success, you move one step closer to being able to cast " + sp.name + ".",
      dosMod: dosShiftFor((b) => b.type === "learn" && (!b.target || b.target === sp.subjectKey)),
      condBonuses: catCond("learn", sp.subjectKey),
      onResult: (r) => { if (r.pass) { setSpellDays(sp.id, (sp.days || 0) - 1); if ((sp.days || 0) - 1 <= 0) toast(sp.name + " — fully learned."); } },
    }, e.currentTarget as HTMLElement);
  };
  const onRollSpell = (sp: Spell, e: { currentTarget: Element }) => {
    const hasHL = !hlbIsNA(sp.higherLevel);
    const hl = hasHL ? ((deg: number, ok: boolean) => (ok ? hlbResolveText(sp.higherLevel, deg) || "" : "the weave slips, and the spell fails to take.")) : null;
    const ap = sp.ap != null ? sp.ap : (parseInt((String(sp.level).match(/(\d+)\s*ap/i) || [])[1], 10) || 0);
    openPrompt({
      who: meWho(), label: sp.name, kind: "spell", stat: sp.stat, mod: spellMod(sp),
      dc: sp.dc, detail: sp.desc, meta: [sp.subject, sp.level], hl,
      spellLevel: sp.level, spellAp: ap, canRitual: !!sp.ritual, spellVolatile: !!sp.volatile, materials: c.materials,
      dosMod: dosShiftFor((b) => (b.type === "spell" && b.target === sp.id) || (b.type === "spellroll" && (!b.target || b.target === sp.subjectKey)) || (b.type === "subject" && b.target === sp.subjectKey)),
      condBonuses: condBonusesFor((b) => (b.type === "spell" && b.target === sp.id) || (b.type === "subject" && b.target === sp.subjectKey)),
      onCast: (cost) => { if (cost > 0) { adjustMaterials(-cost); toast(sp.name + " cast · −" + cost.toLocaleString() + " materials"); } },
    }, e.currentTarget as HTMLElement);
  };

  // ---- Advancement: rank-up mutators ----
  const bumpStatById = (facId: string) => setStats((prev) => prev.map((f) => (f.id === facId ? { ...f, rank: f.rank + 1 } : f)));
  const bumpStatByName = (name: string) => setStats((prev) => prev.map((f) => (f.name === name ? { ...f, rank: f.rank + 1 } : f)));
  const bumpSkillRank = (facId: string, skId: string) => setStats((prev) => prev.map((f) => (f.id === facId ? { ...f, skills: f.skills.map((s) => (s.id === skId ? { ...s, rank: s.rank + 1 } : s)) } : f)));
  const bumpSubjectRank = (schoolId: string, subKey: string) => setSchools((prev) => prev.map((sc) => (sc.id === schoolId ? { ...sc, subjects: sc.subjects.map((s) => (s.key === subKey ? { ...s, rank: s.rank + 1 } : s)) } : sc)));

  const improveCrit = (statName: string) => ({ success: { on: "ten" as const, forces: true, label: "Breakthrough", text: "A natural 10 — the lesson lifts your " + statName + " itself by a rank." } });
  const onImproveSkill = (fac: Stat, sk: RollSkill & { rank: number }, e: { currentTarget: Element }) => {
    const dc = 10 + sk.rank;
    openPrompt({
      who: meWho(), label: sk.name, kind: "improve", stat: fac.name, mod: effFacRank(fac.name) + rollBonusFor("improve", sk.id), dc,
      meta: ["Improvement", "DC 10 + " + sk.rank + " rank" + (sk.rank === 1 ? "" : "s")],
      crit: improveCrit(fac.name),
      dosMod: dosShiftFor((b) => b.type === "improve" && (!b.target || b.target === sk.id)),
      condBonuses: catCond("improve", sk.id),
      detail: "An improvement roll — test your " + fac.name + " against the lesson. Succeed and " + sk.name + " deepens by a rank; roll a natural 10 and " + fac.name + " itself rises instead.",
      fail: "The lesson eludes you — no progress this time.",
      onResult: (r) => {
        if (r.crit && r.crit.kind === "success") { bumpStatById(fac.id); toast(fac.name + " rises to rank " + (fac.rank + 1)); }
        else if (r.pass && sk.id) { bumpSkillRank(fac.id, sk.id); toast(sk.name + " deepens to rank " + (sk.rank + 1)); }
      },
    }, e.currentTarget as HTMLElement);
  };
  const onImproveSubject = (school: MagicSchool, sub: RollSubject, e: { currentTarget: Element }) => {
    const fr = facRank(sub.stat);
    const dc = 10 + sub.rank;
    openPrompt({
      who: meWho(), label: sub.name, kind: "improve", stat: sub.stat, mod: effFacRank(sub.stat) + rollBonusFor("improve", sub.key), dc,
      meta: [school.name.replace(" Magics", ""), "Improvement", "DC 10 + " + sub.rank + " rank" + (sub.rank === 1 ? "" : "s")],
      crit: improveCrit(sub.stat),
      dosMod: dosShiftFor((b) => b.type === "improve" && (!b.target || b.target === sub.key)),
      condBonuses: catCond("improve", sub.key),
      detail: "An improvement roll — test your " + sub.stat + " against the field. Succeed and " + sub.name + " deepens by a rank; roll a natural 10 and " + sub.stat + " itself rises instead.",
      fail: "The field resists you — no progress this time.",
      onResult: (r) => {
        if (r.crit && r.crit.kind === "success") { bumpStatByName(sub.stat); toast(sub.stat + " rises to rank " + (fr + 1)); }
        else if (r.pass) { bumpSubjectRank(school.id, sub.key); toast(sub.name + " deepens to rank " + (sub.rank + 1)); }
      },
    }, e.currentTarget as HTMLElement);
  };

  const titleMap: Record<string, string> = { overview: "Overview", classes: "Classes", magic: "Magic", inventory: "Inventory", map: "Map" };
  const plantSum = plants.reduce((s, p) => s + (p.value || 0), 0);

  return (
    <div className="sf-sheet" style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
    <div className="sf-app" data-nav={nav}>
      <Sidebar active={nav} onNavigate={onNavigate} roster={ROSTER} activeChar={activeChar} onPickChar={pickChar} compCount={D.compendium.length} onEditCharacter={openForgeEdit} collapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <main className="sf-main">
        <TopBar title={titleMap[nav] || "Overview"} eyebrow={c.name + " · " + c.house} c={{ ...c, resolve: Math.max(0, 5 - conditions.reduce((s, cd) => s + cd.value, 0)), resolveMax: 5 }} onStep={stepVital} onRollAction={onRollAction} onToggleMobileMenu={() => setMobileMenuOpen((v) => !v)} hideVitals={nav === "map"} time={campaignId ? gmTime : undefined} searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} searchResults={searchResults} onSearchSelect={handleSearchSelect} onSearchRoll={handleSearchRoll} onSearchRepair={handleSearchRepair} onSearchUse={handleSearchUse} searchMenuOpen={searchMenuOpen} onSearchMenuOpen={() => setSearchMenuOpen(true)} onSearchMenuClose={() => setSearchMenuOpen(false)} onSearchMobileOpen={() => setSearchMenuOpen(true)} />

        {nav === "overview" && (
          <div className="sf-canvas">
            <IdentityHero c={c} onEdit={openForgeEdit} />
            <div className="sf-sec-head"><h2>Conditions</h2><hr className="sf-rule" /></div>
            <ConditionsRail conditions={conditions} onStep={stepCond} onRoll={onRollResist} />
            <div className="sf-grid">
              <div className="sf-col">
                <div className="sf-sec-head sf-sec-head--actions">
                  <h2>Stats</h2><hr className="sf-rule" />
                  <span className="sf-sec-head__count">6 stats · 24 skills</span>
                  <div className="sf-sec-actions">
                    <button className="sf-ghost-btn" onClick={toggleAllStats}>
                      <Icon name={allStatsCollapsed ? "chevrons-down" : "chevrons-up"} />
                      {allStatsCollapsed ? "Expand" : "Collapse"}
                    </button>
                  </div>
                </div>
                <div className="sf-stats">
                  {stats.map((f) => <StatCard key={f.id} fac={f} collapsed={collapsedStats.has(f.id)} onToggleCollapse={() => toggleStatCollapsed(f.id)} bonusFor={bonusFor} statBonusFor={statBonusFor} onRoll={onRollSkill} onImprove={onImproveSkill} />)}
                </div>
              </div>
              <div className="sf-col">
                <MovesRail moves={moves} onRoll={onRollMove} modFor={moveMod} onAddManually={() => setManualMoveOpen(true)} />
                <BonusLedger bonuses={bonuses} resolveValue={resolveVal} onToggle={toggleBonus} onToggleConditional={toggleBonusConditional} onCondNote={setBonusCondNote} onAdd={openAddBonus} onEdit={openEditBonus} />
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
                  <Icon name={allSchoolsCollapsed ? "chevrons-down" : "chevrons-up"} />
                  {allSchoolsCollapsed ? "Expand" : "Collapse"}
                </button>
              </div>
            </div>
            <div className="sf-schools">
              {schools.map((s) => <SchoolCard key={s.id} school={s} collapsed={collapsedSchools.has(s.id)} onToggleCollapse={() => toggleSchoolCollapsed(s.id)} facByName={facByName} subjectBonusFor={subjectBonusFor} statBonusFor={statBonusFor} onRoll={onRollSubject} onImprove={onImproveSubject} />)}
            </div>
            <SpellSection
              spells={spells} spellMod={spellMod} schoolToneOf={schoolToneOf} subjectModFor={subjectModFor}
              onRoll={onRollSpell} onRemove={removeSpell} onLearn={onLearnSpell}
              onSetDays={(s, d) => setSpellDays(s.id, d)}
              onAddManually={() => { setEditSpell(null); setManualOpen(true); }}
              onEdit={(spell) => { setEditSpell(spell); setManualOpen(true); }}
              onBrowseCompendium={() => openCompendiumTo("spell")}
            />
          </div>
        )}

        {nav === "classes" && (
          <ClassesPage data={CL} state={classState} rp={rp} density={t.ladderDensity as string}
            onGrantRp={grantRp} onChoose={chooseOpt} onRankUp={rankUp} onRefund={refundRank} />
        )}

        {nav === "inventory" && (
          <InventoryPage
            materials={c.materials} caps={caps}
            artifacts={artifacts} potions={potions} recipes={recipes} plants={plants} wands={wands} glyphs={glyphs} items={items}
            runeStack={runeStack} h={invH} />
        )}

        {nav === "map" && (
          <MapPage roster={ROSTER} activeChar={activeChar} locations={locations} onSetLocation={setLocation} focusLocation={mapFocus} />
        )}
      </main>

      <Compendium open={drawer} onClose={closeDrawer} data={{ compendiumCats: SEED.compendiumCats, compendium: D.compendium }} addedIds={added} onAdd={onAdd} onAddAttuned={onAddAttuned} onAddLearning={onAddLearning} onAddPotionSheaf={onAddPotionSheaf} onAddPotionRecipe={onAddPotionRecipe} onAddWandCraft={onAddWandCraft} potionSheafCount={heldCount} potionCap={INV.potionCap} potionRecipes={recipes} lastAdded={lastAdded} cat={compCat} setCat={setCompCat} width={t.archiveWidth as number} attuneFull={attunedCount >= caps.attuneCap} cultivationCap={caps.plantCap} plantSum={plantSum} />
      <ManualMove open={manualMoveOpen} onClose={() => setManualMoveOpen(false)} onSave={addMove} schools={SEED.magicSchools} stats={stats} classesList={CL.classes.map((cl) => ({ id: cl.id, name: cl.name, rank: classRank(cl.id) }))} />
      <ManualSpell open={manualOpen} onClose={() => { setManualOpen(false); setEditSpell(null); }} onSave={(sp) => { if (editSpell) updateSpell(sp); else addSpell(sp); }} schools={SEED.magicSchools} editSpell={editSpell} />
      <ManualModal open={!!manualKind} kind={manualKind} subjects={allSubjects} skills={stats.flatMap((st) => st.skills)} stats={stats} schools={schools} compendiumSpells={D.compendium.filter((e) => e.cat === "spell")} attuneFull={attunedCount >= caps.attuneCap} sheafFull={heldCount >= caps.potionCap} editSubject={manualKind === "recipe" ? editRecipe : manualKind === "artifact" ? editArtifact : manualKind === "wand" ? editWand : manualKind === "plant" ? editPlant : manualKind === "glyph" ? editGlyph : null} cultivationCap={caps.plantCap} cultivationUsed={plantSum} onSave={saveManual} onClose={() => { setManualKind(null); setEditRecipe(null); setEditArtifact(null); setEditWand(null); setEditPlant(null); setEditGlyph(null); }} />
      <GiveModal open={!!givePayload} payload={givePayload as GivePayload | null} roster={ROSTER} activeChar={activeChar} onConfirm={onGiveConfirm} onClose={() => setGivePayload(null)} />
      <ChoosePlantModal open={!!choosePlant} plant={choosePlant ? choosePlant.pl : null} onRoll={() => { const ctx = choosePlant; setChoosePlant(null); if (ctx) invH.rollPlant(ctx.pl, ctx.anchor); }} onJustUse={() => { const ctx = choosePlant; setChoosePlant(null); if (ctx) invH.markPlantUsed(ctx.pl); }} onClose={() => setChoosePlant(null)} />
      {admission.open && admission.draft ? <Admission mode={admission.mode} initial={admission.draft} data={forgeData} classData={CL} onCommit={commitForge} onClose={closeForge} /> : null}
      <BonusEditor open={bonusEdit.open} bonus={bonusEdit.bonus} mode={bonusEdit.mode} ctx={{ stats, schools, moves, spells, conditions }} classes={bonusClasses} onSave={saveBonus} onDelete={removeBonus} onClose={closeBonusEdit} />
      <div className={"sf-inv-toast" + (invToast ? " show" : "")} role="status">
        {invToast && <span><Icon name="check-circle" /> {invToast}</span>}
      </div>

      <RollToasts log={log} position={t.toastPosition as string} cap={t.stackCap as number} lifetime={Math.round((t.toastLifetime as number) * 1000)} graceMs={Math.round((t.graceTail as number) * 1000)} expandDefault={t.expandDefault as boolean} />
      <RollDock log={log} open={dock} onToggle={() => setDock((v) => !v)} meId={activeChar} />
      <RollPrompt pending={pending} onConfirm={confirmPrompt} onCancel={cancelPrompt} />
      <BackfireResist open={!!resistRoll} roll={resistRoll} conditions={conditions} facRank={facRank} onResist={handleResist} onClose={handleResistClose} />
      <ArtifactBackfireModal open={!!artifactResistRoll} roll={artifactResistRoll} effFacRank={effFacRank} subRank={subRank} onRoll={onArtifactResist} onClose={closeArtifactResist} />
    </div>
    </div>
  );

  /* ---- Search selection handlers (declared after render-scope closures) -- */
  function handleSearchSelect(result: SearchResult) {
    setSearchMenuOpen(false);
    setSearchQuery("");
    if (result.section) setNav(result.section);
    if (result.type === "location") setMapFocus({ type: "sf-map-focus" });
  }
  function handleSearchRepair(result: SearchResult) { invH.repairArtifact(result.data as Artifact, "medium", document.body); }
  function handleSearchUse(result: SearchResult) {
    if (result.type === "plant") invH.usePlant(result.data as Plant, document.body);
    else if (result.type === "item") invH.useItem(result.data as Item, document.body);
    setSearchMenuOpen(false);
    setSearchQuery("");
  }
  function handleSearchRoll(result: SearchResult) {
    const type = result.type;
    const data = result.data as { name?: string; id?: string; stat?: { id?: string; name?: string }; skill?: RollSkill; subject?: RollSubject; rank?: number; key?: string };
    const body = document.body;
    if (type === "stat") { const fac = stats.find((f) => f.name === data.name); if (fac) onRollSkill(fac, { name: fac.name, rank: 0 }, fac.rank + statBonusFor(fac.name), { currentTarget: body }); }
    else if (type === "skill") { const fac = stats.find((f) => f.id === data.stat?.id || f.name === data.stat?.name); if (fac) onRollSkill(fac, (data.skill || data) as RollSkill, (fac.rank + statBonusFor(fac.name)) + (data.skill?.rank ?? data.rank ?? 0), { currentTarget: body }); }
    else if (type === "subject") { const sub = (data.subject || data) as RollSubject; const school = schools.find((s) => s.subjects?.some((x) => x.key === sub.key)); if (school) { const total = effFacRank(sub.stat) + sub.rank + subjectBonusFor(sub.key); onRollSubject(school, sub, total, { currentTarget: body }); } }
    else if (type === "spell") onRollSpell(data as unknown as Spell, { currentTarget: body });
    else if (type === "move") onRollMove(data as unknown as Move, { currentTarget: body });
    else if (type === "artifact") invH.attune(data as unknown as Artifact, body);
    else if (type === "wand") { const liveWand = wands.find((w) => w.id === data.id) || (data as unknown as Wand); invH.repairWand(liveWand, body); }
    else if (type === "potion") invH.takePotion(data as unknown as Potion, body);
    else if (type === "recipe") invH.brew(data as unknown as Recipe, body);
    else if (type === "plant") invH.rollPlant(data as unknown as Plant, body);
    else if (type === "item") invH.useItem(data as unknown as Item, body);
    else if (type === "resist") onRollResist(data as unknown as Condition, { currentTarget: body });
    setSearchMenuOpen(false);
    setSearchQuery("");
  }
}
