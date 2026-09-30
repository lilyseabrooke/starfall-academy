"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Crest } from "@/ds";
import { Icon } from "../Icon";
import { consumeReturnTarget } from "../../nav-return";

export interface SidebarRosterMember {
  id: string;
  name: string;
  house: string;
  tone: string;
  initials: string;
}

export interface GMSidebarTab {
  id: string;
  icon: string;
  label: string;
  active?: boolean;
  count?: number | string;
  onClick?: () => void;
}

export interface GMSidebarPartyMember {
  id: string;
  name: string;
  house: string;
  tone: string;
  initials: string;
  onOpen?: (id: string) => void;
}

export interface GMSidebarConfig {
  brandSub?: string;
  tableLabel?: string;
  tabs?: GMSidebarTab[];
  partyLabel?: string;
  party?: GMSidebarPartyMember[];
}

/** The GM-only NPC category: a list of the campaign's NPC sheets, with a "+" to
 *  build one in the character creator and a dice to conjure a random one. */
export interface SidebarNpcConfig {
  npcs: SidebarRosterMember[];
  activeId?: string;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onRandom: () => void;
}

export interface SidebarProps {
  active?: string;
  onNavigate: (id: string) => void;
  roster: SidebarRosterMember[];
  activeChar: string;
  onPickChar: (id: string) => void;
  compCount: number;
  onOverview: () => void;
  onEditCharacter: () => void;
  collapsed?: boolean;
  onToggleSidebar: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  gm?: GMSidebarConfig;
  /** Present only for the campaign's GM; players never get an NPC category. */
  npcs?: SidebarNpcConfig;
}

function NpcSection({ cfg, collapsed, onMobileClose }: { cfg: SidebarNpcConfig; collapsed?: boolean; onMobileClose?: () => void }) {
  return (
    <div className="sf-switcher sf-switcher--npc">
      <div className="sf-switch-head">
        <span className="sf-eyebrow">NPCs</span>
        <span className="sf-switch-head__tools">
          <span className="sf-nav__count" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>{cfg.npcs.length}</span>
          <button className="sf-switch-head__btn" onClick={() => { cfg.onRandom(); if (onMobileClose) onMobileClose(); }} title="Random NPC" aria-label="Create a random NPC"><Icon name="dices" /></button>
          <button className="sf-switch-head__btn" onClick={() => { cfg.onCreate(); if (onMobileClose) onMobileClose(); }} title="New NPC" aria-label="Create a new NPC"><Icon name="plus" /></button>
        </span>
      </div>
      <div className="sf-roster">
        {cfg.npcs.map((r) => (
          <button key={r.id} className={"sf-roster__item" + (r.id === cfg.activeId ? " is-active" : "")} onClick={() => { cfg.onOpen(r.id); if (onMobileClose) onMobileClose(); }} title={collapsed ? r.name + " · NPC" : undefined}>
            <span className={"sf-avatar t-" + r.tone}>{r.initials}</span>
            <span className="sf-roster__meta">
              <span className="sf-roster__name">{r.name}</span>
              <span className="sf-roster__house">{r.house}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const NAV = [
  { id: "overview", label: "Overview", icon: "shield-half" },
  { id: "classes", label: "Classes", icon: "graduation-cap" },
  { id: "magic", label: "Magic", icon: "sparkles" },
  { id: "inventory", label: "Inventory", icon: "backpack" },
  { id: "journal", label: "Journal", icon: "book-open-text" },
  { id: "map", label: "Map", icon: "map" },
];

export function Sidebar({
  active, onNavigate, roster, activeChar, onPickChar, compCount,
  onOverview, onEditCharacter, collapsed, onToggleSidebar, mobileOpen, onMobileClose, gm, npcs,
}: SidebarProps) {
  const router = useRouter();
  const goBack = () => router.push(consumeReturnTarget() || "/characters");

  if (gm) {
    return (
      <aside className={"sf-side sf-side--gm" + (collapsed ? " is-collapsed" : "") + (mobileOpen ? " is-mobile-open" : "")}>
        <div className="sf-brand">
          <button className="sf-back-btn" onClick={goBack} aria-label="Back"><Icon name="arrow-left" /></button>
          <Crest form="simple" size={38} />
          <div className="sf-brand__wm">
            <span className="sf-brand__name">Starfall</span>
            <span className="sf-brand__sub">{gm.brandSub || "Faculty View"}</span>
          </div>
          <button className="sf-side__close" onClick={onMobileClose} aria-label="Close menu"><Icon name="x" /></button>
        </div>

        <nav className="sf-nav">
          <div className="sf-nav__label sf-eyebrow">{gm.tableLabel || "The Table"}</div>
          {(gm.tabs || []).map((n) => (
            <button key={n.id} className={"sf-nav__item" + (n.active ? " is-active" : "")} onClick={() => { n.onClick && n.onClick(); if (onMobileClose) onMobileClose(); }} title={collapsed ? n.label : undefined}>
              <Icon name={n.icon} />
              <span className="sf-side__label">{n.label}</span>
              {n.count != null && n.count !== "" ? <span className="sf-nav__count">{n.count}</span> : null}
            </button>
          ))}
        </nav>

        <nav className="sf-nav sf-nav--party">
          <div className="sf-nav__label sf-eyebrow">{gm.partyLabel || "The Party"}</div>
          <div className="sf-roster">
            {(gm.party || []).map((p) => (
              <button key={p.id} className="sf-roster__item sf-roster__item--link" onClick={() => { p.onOpen && p.onOpen(p.id); if (onMobileClose) onMobileClose(); }} title={collapsed ? p.name + " · " + p.house : "Open " + p.name + "’s character sheet"}>
                <span className={"sf-avatar t-" + p.tone}>{p.initials}</span>
                <span className="sf-roster__meta">
                  <span className="sf-roster__name">{p.name}</span>
                  <span className="sf-roster__house">{p.house}</span>
                </span>
                <Icon name="arrow-up-right" className="sf-roster__go" />
              </button>
            ))}
          </div>
        </nav>

        {npcs ? <div className="sf-nav sf-nav--party"><NpcSection cfg={npcs} collapsed={collapsed} onMobileClose={onMobileClose} /></div> : null}

        <button className="sf-side__toggle-btn" onClick={onToggleSidebar} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <Icon name={collapsed ? "chevrons-right" : "chevrons-left"} />
          <span className="sf-side__label">{collapsed ? "Expand" : "Collapse"}</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className={"sf-side" + (collapsed ? " is-collapsed" : "") + (mobileOpen ? " is-mobile-open" : "")}>
      <div className="sf-brand">
        <button className="sf-back-btn" onClick={goBack} aria-label="Back"><Icon name="arrow-left" /></button>
        <Crest form="simple" size={38} />
        <div className="sf-brand__wm">
          <span className="sf-brand__name">Starfall</span>
          <span className="sf-brand__sub">Academy</span>
        </div>
        <button className="sf-side__close" onClick={onMobileClose} aria-label="Close menu"><Icon name="x" /></button>
      </div>

      <div className="sf-switcher">
        <div className="sf-switch-head">
          <span className="sf-eyebrow">Arcanists</span>
          <span className="sf-nav__count" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>{roster.length}</span>
        </div>
        <div className="sf-roster">
          {roster.map((r) => (
            <button key={r.id} className={"sf-roster__item" + (r.id === activeChar ? " is-active" : "")} onClick={() => { onPickChar(r.id); if (onMobileClose) onMobileClose(); }} title={collapsed ? r.name + " · " + r.house + " House" : undefined}>
              <span className={"sf-avatar t-" + r.tone}>{r.initials}</span>
              <span className="sf-roster__meta">
                <span className="sf-roster__name">{r.name}</span>
                <span className="sf-roster__house">{r.house}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {npcs ? <NpcSection cfg={npcs} collapsed={collapsed} onMobileClose={onMobileClose} /> : null}

      <nav className="sf-nav">
        <div className="sf-nav__label sf-eyebrow">The Sheet</div>
        {NAV.map((n) => (
          <button key={n.id} className={"sf-nav__item" + (active === n.id ? " is-active" : "")} onClick={() => { onNavigate(n.id); if (onMobileClose) onMobileClose(); }} title={collapsed ? n.label : undefined}>
            <Icon name={n.icon} />
            <span className="sf-side__label">{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="sf-side__foot">
        <button className="sf-nav__item" onClick={() => { onNavigate("compendium"); if (onMobileClose) onMobileClose(); }} title={collapsed ? "Compendium" : undefined}>
          <Icon name="library-big" /><span className="sf-side__label">Compendium</span>
          <span className="sf-nav__count">{compCount}</span>
        </button>
        <button className="sf-nav__item" onClick={() => { onOverview(); if (onMobileClose) onMobileClose(); }} title={collapsed ? "Overview" : undefined}>
          <Icon name="scroll" /><span className="sf-side__label">Overview</span>
        </button>
        <button className="sf-nav__item" onClick={onEditCharacter} title={collapsed ? "Edit character" : undefined}>
          <Icon name="pencil-line" /><span className="sf-side__label">Edit character</span>
        </button>
      </div>
      <button className="sf-side__toggle-btn" onClick={onToggleSidebar} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
        <Icon name={collapsed ? "chevrons-right" : "chevrons-left"} />
        <span className="sf-side__label">{collapsed ? "Expand" : "Collapse"}</span>
      </button>
    </aside>
  );
}
