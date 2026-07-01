"use client";

/* ===========================================================================
   Starfall Academy — GM dashboard root (native React 19)
   ---------------------------------------------------------------------------
   Ported from public/character-sheet/gm.jsx. The Faculty View: party board,
   NPCs, notes, action scene, plus Force-Resist / Grant / Time. Wired to the
   SAME shared roll systems as the player sheet (useRollState + useRollSync),
   so rolls flow through one ledger. The iframe + postMessage bridge are gone.
   =========================================================================== */
import * as React from "react";

import "@/ds/ds.css";
import "./styles/app.css";
import "./styles/rolls.css";
import "./styles/gm.css";

import { SEED } from "./data/seed";
import { GM_SEED, type GmCondDef, type GmNote, type GmNpc, type GmPartyMember, type GmTime } from "./data/gm-seed";
import { useRollState, type RollRosterMember } from "./state/useRollState";
import { useRollSync } from "./integration/useRollSync";

import { Sidebar } from "./components/parts/Sidebar";
import { RollDock } from "./components/rolls/RollDock";
import { RollToasts } from "./components/rolls/RollToasts";
import { Icon } from "./components/Icon";
import type { GMPartyMember } from "@/app/(app)/characters/roster";
import type { Roll, Tone } from "./types";

const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const TONE3: Record<string, string> = { plum: "var(--plum-300)", forest: "var(--forest-300)", teal: "var(--teal-300)", crimson: "var(--crimson-300)", gold: "var(--gold-300)", silver: "var(--text-strong)" };
const LEVELCOLOR: Record<string, string> = { Basic: "var(--forest-300)", Standard: "var(--teal-300)", Advanced: "var(--plum-300)", Legendary: "var(--gold-300)", Twisted: "var(--crimson-300)", HEX: "var(--crimson-300)" };
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const BLOCKS = [
  { label: "Morning", icon: "sunrise" },
  { label: "Afternoon", icon: "sun" },
  { label: "Evening", icon: "sunset" },
  { label: "Night", icon: "moon" },
];
const NPC_ICONS = ["user-round", "skull", "cat", "scroll", "crown", "shield", "wand-2", "flask-conical", "eye", "ghost", "book-open", "key-round", "anchor", "feather", "flame", "snowflake", "zap", "star", "moon", "compass", "gem", "bird", "fish", "tree-pine", "mountain", "waves", "bug", "sword"];
const GRANT_CATS = [
  { id: "materials", icon: "circle-star", label: "Materials" },
  { id: "artifact", icon: "gem", label: "Artifacts" },
  { id: "potion", icon: "flask-conical", label: "Potions" },
  { id: "plant", icon: "leaf", label: "Plants" },
  { id: "wand", icon: "wand-2", label: "Wands" },
  { id: "glyph", icon: "pen-tool", label: "Glyphs" },
  { id: "item", icon: "package", label: "Items" },
];

const initialsFor = (name: string) => (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/* ----------------------------- small visuals ----------------------------- */
function Stars({ value, max }: { value: number; max: number }) {
  return (
    <span className="sf-stars">
      {Array.from({ length: max }).map((_, i) => <Icon key={i} name="star" className={i < value ? "on" : ""} />)}
    </span>
  );
}
function Pips({ value, max, color, stacked }: { value: number; max: number; color: string; stacked?: boolean }) {
  const dot = (idx: number) => (
    <span key={idx} className="gm-pip" style={{ background: idx < value ? color : "transparent", borderColor: idx < value ? color : "var(--ink-600)", boxShadow: idx < value ? "0 0 7px " + color : "none" }} />
  );
  if (!stacked) return <span className="gm-pips">{Array.from({ length: max }).map((_, i) => dot(i))}</span>;
  const rows: React.ReactNode[] = [];
  for (let i = 0; i < max; i += 5) {
    const count = Math.min(5, max - i);
    rows.push(<span key={i} className="gm-pips">{Array.from({ length: count }).map((_, j) => dot(i + j))}</span>);
  }
  return <span className="gm-pips-stack">{rows}</span>;
}
function Avatar({ name, initials, tone, size }: { name?: string; initials?: string; tone?: string; size?: number }) {
  return <span className={"sf-avatar t-" + (tone || "plum")} style={size ? { width: size, height: size } : undefined}>{initials || initialsFor(name || "?")}</span>;
}

type Campaign = { id: string; name: string | null; code: string | null };

interface ResistState { pcId: string; cond: string; dc: number; dcText: string | null; rolled: number | null }
interface GrantState { pcId: string; cat: string; matAmt: number; matText: string | null; q: string; openId: string | null }
interface AddNpcState { editId: string | null; name: string; title: string; resolve: number; strong: number; weak: number; icon: string; confirmDelete: boolean }
interface ActionState { active: boolean; included: string[]; selected: string[]; ap: Record<string, number>; changeApId: string | null }

export interface GmViewProps {
  campaign: Campaign;
  party: GMPartyMember[];
}

export function GmView({ campaign, party: hostParty }: GmViewProps) {
  const [tab, setTab] = React.useState("party");
  const [party, setParty] = React.useState<GmPartyMember[]>(() => {
    const src: GmPartyMember[] = hostParty && hostParty.length ? (hostParty as unknown as GmPartyMember[]) : GM_SEED.party;
    return src.map((p) => ({ ...p, conds: { fear: 0, despair: 0, wound: 0, loss: 0, doubt: 0, ...(p.conds || {}) } }));
  });
  const [npcs, setNpcs] = React.useState<GmNpc[]>(() => GM_SEED.npcsBasic.map((n) => ({ ...n, conds: { ...n.conds } })));
  const [notes, setNotes] = React.useState<GmNote[]>(() => GM_SEED.notes.map((n) => ({ ...n })));
  const [activeNoteId, setActiveNoteId] = React.useState<string | null>(GM_SEED.notes[0] ? GM_SEED.notes[0].id : null);
  const [tagFilter, setTagFilter] = React.useState("");
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = React.useState<string | null>(null);

  const [resist, setResist] = React.useState<ResistState | null>(null);
  const [grant, setGrant] = React.useState<GrantState | null>(null);
  const [addNpc, setAddNpc] = React.useState<AddNpcState | null>(null);
  const [time, setTime] = React.useState<GmTime>(() => ({ ...GM_SEED.time }));
  const [timeModal, setTimeModal] = React.useState(false);
  const [action, setAction] = React.useState<ActionState>({ active: false, included: [], selected: [], ap: {}, changeApId: null });

  const [collapsed, setCollapsed] = React.useState(() => { try { return localStorage.getItem("sf-sidebar-collapsed") === "true"; } catch { return false; } });
  const [mobileOpen, setMobileOpen] = React.useState(false);
  React.useLayoutEffect(() => {
    try { localStorage.setItem("sf-sidebar-collapsed", String(collapsed)); } catch { /* ignore */ }
    const app = document.querySelector(".sf-app");
    if (app) app.classList.toggle("sidebar-collapsed", collapsed);
  }, [collapsed]);

  // ---- Shared roll engine (single source with the player sheet) ----------
  const engineD = React.useMemo(() => ({
    roster: party.map((p) => ({ id: p.id, name: p.name, initials: p.initials, tone: p.tone as Tone })).concat([{ id: "__gm__", name: "Game Master", initials: "GM", tone: "gold" as Tone }]) as RollRosterMember[],
    ledgerSeed: GM_SEED.ledgerSeed,
    partyPool: [],
    gmPool: [],
    gmInflection: { actor: "Game Master", label: "", kind: "roll", stat: "", mod: 0 },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const shareRef = React.useRef<(r: Roll) => void>(() => {});
  const roll = useRollState(engineD, "__gm__", { multiplayer: true, onShareRoll: (r) => shareRef.current(r) });
  const { log, dock } = roll.state;
  const { pushRoll, setDock, injectRemote } = roll.handlers;

  const rollSync = useRollSync({ campaignId: campaign.id, characterId: null, onRemoteRoll: injectRemote });
  React.useEffect(() => { shareRef.current = rollSync.shareRoll; }, [rollSync.shareRoll]);

  // Action scene: read incoming Action Rolls into the AP tracker.
  const appliedActionRolls = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!action.active) return;
    let next: Record<string, number> | null = null;
    for (const r of log) {
      if (r.kind !== "action" || appliedActionRolls.current.has(r.id)) continue;
      appliedActionRolls.current.add(r.id);
      if (!r.who || !r.who.id || !action.included.includes(r.who.id)) continue;
      const pc = party.find((p) => p.id === r.who!.id);
      const apVal = r.pass ? clampN(r.degrees || 1, 0, pc ? pc.apMax : 6) : 0;
      (next || (next = {}))[r.who.id] = apVal;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (next) setAction((s) => ({ ...s, ap: { ...s.ap, ...next } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log, action.active, action.included]);

  // ---- Status toast ------------------------------------------------------
  const [status, setStatus] = React.useState<string | null>(null);
  const statusTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = (msg: string) => { setStatus(msg); clearTimeout(statusTimer.current); statusTimer.current = setTimeout(() => setStatus(null), 3200); };

  const gmWho = (): Roll["who"] => ({ name: "Game Master", tone: "gold", gm: true });

  // ---- Mutators ----------------------------------------------------------
  const bumpCondNpc = (npcId: string, condId: string, d: number) => setNpcs((s) => s.map((n) => n.id !== npcId ? n : { ...n, conds: { ...n.conds, [condId]: clampN((n.conds[condId] || 0) + d, 0, 3) } }));
  const addMaterials = (pcId: string, n: number) => setParty((s) => s.map((p) => p.id !== pcId ? p : { ...p, materials: Math.max(0, p.materials + n) }));

  /* ----------------------------- Force resist --------------------------- */
  const openResist = (pcId: string) => setResist({ pcId, cond: "fear", dc: 12, dcText: null, rolled: null });
  const patchResist = (patch: Partial<ResistState>) => setResist((r) => r ? { ...r, ...patch } : r);
  const promptResist = () => {
    const r = resist; if (!r) return;
    const pc = party.find((p) => p.id === r.pcId); if (!pc) return;
    const cond = GM_SEED.CONDS.find((cd) => cd.id === r.cond);
    if (!cond) return;
    rollSync.requestRoll({ kind: "resist", target: pc.sheetId, condition: cond.id, dc: r.dc });
    toast("Asked " + pc.name + " to resist " + cond.name + " (DC " + r.dc + ").");
    setResist(null);
  };

  /* ------------------------------- Grant -------------------------------- */
  const openGrant = (pcId: string) => setGrant({ pcId, cat: "materials", matAmt: 50, matText: null, q: "", openId: null });
  const openGrantAll = () => setGrant({ pcId: "__all__", cat: "materials", matAmt: 50, matText: null, q: "", openId: null });
  const patchGrant = (patch: Partial<GrantState>) => setGrant((g) => g ? { ...g, ...patch } : g);
  const grantMaterials = () => {
    const g = grant; if (!g) return;
    const n = g.matAmt;
    if (g.pcId === "__all__") { setParty((s) => s.map((p) => ({ ...p, materials: p.materials + n }))); toast("+" + n.toLocaleString() + " Materials granted to all " + party.length + " party members."); }
    else {
      const pc = party.find((p) => p.id === g.pcId); if (!pc) return;
      addMaterials(pc.id, n);
      if (pc.sheetId) rollSync.requestRoll({ kind: "grant", target: pc.sheetId, amount: n });
      toast("+" + n.toLocaleString() + " Materials to " + pc.name + " (" + (pc.materials + n).toLocaleString() + " total).");
    }
  };
  const grantItem = (entry: { name: string }) => {
    const g = grant; if (!g) return;
    const who = g.pcId === "__all__" ? "the whole party" : (party.find((p) => p.id === g.pcId) || { name: "" }).name;
    toast(entry.name + " passed to " + who + ".");
  };

  /* ------------------------------- NPCs --------------------------------- */
  const openAddNpc = () => setAddNpc({ editId: null, name: "", title: "", resolve: 3, strong: 8, weak: 3, icon: "__mono", confirmDelete: false });
  const openEditNpc = (id: string) => { const n = npcs.find((x) => x.id === id); if (!n) return; setAddNpc({ editId: id, name: n.name, title: n.kind || "", resolve: n.maxResolve, strong: n.strong, weak: n.weak, icon: n.icon || "__mono", confirmDelete: false }); };
  const patchAddNpc = (patch: Partial<AddNpcState>) => setAddNpc((a) => a ? { ...a, ...patch } : a);
  const deleteNpc = (id: string) => { setNpcs((s) => s.filter((n) => n.id !== id)); toast("NPC removed from the cast."); };
  const confirmAddNpc = () => {
    const a = addNpc; if (!a || !a.name.trim()) return;
    const name = a.name.trim();
    const icon = a.icon === "__mono" ? null : a.icon;
    if (a.editId) { setNpcs((s) => s.map((n) => n.id !== a.editId ? n : { ...n, name, kind: a.title.trim() || "NPC", icon, maxResolve: a.resolve, strong: a.strong, weak: a.weak })); toast(name + " updated."); }
    else { setNpcs((s) => [...s, { id: "npc_" + Math.random().toString(36).slice(2, 9), name, kind: a.title.trim() || "NPC", icon, maxResolve: a.resolve, strong: a.strong, weak: a.weak, conds: { fear: 0, despair: 0, wound: 0, loss: 0, doubt: 0 } }]); toast(name + " added to the cast."); }
    setAddNpc(null);
  };
  const rollNpc = (n: GmNpc, kind: "strong" | "weak") => {
    const who: Roll["who"] = { name: n.name, initials: initialsFor(n.name), tone: "crimson" };
    const mod = kind === "strong" ? n.strong : n.weak;
    pushRoll({ who, kind: "roll", label: (kind === "strong" ? "Strong" : "Weak") + " roll · " + n.name, stat: "", mod });
  };

  /* ------------------------------- Notes -------------------------------- */
  const createNote = () => {
    const label = new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
    const id = "n_" + Math.random().toString(36).slice(2, 9);
    setNotes((s) => [...s, { id, title: "Journal Entry · " + label, body: "", tags: "" }]);
    setActiveNoteId(id);
  };
  const deleteNote = (id: string) => {
    setNotes((s) => { const filtered = s.filter((n) => n.id !== id); if (activeNoteId === id) setActiveNoteId(filtered[0] ? filtered[0].id : null); return filtered; });
    setConfirmDeleteNoteId(null);
    toast("Page removed from the journal.");
  };
  const patchNote = (id: string, patch: Partial<GmNote>) => setNotes((s) => s.map((n) => n.id === id ? { ...n, ...patch } : n));

  /* ------------------------------- Time --------------------------------- */
  const advanceTime = () => setTime((tm) => {
    if (!tm.enabled) return { ...tm, day: (tm.day + 1) % 7 };
    let b = tm.block + 1, d = tm.day;
    if (b > 3) { b = 0; d = (d + 1) % 7; }
    return { ...tm, block: b, day: d };
  });
  const sleepTime = () => setTime((tm) => ({ ...tm, block: 0, day: (tm.day + 1) % 7 }));

  /* --------------------------- Action scene ----------------------------- */
  const toggleInclude = (pcId: string) => setAction((s) => {
    const base = s.included.length === 0 ? party.map((p) => p.id) : s.included;
    const inc = base.includes(pcId) ? base.filter((id) => id !== pcId) : [...base, pcId];
    return { ...s, included: inc.length === party.length ? [] : inc };
  });
  const toggleSelect = (pcId: string) => setAction((s) => ({ ...s, selected: s.selected.includes(pcId) ? s.selected.filter((id) => id !== pcId) : [...s.selected, pcId] }));
  const beginAction = () => {
    const included = action.included.length > 0 ? action.included : party.map((p) => p.id);
    appliedActionRolls.current = new Set(log.filter((r) => r.kind === "action").map((r) => r.id));
    included.forEach((pcId) => { const pc = party.find((p) => p.id === pcId); if (!pc) return; rollSync.requestRoll({ kind: "action", target: pc.sheetId, dc: 10 }); });
    setAction({ active: true, included, selected: [], ap: {}, changeApId: null });
    toast("Action scene begun · prompted " + included.length + " combatant" + (included.length === 1 ? "" : "s") + " to roll.");
  };
  const endAction = () => { setAction({ active: false, included: [], selected: [], ap: {}, changeApId: null }); toast("Action scene ended."); };
  const apClamp = (id: string, v: number) => { const pc = party.find((p) => p.id === id); return clampN(v, 0, pc ? pc.apMax : 6); };
  const threatMove = () => { setAction((s) => { const ap = { ...s.ap }; s.included.forEach((id) => { ap[id] = apClamp(id, (ap[id] || 0) + 1); }); return { ...s, ap }; }); toast("Threat Move — all combatants +1 AP."); };
  const targetedThreat = () => setAction((s) => {
    const ap = { ...s.ap };
    if (s.selected.length === 0) { s.included.forEach((id) => { ap[id] = apClamp(id, (ap[id] || 0) + 2); }); toast("Targeted Threat — all combatants +2 AP."); }
    else { s.included.forEach((id) => { ap[id] = apClamp(id, (ap[id] || 0) + (s.selected.includes(id) ? 2 : 1)); }); const names = s.selected.map((id) => (party.find((p) => p.id === id) || { name: "" }).name).filter(Boolean).join(", "); toast("Targeted Threat — " + names + " +2 AP, others +1 AP."); }
    return { ...s, ap, selected: [] };
  });
  const opening = (n: number) => setAction((s) => {
    const ap = { ...s.ap };
    const targets = s.selected.length > 0 ? s.selected : s.included;
    targets.forEach((id) => { ap[id] = apClamp(id, (ap[id] || 0) + n); });
    toast("Opening +" + n + " AP → " + (s.selected.length > 0 ? s.selected.length + " selected" : "all") + ".");
    return { ...s, ap, selected: [] };
  });
  const changeAp = (pcId: string, d: number) => setAction((s) => ({ ...s, ap: { ...s.ap, [pcId]: apClamp(pcId, (s.ap[pcId] || 0) + d) }, changeApId: null }));
  const targetPlayer = (pcId: string) => { setAction((s) => { const ap = { ...s.ap }; s.included.forEach((id) => { ap[id] = apClamp(id, (ap[id] || 0) + (id === pcId ? 2 : 1)); }); return { ...s, ap }; }); const pc = party.find((p) => p.id === pcId); toast((pc ? pc.name : "Target") + " targeted — +2 AP, others +1 AP."); };

  /* --------------------------- GM quick roll ---------------------------- */
  const quickRoll = () => { const made = pushRoll({ who: gmWho(), kind: "roll", label: "Quick roll · 2d10", stat: "", mod: 0 }); toast("Rolled 2d10 = " + made.total + "."); };

  const campaignName = campaign.name || GM_SEED.campaign.name;

  const TAB_META: Record<string, { title: string }> = { party: { title: "Party Board" }, npcs: { title: "NPCs" }, notes: { title: "Campaign Journal" }, action: { title: "Action Scene" } };
  const sidebarGm = {
    brandSub: "Faculty View", tableLabel: "The Table", partyLabel: "The Party",
    tabs: [
      { id: "party", label: "Party", icon: "users", count: party.length, active: tab === "party", onClick: () => setTab("party") },
      { id: "npcs", label: "NPCs", icon: "venetian-mask", count: npcs.length, active: tab === "npcs", onClick: () => setTab("npcs") },
      { id: "notes", label: "Notes", icon: "scroll-text", count: notes.length, active: tab === "notes", onClick: () => setTab("notes") },
      { id: "action", label: "Action", icon: "swords", count: "", active: tab === "action", onClick: () => setTab("action") },
    ],
    party: party.map((p) => ({ id: p.id, name: p.name, initials: p.initials, tone: String(p.tone), house: p.house.replace(" House", ""), onOpen: () => { if (p.sheetId) window.open("/gm/" + campaign.id, "_self"); else toast("No sheet linked for " + p.name + "."); } })),
  };

  return (
    <div className="sf-sheet" style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
    <div className={"sf-app sf-app--gm" + (collapsed ? " sidebar-collapsed" : "")} data-tab={tab}>
      <Sidebar gm={sidebarGm} onNavigate={() => {}} roster={[]} activeChar="" onPickChar={() => {}} compCount={0} onAddCharacter={() => {}} onEditCharacter={() => {}} collapsed={collapsed} onToggleSidebar={() => setCollapsed((v) => !v)} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <main className="sf-main">
        <header className="sf-top gm-top">
          <button className="sf-hamburger" onClick={() => setMobileOpen((v) => !v)} aria-label="Open navigation"><Icon name="menu" /></button>
          <div className="sf-top__titles">
            <span className="sf-eyebrow gm-top__campaign">{campaignName}</span>
            <h1 className="sf-top__h1">{TAB_META[tab].title}</h1>
          </div>
          <div className="sf-top__spacer" />
          <button className="gm-timebtn" onClick={() => setTimeModal(true)}>
            <Icon name={time.enabled ? BLOCKS[time.block].icon : "calendar"} />
            <span className="gm-timebtn__txt">
              <span className="gm-timebtn__eyebrow">{time.enabled ? "Day · Time" : "Day"}</span>
              <span className="gm-timebtn__val">{time.enabled ? DAYS[time.day] + " " + BLOCKS[time.block].label : DAYS[time.day]}</span>
            </span>
          </button>
          <button className="gm-rollbtn" onClick={quickRoll} title="GM Roll"><Icon name="dices" /></button>
        </header>

        <div className="sf-canvas gm-canvas">
          {tab === "party" && <PartyTab party={party} onResist={openResist} onGrant={openGrant} onGrantAll={openGrantAll} />}
          {tab === "npcs" && <NpcsTab npcs={npcs} conds={GM_SEED.CONDS} onAdd={openAddNpc} onEdit={openEditNpc} onRoll={rollNpc} onBumpCond={bumpCondNpc} />}
          {tab === "notes" && <NotesTab notes={notes} activeId={activeNoteId} setActiveId={setActiveNoteId} tagFilter={tagFilter} setTagFilter={setTagFilter} onCreate={createNote} onPatch={patchNote} confirmId={confirmDeleteNoteId} setConfirmId={setConfirmDeleteNoteId} onDelete={deleteNote} />}
          {tab === "action" && <ActionTab party={party} action={action} onToggleInclude={toggleInclude} onToggleSelect={toggleSelect} onBegin={beginAction} onEnd={endAction} onThreat={threatMove} onTargeted={targetedThreat} onOpening={opening} onChangeAp={changeAp} onTarget={targetPlayer} setChangeApId={(id) => setAction((s) => ({ ...s, changeApId: s.changeApId === id ? null : id }))} />}
        </div>
      </main>

      <RollDock log={log} open={dock} onToggle={() => setDock((v) => !v)} meId="__gm__" />
      <RollToasts log={log} position="br" cap={3} lifetime={5000} graceMs={1500} expandDefault={false} />

      {resist && <ResistModal resist={resist} party={party} conds={GM_SEED.CONDS} onPatch={patchResist} onRoll={promptResist} onClose={() => setResist(null)} />}
      {grant && <GrantDrawer grant={grant} party={party} matChips={GM_SEED.matChips} matStep={GM_SEED.matStep} onPatch={patchGrant} onGrantMaterials={grantMaterials} onGrantItem={grantItem} onClose={() => setGrant(null)} />}
      {addNpc && <AddNpcModal addNpc={addNpc} onPatch={patchAddNpc} onConfirm={confirmAddNpc} onDelete={(id) => { deleteNpc(id); setAddNpc(null); }} onClose={() => setAddNpc(null)} />}
      {timeModal && <TimeModal time={time} setTime={setTime} onAdvance={advanceTime} onSleep={sleepTime} onClose={() => setTimeModal(false)} />}

      <div className={"sf-inv-toast" + (status ? " show" : "")} role="status">
        {status && <span><Icon name="check-circle" /> {status}</span>}
      </div>
    </div>
    </div>
  );
}

/* ============================== PARTY TAB ================================= */
function PartyTab({ party, onResist, onGrant, onGrantAll }: { party: GmPartyMember[]; onResist: (id: string) => void; onGrant: (id: string) => void; onGrantAll: () => void }) {
  return (
    <div>
      <div className="gm-sec-head">
        <h2>The Party</h2>
        <span className="gm-sec-sub">Your players, at a glance. Force Resists, give materials, and grant items from here.</span>
      </div>
      <div className="gm-party-grid">
        {party.map((pc) => (
          <article key={pc.id} className="gm-card gm-pc">
            <span className="gm-card__accent" style={{ background: TONE3[pc.tone] }} />
            <div className="gm-pc__head">
              <Avatar name={pc.name} initials={pc.initials} tone={String(pc.tone)} size={34} />
              <div className="gm-pc__id">
                <span className="gm-pc__name">{pc.name}</span>
                <span className="gm-pc__class">{pc.className}</span>
              </div>
              <span className="gm-house" style={{ color: TONE3[pc.tone], background: "color-mix(in oklab," + TONE3[pc.tone] + " 16%,transparent)", borderColor: "color-mix(in oklab," + TONE3[pc.tone] + " 34%,transparent)" }}>
                <span className="gm-house__dot" style={{ background: TONE3[pc.tone] }} />{pc.house.replace(" House", "")}
              </span>
            </div>
            <div className="gm-pc__stats">
              <div className="gm-stat">
                <span className="gm-stat__label">Resolve</span>
                <Stars value={pc.resolve} max={5} />
              </div>
              <div className="gm-stat__div" />
              <div className="gm-stat">
                <span className="gm-stat__label">Materials</span>
                <span className="gm-mat"><Icon name="circle-star" /> {pc.materials.toLocaleString()}</span>
              </div>
            </div>
            <div className="gm-pc__btns">
              <button className="gm-btn" onClick={() => onResist(pc.id)}><Icon name="shield-alert" style={{ color: "var(--crimson-300)" }} />Resist</button>
              <button className="gm-btn" onClick={() => onGrant(pc.id)}><Icon name="gift" style={{ color: "var(--gold-300)" }} />Grant</button>
            </div>
          </article>
        ))}
      </div>
      <div className="gm-grantall">
        <div className="gm-grantall__txt">
          <span className="gm-grantall__title">Grant materials to the whole party</span>
          <span className="gm-grantall__sub">Each member receives the same amount</span>
        </div>
        <button className="gm-btn-gold" onClick={onGrantAll}><Icon name="circle-star" />Grant to All</button>
      </div>
    </div>
  );
}

/* =============================== NPCS TAB ================================ */
function NpcsTab({ npcs, conds, onAdd, onEdit, onRoll, onBumpCond }: { npcs: GmNpc[]; conds: GmCondDef[]; onAdd: () => void; onEdit: (id: string) => void; onRoll: (n: GmNpc, kind: "strong" | "weak") => void; onBumpCond: (npcId: string, condId: string, d: number) => void }) {
  return (
    <div>
      <div className="gm-sec-head">
        <h2>NPCs</h2>
        <span className="gm-sec-sub">A basic NPC uses their Strong roll for any check they’re good at and their Weak roll for any check they aren’t. Full NPCs are stored in their own sheets.</span>
        <button className="gm-btn gm-sec-head__action" onClick={onAdd}><Icon name="plus" style={{ color: "var(--gold-300)" }} />Add NPC</button>
      </div>
      <div className="gm-npc-grid">
        {npcs.map((n) => {
          const condSum = Object.values(n.conds).reduce((a, b) => a + b, 0);
          const cur = Math.max(0, n.maxResolve - condSum);
          const downed = cur === 0;
          return (
            <article key={n.id} className="gm-card gm-npc">
              <div className="gm-npc__head" onClick={() => onEdit(n.id)}>
                <span className={"gm-npc__icon" + (downed ? " is-downed" : "")}>
                  {n.icon ? <Icon name={n.icon} /> : <span className="gm-npc__mono">{initialsFor(n.name)}</span>}
                  {downed && <span className="gm-npc__x"><Icon name="x" /></span>}
                </span>
                <div className="gm-npc__id">
                  <span className="gm-npc__name">{n.name}</span>
                  <span className="gm-npc__kind">{n.kind}</span>
                </div>
                <div className="gm-npc__res">
                  <span className="gm-stat__label">Resolve</span>
                  <Pips value={cur} max={n.maxResolve} color="var(--gold-300)" stacked />
                </div>
              </div>
              <div className="gm-npc__conds">
                {conds.map((c) => (
                  <div key={c.id} className="gm-cond">
                    <span className="gm-cond__name" style={{ color: c.color }}>{c.name}</span>
                    <Pips value={n.conds[c.id]} max={3} color={c.color} />
                    <div className="gm-cond__btns">
                      <button className="gm-step" onClick={() => onBumpCond(n.id, c.id, -1)}>−</button>
                      <button className="gm-step" disabled={cur <= 0} onClick={() => { if (cur > 0) onBumpCond(n.id, c.id, 1); }}>+</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="gm-npc__rolls">
                <button className="gm-roll-strong" onClick={() => onRoll(n, "strong")}><Icon name="trending-up" />Strong <span className="gm-roll-num">+{n.strong}</span></button>
                <button className="gm-roll-weak" onClick={() => onRoll(n, "weak")}><Icon name="trending-down" />Weak <span className="gm-roll-num">+{n.weak}</span></button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* =============================== NOTES TAB =============================== */
function NotesTab({ notes, activeId, setActiveId, tagFilter, setTagFilter, onCreate, onPatch, confirmId, setConfirmId, onDelete }: {
  notes: GmNote[]; activeId: string | null; setActiveId: (id: string) => void; tagFilter: string; setTagFilter: (s: string) => void;
  onCreate: () => void; onPatch: (id: string, patch: Partial<GmNote>) => void; confirmId: string | null; setConfirmId: (id: string | null) => void; onDelete: (id: string) => void;
}) {
  const active = notes.find((n) => n.id === activeId) || notes[0] || null;
  const tf = (tagFilter || "").trim().toLowerCase();
  const filtered = tf ? notes.filter((n) => (n.tags || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).some((s) => s.includes(tf))) : notes;
  return (
    <div className="gm-notes">
      <div className="gm-notes__list">
        <button className="gm-notes__new" onClick={onCreate}><Icon name="feather" style={{ color: "var(--gold-300)" }} />New page</button>
        <div className="gm-notes__filter">
          <Icon name="search" />
          <input value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} placeholder="Filter by tag…" />
        </div>
        <div className="gm-notes__items">
          {filtered.map((n) => {
            const tags = (n.tags || "").split(",").map((s) => s.trim()).filter(Boolean);
            const confirming = confirmId === n.id;
            return (
              <div key={n.id} className={"gm-noteitem" + (n.id === activeId ? " is-active" : "")}>
                {!confirming ? (
                  <div className="gm-noteitem__row">
                    <button className="gm-noteitem__sel" onClick={() => { setActiveId(n.id); setConfirmId(null); }}>
                      <span className="gm-noteitem__title">{n.title}</span>
                      {tags.length > 0 && <span className="gm-noteitem__tags">{tags.map((s, i) => <span key={i} className="gm-tag">{s}</span>)}</span>}
                    </button>
                    <button className="gm-noteitem__del" title="Delete page" onClick={(e) => { e.stopPropagation(); setConfirmId(n.id); }}><Icon name="trash-2" /></button>
                  </div>
                ) : (
                  <div className="gm-noteitem__confirm">
                    <span>Delete this page?</span>
                    <div className="gm-noteitem__confirmbtns">
                      <button className="gm-btn-sm" onClick={() => setConfirmId(null)}>Keep</button>
                      <button className="gm-btn-sm gm-btn-danger" onClick={() => onDelete(n.id)}><Icon name="trash-2" />Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="gm-notes__editor">
        {active ? (
          <React.Fragment>
            <div className="gm-notes__titlebar">
              <Icon name="scroll-text" />
              <input value={active.title} onChange={(e) => onPatch(active.id, { title: e.target.value })} />
            </div>
            <div className="gm-notes__tagbar">
              <Icon name="tag" />
              <input value={active.tags || ""} onChange={(e) => onPatch(active.id, { tags: e.target.value })} placeholder="tags, comma separated" />
            </div>
            <textarea className="gm-notes__body" value={active.body} onChange={(e) => onPatch(active.id, { body: e.target.value })} placeholder="Write your entry here..." />
          </React.Fragment>
        ) : (
          <div className="gm-notes__empty"><Icon name="scroll-text" /><span>No pages in the journal yet.</span></div>
        )}
      </div>
    </div>
  );
}

/* ============================== ACTION TAB ============================== */
function ActionTab({ party, action, onToggleInclude, onToggleSelect, onBegin, onEnd, onThreat, onTargeted, onOpening, onChangeAp, onTarget, setChangeApId }: {
  party: GmPartyMember[]; action: ActionState; onToggleInclude: (id: string) => void; onToggleSelect: (id: string) => void; onBegin: () => void; onEnd: () => void;
  onThreat: () => void; onTargeted: () => void; onOpening: (n: number) => void; onChangeAp: (id: string, d: number) => void; onTarget: (id: string) => void; setChangeApId: (id: string) => void;
}) {
  const apColor = (ap: number) => ap <= 1 ? "var(--crimson-300)" : ap <= 3 ? "var(--forest-300)" : ap <= 5 ? "var(--teal-300)" : "var(--plum-300)";
  if (!action.active) {
    const includedCount = action.included.length === 0 ? party.length : action.included.length;
    return (
      <div className="gm-action">
        <div className="gm-action__idlehead">
          <div>
            <span className="sf-eyebrow">Action Scene</span>
            <h2 className="gm-action__h2">No Scene Active</h2>
            <p className="gm-action__lead">Select combatants below, then begin. All party members are included by default.</p>
          </div>
          <span className="gm-pill gm-pill--idle">Idle</span>
        </div>
        <div className="gm-action__pickgrid">
          {party.map((p) => {
            const inc = action.included.length === 0 || action.included.includes(p.id);
            return (
              <article key={p.id} className={"gm-pick" + (inc ? " is-on" : "")} onClick={() => onToggleInclude(p.id)}>
                <span className="gm-card__accent" style={{ background: TONE3[p.tone] }} />
                <Avatar name={p.name} initials={p.initials} tone={String(p.tone)} size={30} />
                <div className="gm-pick__id">
                  <span className="gm-pick__name">{p.name}</span>
                  <Stars value={p.resolve} max={5} />
                </div>
                <span className={"gm-check" + (inc ? " is-on" : "")}>{inc && <Icon name="check" />}</span>
              </article>
            );
          })}
        </div>
        <div className="gm-action__begin">
          <span className="gm-action__count">{action.included.length === 0 ? "All " + party.length + " party members will be included" : includedCount + " of " + party.length + " party members included"}</span>
          <button className="gm-btn-gold gm-btn-lg" onClick={onBegin}><Icon name="swords" />Begin Action</button>
        </div>
      </div>
    );
  }
  const nSel = action.selected.length;
  return (
    <div className="gm-action">
      <div className="gm-action__statusbar">
        <span className="sf-eyebrow gm-action__live">Action Scene</span>
        <span className="gm-pill gm-pill--active">Active</span>
        <span className="gm-action__hint">{nSel === 0 ? "Tap a card to select for targeting" : nSel + " selected for targeting"}</span>
        <button className="gm-btn gm-btn-end" onClick={onEnd}><Icon name="square" />End Action</button>
      </div>
      <div className="gm-card gm-controls">
        <span className="sf-eyebrow gm-controls__label">GM Controls</span>
        <div className="gm-controls__row">
          <button className="gm-threat" onClick={onThreat}><Icon name="zap" />Threat Move<span className="gm-chip-mono">+1 AP all</span></button>
          <button className="gm-targeted" onClick={onTargeted}><Icon name="crosshair" />Targeted Threat<span className="gm-chip-mono">{nSel === 0 ? "+2 all" : "+2 sel · +1 rest"}</span></button>
          <div className="gm-opening">
            <span className="gm-opening__label">Opening</span>
            {[1, 2, 3, 4, 5, 6].map((n) => <button key={n} className="gm-opening__chip" onClick={() => onOpening(n)}>{n}</button>)}
          </div>
        </div>
      </div>
      <div className="gm-action__cards">
        {action.included.map((pcId) => {
          const p = party.find((x) => x.id === pcId); if (!p) return null;
          const ap = action.ap[pcId] || 0;
          const sel = action.selected.includes(pcId);
          const open = action.changeApId === pcId;
          return (
            <article key={pcId} className={"gm-card gm-combat" + (sel ? " is-selected" : "")} onClick={() => onToggleSelect(pcId)}>
              <span className="gm-card__accent" style={{ background: sel ? "var(--gold-500)" : TONE3[p.tone] }} />
              <div className="gm-combat__head">
                <Avatar name={p.name} initials={p.initials} tone={String(p.tone)} size={30} />
                <div className="gm-combat__id">
                  <span className="gm-pc__name">{p.name}</span>
                  <Stars value={p.resolve} max={5} />
                </div>
                <div className="gm-combat__ap">
                  <span className="gm-combat__aplbl">AP</span>
                  <span className="gm-combat__apval" style={{ color: apColor(ap) }}>{ap}</span>
                </div>
              </div>
              <div className="gm-combat__btns" onClick={(e) => e.stopPropagation()}>
                <button className="gm-btn gm-btn-target" onClick={() => onTarget(pcId)}><Icon name="crosshair" />Target</button>
                <button className="gm-btn" onClick={() => setChangeApId(pcId)}><Icon name="pencil-ruler" />Change AP</button>
              </div>
              {open && (
                <div className="gm-combat__appanel" onClick={(e) => e.stopPropagation()}>
                  <span className="gm-stat__label">Adjust AP</span>
                  <div className="gm-combat__apbtns">
                    {[-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6].map((d) => (
                      <button key={d} className={"gm-apbtn" + (d > 0 ? " is-pos" : " is-neg")} onClick={() => onChangeAp(pcId, d)}>{d > 0 ? "+" + d : d}</button>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ============================= FORCE RESIST ============================= */
function ResistModal({ resist, party, conds, onPatch, onRoll, onClose }: { resist: ResistState; party: GmPartyMember[]; conds: GmCondDef[]; onPatch: (patch: Partial<ResistState>) => void; onRoll: () => void; onClose: () => void }) {
  const pc = party.find((p) => p.id === resist.pcId) || party[0];
  const cond = conds.find((c) => c.id === resist.cond) || conds[0];
  return (
    <div className="gm-scrim" onClick={onClose}>
      <div className="gm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gm-modal__head">
          <span className="gm-modal__glyph"><Icon name="shield-alert" /></span>
          <div className="gm-modal__titles"><span className="gm-modal__eyebrow">Force a resist roll</span><span className="gm-modal__title">{pc.name}</span></div>
          <button className="gm-modal__x" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="gm-modal__body">
          <div>
            <div className="gm-field-label">Condition to resist</div>
            <div className="gm-condpick">
              {conds.map((c) => {
                const on = resist.cond === c.id;
                return (
                  <button key={c.id} className={"gm-condpick__btn" + (on ? " is-on" : "")} style={on ? { borderColor: c.color, background: "color-mix(in oklab," + c.color + " 16%,var(--ink-800))" } : undefined} onClick={() => onPatch({ cond: c.id, rolled: null })}>
                    <span style={{ color: c.color }} className="gm-condpick__name">{c.name}</span>
                    <span className="gm-condpick__meta">{c.resist}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="gm-field-label">Difficulty (DC)</div>
            <div className="gm-dc">
              <button className="gm-dc__btn" onClick={() => onPatch({ dc: Math.max(1, resist.dc - 1), dcText: null, rolled: null })}>−</button>
              <input type="number" className="gm-dc__input" value={resist.dcText != null ? resist.dcText : resist.dc}
                onChange={(e) => { const raw = e.target.value; const v = parseInt(raw, 10); const patch: Partial<ResistState> = { dcText: raw, rolled: null }; if (!isNaN(v)) patch.dc = Math.max(1, v); onPatch(patch); }}
                onBlur={() => { const v = parseInt(resist.dcText || "", 10); onPatch({ dc: isNaN(v) ? resist.dc : Math.max(1, v), dcText: null }); }} />
              <button className="gm-dc__btn" onClick={() => onPatch({ dc: resist.dc + 1, dcText: null, rolled: null })}>+</button>
            </div>
          </div>
          <p className="gm-modal__info">{pc.name} will roll their {cond.resist} save against DC {resist.dc} on their own sheet. The result lands in the shared roll log.</p>
        </div>
        <div className="gm-modal__foot">
          <span className="gm-modal__footnote">A failed save inflicts the condition on the player&apos;s sheet.</span>
          <div className="gm-modal__footbtns">
            <button className="gm-btn" onClick={onClose}>Cancel</button>
            <button className="gm-btn-gold" onClick={onRoll}><Icon name="send" />Prompt to resist</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== GRANT DRAWER ============================= */
function GrantDrawer({ grant, party, matChips, matStep, onPatch, onGrantMaterials, onGrantItem, onClose }: {
  grant: GrantState; party: GmPartyMember[]; matChips: number[]; matStep: number; onPatch: (patch: Partial<GrantState>) => void; onGrantMaterials: () => void; onGrantItem: (e: { name: string; desc: string }) => void; onClose: () => void;
}) {
  const pc = grant.pcId === "__all__" ? { name: "The Whole Party", materials: party.reduce((a, p) => a + p.materials, 0) } : (party.find((p) => p.id === grant.pcId) || party[0]);
  const isMat = grant.cat === "materials";
  const q = (grant.q || "").toLowerCase();
  const entries = isMat ? [] : (SEED.compendium || []).filter((e) => e.cat === grant.cat && (!q || (e.name + " " + (e.meta || []).join(" ") + " " + (e.desc || "")).toLowerCase().includes(q)));
  return (
    <React.Fragment>
      <div className="sf-scrim open" onClick={onClose} />
      <aside className="sf-drawer open gm-grant" role="dialog" aria-label="Grant from the Compendium">
        <div className="sf-drawer__head">
          <span className="sf-fac__glyph" style={{ background: "var(--brand-subtle)", color: "var(--gold-200)" }}><Icon name="library-big" /></span>
          <div className="sf-drawer__title">
            <span className="sf-eyebrow">The Archive · grant to {pc.name}</span>
            <h2>Compendium</h2>
          </div>
          <button className="gm-modal__x" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="sf-drawer__search">
          <Icon name="search" />
          <input value={grant.q || ""} onChange={(e) => onPatch({ q: e.target.value })} placeholder="Search the archive…" />
        </div>
        <div className="gm-grant__tabs">
          {GRANT_CATS.map((c) => (
            <button key={c.id} className={"gm-grant__tab" + (grant.cat === c.id ? " is-on" : "")} onClick={() => onPatch({ cat: c.id, openId: null })}><Icon name={c.icon} />{c.label}</button>
          ))}
        </div>
        <div className="gm-grant__body">
          {isMat ? (
            <div className="gm-grant__mat">
              <div className="gm-grant__matcard">
                <span className="gm-grant__matglyph"><Icon name="circle-star" /></span>
                <div className="gm-grant__matheld">
                  <span className="gm-field-label">{pc.name} holds</span>
                  <span className="gm-grant__matnum">{pc.materials.toLocaleString()}<span className="gm-grant__matunit"> materials</span></span>
                </div>
              </div>
              <div className="gm-field-label">Amount</div>
              <div className="gm-grant__matstepper">
                <button className="gm-dc__btn" disabled={grant.matAmt <= matStep} onClick={() => onPatch({ matAmt: Math.max(matStep, grant.matAmt - matStep), matText: null })}>−</button>
                <input type="number" min={matStep} step={matStep} className="gm-dc__input gm-grant__matinput" value={grant.matText != null ? grant.matText : grant.matAmt}
                  onChange={(e) => { const raw = e.target.value; const v = parseInt(raw, 10); const patch: Partial<GrantState> = { matText: raw }; if (!isNaN(v)) patch.matAmt = Math.max(1, v); onPatch(patch); }}
                  onBlur={() => { const v = parseInt(grant.matText || "", 10); onPatch({ matAmt: isNaN(v) ? grant.matAmt : Math.max(1, v), matText: null }); }} />
                <button className="gm-dc__btn" onClick={() => onPatch({ matAmt: grant.matAmt + matStep, matText: null })}>+</button>
              </div>
              <div className="gm-grant__chips">
                {matChips.map((v) => <button key={v} className={"gm-grant__chip" + (grant.matAmt === v ? " is-on" : "")} onClick={() => onPatch({ matAmt: v, matText: null })}>+{v}</button>)}
              </div>
              <button className="gm-btn-gold gm-btn-block" onClick={onGrantMaterials}><Icon name="gift" />Grant {grant.matAmt.toLocaleString()} materials</button>
            </div>
          ) : (
            <div>
              <div className="gm-field-label">{entries.length} {entries.length === 1 ? "entry" : "entries"}</div>
              <div className="gm-grant__entries">
                {entries.map((e) => {
                  const open = grant.openId === e.id;
                  const lvl = (e.level || "").split(" ")[0];
                  return (
                    <div key={e.id} className="gm-grant__entry">
                      <div className="gm-grant__entryhead" onClick={() => onPatch({ openId: open ? null : e.id })}>
                        <div className="gm-grant__entryid">
                          <span className="gm-grant__entryname">{e.name}</span>
                          <div className="gm-grant__entrymeta">
                            <span className="gm-grant__entrylvl" style={{ color: LEVELCOLOR[lvl] || "var(--text-muted)" }}><span className="gm-house__dot" style={{ background: LEVELCOLOR[lvl] || "var(--text-muted)" }} />{e.level}</span>
                            <span className="gm-grant__entrysub">{(e.meta || []).join(" · ")}</span>
                          </div>
                        </div>
                        <button className="gm-btn" onClick={(ev) => { ev.stopPropagation(); onGrantItem(e); }}><Icon name="gift" style={{ color: "var(--gold-300)" }} />Grant</button>
                        <Icon name={open ? "chevron-up" : "chevron-down"} />
                      </div>
                      {open && (
                        <div className="gm-grant__entrybody">
                          <p>{e.desc}</p>
                          <button className="gm-btn-gold" onClick={() => onGrantItem(e)}><Icon name="gift" />Grant to {pc.name}</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </aside>
    </React.Fragment>
  );
}

/* ============================== ADD / EDIT NPC =========================== */
function NpcStepper({ value, onChange, min, max, accent }: { value: number; onChange: (v: number) => void; min: number; max: number; accent?: string }) {
  return (
    <div className="gm-npcstep">
      <button className="gm-step" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <input type="number" className="gm-npcstep__input" style={accent ? { color: accent } : undefined} value={String(value)} onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) onChange(clampN(v, min, max)); }} />
      <button className="gm-step" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}
function AddNpcModal({ addNpc, onPatch, onConfirm, onDelete, onClose }: { addNpc: AddNpcState; onPatch: (patch: Partial<AddNpcState>) => void; onConfirm: () => void; onDelete: (id: string) => void; onClose: () => void }) {
  const isEdit = !!addNpc.editId;
  const mono = addNpc.name.trim().split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div className="gm-scrim" onClick={onClose}>
      <div className="gm-modal gm-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="gm-modal__head">
          <span className="gm-modal__glyph"><Icon name="venetian-mask" /></span>
          <div className="gm-modal__titles"><span className="gm-modal__eyebrow">{isEdit ? "Update the cast" : "Add to the cast"}</span><span className="gm-modal__title">{isEdit ? "Edit NPC" : "New NPC"}</span></div>
          <button className="gm-modal__x" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="gm-modal__body">
          <div className="gm-npc-form__row2">
            <label className="gm-input-field"><span className="gm-field-label">Name <span className="gm-req">*</span></span><input value={addNpc.name} onChange={(e) => onPatch({ name: e.target.value })} placeholder="e.g. Florence Walker" /></label>
            <label className="gm-input-field"><span className="gm-field-label">Title <span className="gm-opt">(optional)</span></span><input value={addNpc.title} onChange={(e) => onPatch({ title: e.target.value })} placeholder="e.g. Head Enforcer" /></label>
          </div>
          <div className="gm-npc-form__row3">
            <div className="gm-statbox"><span className="gm-field-label">Resolve</span><NpcStepper value={addNpc.resolve} onChange={(v) => onPatch({ resolve: v })} min={1} max={15} /></div>
            <div className="gm-statbox gm-statbox--strong"><span className="gm-field-label">Strong roll</span><NpcStepper value={addNpc.strong} onChange={(v) => onPatch({ strong: v })} min={0} max={20} accent="var(--forest-300)" /></div>
            <div className="gm-statbox gm-statbox--weak"><span className="gm-field-label">Weak roll</span><NpcStepper value={addNpc.weak} onChange={(v) => onPatch({ weak: v })} min={0} max={20} accent="var(--crimson-300)" /></div>
          </div>
          <div>
            <div className="gm-field-label">Icon <span className="gm-opt">Choose an icon or use the default monogram</span></div>
            <div className="gm-icongrid">
              {[{ key: "__mono", mono: true }].concat(NPC_ICONS.map((n) => ({ key: n, mono: false }))).map((opt) => {
                const sel = addNpc.icon === opt.key;
                return <button key={opt.key} className={"gm-iconcell" + (sel ? " is-on" : "")} onClick={() => onPatch({ icon: opt.key })}>{opt.mono ? <span className="gm-iconcell__mono">{mono}</span> : <Icon name={opt.key} />}</button>;
              })}
            </div>
          </div>
        </div>
        {addNpc.confirmDelete ? (
          <div className="gm-modal__foot gm-modal__foot--danger">
            <Icon name="triangle-alert" style={{ color: "var(--crimson-300)" }} />
            <span className="gm-modal__footnote">Remove this NPC permanently? This cannot be undone.</span>
            <div className="gm-modal__footbtns">
              <button className="gm-btn" onClick={() => onPatch({ confirmDelete: false })}>Keep</button>
              <button className="gm-btn-sm gm-btn-danger" onClick={() => addNpc.editId && onDelete(addNpc.editId)}><Icon name="trash-2" />Remove NPC</button>
            </div>
          </div>
        ) : (
          <div className="gm-modal__foot">
            {isEdit && <button className="gm-btn gm-btn-removelink" onClick={() => onPatch({ confirmDelete: true })}><Icon name="trash-2" />Remove</button>}
            <div className="gm-modal__footbtns">
              <button className="gm-btn" onClick={onClose}>Cancel</button>
              <button className="gm-btn-gold" onClick={onConfirm}><Icon name={isEdit ? "check" : "plus"} />{isEdit ? "Save changes" : "Add to cast"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================= TIME ================================= */
function TimeModal({ time, setTime, onAdvance, onSleep, onClose }: { time: GmTime; setTime: React.Dispatch<React.SetStateAction<GmTime>>; onAdvance: () => void; onSleep: () => void; onClose: () => void }) {
  const advanceLabel = (() => {
    if (!time.enabled) return DAYS[(time.day + 1) % 7];
    const nb = (time.block + 1) % 4;
    const nd = nb === 0 ? (time.day + 1) % 7 : time.day;
    return DAYS[nd] + " " + BLOCKS[nb].label;
  })();
  return (
    <div className="gm-scrim" onClick={onClose}>
      <div className="gm-modal gm-modal--time" onClick={(e) => e.stopPropagation()}>
        <div className="gm-modal__head">
          <span className="gm-modal__glyph"><Icon name={time.enabled ? BLOCKS[time.block].icon : "calendar"} /></span>
          <div className="gm-modal__titles"><span className="gm-modal__eyebrow">The Clock</span><span className="gm-modal__title">{time.enabled ? DAYS[time.day] + " " + BLOCKS[time.block].label : DAYS[time.day]}</span></div>
          <button className="gm-modal__x" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="gm-modal__body">
          <div className="gm-time__quick">
            <button className="gm-time__action" onClick={() => { onAdvance(); onClose(); }}>
              <span className="gm-time__actionhead"><Icon name="chevrons-right" style={{ color: "var(--gold-400)" }} />Advance</span>
              <span className="gm-time__actionsub">{advanceLabel}</span>
            </button>
            {time.enabled && (
              <button className="gm-time__action" onClick={() => { onSleep(); onClose(); }}>
                <span className="gm-time__actionhead"><Icon name="moon" style={{ color: "var(--teal-300)" }} />Sleep</span>
                <span className="gm-time__actionsub">{DAYS[(time.day + 1) % 7]} Morning</span>
              </button>
            )}
          </div>
          <div className="gm-time__manual">
            <span className="gm-field-label">Set manually</span>
            <div className="gm-time__days">
              {DAYS.map((d, i) => <button key={d} className={"gm-time__day" + (time.day === i ? " is-on" : "")} onClick={() => setTime((tm) => ({ ...tm, day: i }))}>{d}</button>)}
            </div>
            {time.enabled && (
              <div className="gm-time__blocks">
                {BLOCKS.map((b, i) => <button key={b.label} className={"gm-time__block" + (time.block === i ? " is-on" : "")} onClick={() => setTime((tm) => ({ ...tm, block: i }))}><Icon name={b.icon} />{b.label}</button>)}
              </div>
            )}
          </div>
          <div className="gm-time__toggle">
            <div className="gm-time__toggletxt">
              <span className="gm-time__toggletitle">Track time of day</span>
              <span className="gm-time__togglesub">{time.enabled ? "Showing day and time of day" : "Showing day only"}</span>
            </div>
            <button className={"gm-switch" + (time.enabled ? " is-on" : "")} onClick={() => setTime((tm) => ({ ...tm, enabled: !tm.enabled }))}><span className="gm-switch__knob" /></button>
          </div>
        </div>
        <div className="gm-modal__foot gm-modal__foot--end">
          <button className="gm-btn-gold" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
