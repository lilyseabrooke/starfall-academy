"use client";

import * as React from "react";
import { Badge, Switch } from "@/ds";
import { Icon } from "../Icon";
import { accentOf, parsePlantRoll } from "../../data/shared";
import type { Item, Plant, Recipe, Wand } from "../../types";
import type { InvHandlers } from "./handlers";
import { CardMenu, ItemAct } from "./shared";

export function RecipeCard({ r, heldFull, h, open, onToggle }: { r: Recipe; heldFull: boolean; h: InvHandlers; open: boolean; onToggle: () => void }) {
  return (
    <div className={"sf-itm sf-recipe is-flat" + (open ? " is-open" : " is-collapsed")}>
      <div className="sf-itm__head" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle && onToggle()}>
        <span className="sf-itm__name">{r.name}</span>
        <Badge tone="neutral" square>Recipe</Badge>
        <button className="sf-itm__edit" title="Edit recipe" onClick={(e) => { e.stopPropagation(); h.editRecipe(r); }}><Icon name="pencil" /></button>
        <CardMenu onGive={() => h.give("recipe", r)} onRemove={() => h.removeRecipe(r)} giveLabel="Share recipe" />
        <span className="sf-itm__chev"><Icon name={open ? "chevron-up" : "chevron-down"} /></span>
      </div>
      <div className="sf-itm__chips">
        <span className="sf-chip"><b>Intensity</b> {r.intensity}</span>
        <span className="sf-chip"><b>Cost</b> {r.cost} mat.</span>
      </div>
      {open && <p className="sf-itm__desc">{r.desc}</p>}
      <div className="sf-itm__foot">
        {heldFull ? (
          <span className="sf-itm__warn"><Icon name="lock" /> Potion sheaf full</span>
        ) : (
          <ItemAct icon="flame" label="Brew" tone="gold" onClick={(e) => h.brew(r, e.currentTarget as HTMLElement)} />
        )}
      </div>
    </div>
  );
}

export function PlantCard({ pl, h, open, onToggle }: { pl: Plant; h: InvHandlers; open: boolean; onToggle: () => void }) {
  const info = parsePlantRoll(pl.requiresRoll);
  const hasUse = info.mode === "yes" || info.mode === "no" || info.mode === "choose";
  const useIcon = info.mode === "no" ? "check-check" : "dices";
  const bonusVal = ((info.bonusValue ?? 0) >= 0 ? "+" : "") + (info.bonusValue || 0);
  return (
    <div className={"sf-itm sf-plant is-flat" + (pl.used ? " is-used" : "") + (open ? " is-open" : " is-collapsed")}>
      <div className="sf-itm__head" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle && onToggle()}>
        <span className="sf-itm__name">{pl.name}</span>
        <span className="sf-plant__val"><Icon name="gem" /> {pl.value}</span>
        <button className="sf-itm__edit" title="Edit plant" onClick={(e) => { e.stopPropagation(); h.editPlant(pl); }}><Icon name="pencil" /></button>
        <CardMenu onGive={() => h.give("plant", pl)} onRemove={() => h.removePlant(pl)} />
        <span className="sf-itm__chev"><Icon name={open ? "chevron-up" : "chevron-down"} /></span>
      </div>
      <div className="sf-itm__chips">
        <span className="sf-chip"><b>Intensity</b> {pl.intensity}</span>
        {info.mode === "ability" ? <span className="sf-chip sf-chip--field"><Icon name="infinity" /> Passive</span> : null}
        {info.mode === "choose" ? <span className="sf-chip"><Icon name="dices" /> Roll optional</span> : null}
        {info.mode === "no" ? <span className="sf-chip"><Icon name="check-check" /> No roll</span> : null}
        {pl.used ? <span className="sf-chip sf-chip--spent"><Icon name="check" /> Used</span> : null}
        {pl.removeOnUse ? <span className="sf-chip sf-chip--warn"><Icon name="flame" /> Consumed on use</span> : null}
      </div>
      {open && (
        <React.Fragment>
          <p className="sf-itm__desc">{pl.desc}</p>
          {pl.ability ? (
            <div className="sf-plant__ability">
              <span className="sf-plant__ability-lbl"><Icon name="sparkles" /> Ability</span>
              <p className="sf-plant__ability-text">{pl.ability}</p>
            </div>
          ) : null}
          {info.mode === "move" ? <div className="sf-itm__link"><Icon name="swords" /> Move <span className="sf-itm__link-on">on your Overview</span></div> : null}
          {info.mode === "bonus" ? <div className="sf-itm__link"><Icon name="zap" /> Bonus <b>{info.bonusTarget}, {bonusVal}</b> <span className="sf-itm__link-on">on your Overview</span></div> : null}
        </React.Fragment>
      )}
      <div className="sf-itm__foot sf-itm__foot--split">
        {hasUse ? (
          pl.used ? (
            <ItemAct icon="rotate-ccw" label="Refresh" onClick={() => h.refreshPlant(pl)} />
          ) : (
            <ItemAct icon={useIcon} label="Use" tone="gold" onClick={(e) => h.usePlant(pl, e.currentTarget as HTMLElement)} />
          )
        ) : (
          <span className="sf-itm__note">
            <Icon name={info.mode === "move" ? "swords" : info.mode === "bonus" ? "zap" : "infinity"} />
            {info.mode === "move" ? "Active as a Move" : info.mode === "bonus" ? "Active as a Bonus" : "Always in effect"}
          </span>
        )}
        <ItemAct icon="scissors" label={"Harvest · +" + pl.value} onClick={() => h.harvestPlant(pl)} title={"Harvest for " + pl.value + " materials"} />
      </div>
    </div>
  );
}

export function WandCard({ w, h, open, onToggle }: { w: Wand; h: InvHandlers; open: boolean; onToggle: () => void }) {
  const acc = accentOf(w.level);
  const pct = w.maxCondition ? Math.round((w.condition / w.maxCondition) * 100) : 0;
  const tone = w.condition <= 0 ? "crimson" : pct <= 33 ? "gold" : "forest";
  const setCond = (v: number) => h.setWandCondition(w, v);
  const step = Math.max(1, Math.round(w.maxCondition / 10));
  return (
    <div className={"sf-itm sf-wand" + (acc.flat ? " is-flat" : "") + (w.equipped ? " is-equipped" : "") + (w.twisted ? " is-twisted" : "") + (open ? " is-open" : " is-collapsed")} style={acc.style}>
      <div className="sf-itm__head" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle && onToggle()}>
        <span className="sf-itm__name">{w.name}</span>
        {w.twisted ? <span className="sf-chip sf-chip--warn"><Icon name="flame" /> Twisted</span> : null}
        <button className="sf-itm__edit" title="Edit wand" onClick={(e) => { e.stopPropagation(); h.editWand(w); }}><Icon name="pencil" /></button>
        <CardMenu onGive={() => h.give("wand", w)} onRemove={() => h.removeWand(w)} />
        <span className="sf-itm__chev"><Icon name={open ? "chevron-up" : "chevron-down"} /></span>
      </div>
      <div className="sf-itm__chips">
        <span className={"sf-chip t-" + tone}><Icon name={w.condition >= w.maxCondition ? "heart" : "heart-crack"} /> {w.condition}/{w.maxCondition}</span>
        {w.crafting ? <span className="sf-chip sf-chip--warn"><Icon name="hammer" /> Crafting</span> : null}
        {!w.crafting && w.equipped ? <span className="sf-chip sf-chip--ok"><Icon name="check-circle" /> Equipped</span> : null}
      </div>
      {open && (
        <React.Fragment>
          <p className="sf-itm__desc">{w.desc}</p>
          <div className="sf-wand__cond">
            <span className="sf-wand__cond-lbl"><Icon name={w.condition >= w.maxCondition ? "heart" : "heart-crack"} /> Condition</span>
            <div className="sf-wand__cond-edit">
              <button type="button" className="sf-wand__cond-step" aria-label="Lower condition" disabled={w.condition <= 0} onClick={() => setCond(w.condition - step)}><Icon name="minus" /></button>
              <input className="sf-wand__cond-input" type="number" min="0" max={w.maxCondition} value={w.condition} onChange={(e) => setCond(parseInt(e.target.value, 10) || 0)} aria-label="Condition in materials" />
              <span className="sf-wand__cond-max">/ {w.maxCondition.toLocaleString()} mat.</span>
              <button type="button" className="sf-wand__cond-step" aria-label="Raise condition" disabled={w.condition >= w.maxCondition} onClick={() => setCond(w.condition + step)}><Icon name="plus" /></button>
            </div>
            <span className={"sf-wand__cond-bar t-" + tone}><span style={{ width: pct + "%" }} /></span>
          </div>
        </React.Fragment>
      )}
      <div className="sf-itm__foot sf-itm__foot--split">
        <label className={"sf-equip" + (w.crafting ? " is-disabled" : "")} title={w.crafting ? "Cannot equip — still being crafted" : undefined}>
          <Switch checked={w.equipped} disabled={!!w.crafting} onChange={() => !w.crafting && h.equipWand(w)} />
          <span>{w.crafting ? "Crafting" : w.equipped ? "Equipped" : "Equip"}</span>
        </label>
        {w.condition < w.maxCondition ? <ItemAct icon="hammer" label="Repair" onClick={(e) => h.repairWand(w, e.currentTarget as HTMLElement)} /> : null}
      </div>
    </div>
  );
}

export function ItemCard({ it, h, open, onToggle }: { it: Item; h: InvHandlers; open: boolean; onToggle: () => void }) {
  const rawCheck = (it.check || "").trim().toUpperCase();
  const hasCheck = !!rawCheck && rawCheck !== "NONE";
  const isSingleUse = it.singleUse === true || String(it.singleUse || "").toUpperCase() === "YES";
  const tags = it.tags ? (Array.isArray(it.tags) ? it.tags : it.tags.split(",").map((t) => t.trim()).filter(Boolean)) : [];
  const showFoot = hasCheck || isSingleUse;
  return (
    <div className={"sf-itm sf-item is-flat" + (open ? " is-open" : " is-collapsed")}>
      <div className="sf-itm__head" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle && onToggle()}>
        <span className="sf-itm__name">{it.name}</span>
        {it.qty != null && it.qty > 1 ? <span className="sf-item__qty">×{it.qty}</span> : null}
        <CardMenu onGive={() => h.give("item", it)} onRemove={() => h.removeItem(it)} />
        <span className="sf-itm__chev"><Icon name={open ? "chevron-up" : "chevron-down"} /></span>
      </div>
      <div className="sf-itm__chips">
        {it.cost != null ? <span className="sf-chip"><Icon name="coins" /> {it.cost}</span> : null}
        {isSingleUse ? <span className="sf-chip sf-chip--warn"><Icon name="flame" /> Single-use</span> : null}
        {hasCheck ? <span className="sf-chip sf-chip--field"><Icon name="dices" /> {it.check}</span> : null}
        {tags.map((tag) => (
          <span key={tag} className={"sf-chip sf-chip--tag" + (tag.toUpperCase().includes("BACKFIRE") || tag.toUpperCase().includes("FAILURE") ? " is-loss" : "")}>
            {tag.replace(/_/g, " ")}
          </span>
        ))}
      </div>
      {open && <p className="sf-itm__desc">{it.desc}</p>}
      {showFoot && (
        <div className="sf-itm__foot">
          <ItemAct icon={hasCheck ? "dices" : "check-check"} label="Use" tone={hasCheck ? "gold" : undefined} onClick={(e) => h.useItem(it, hasCheck ? (e.currentTarget as HTMLElement) : null)} />
        </div>
      )}
    </div>
  );
}
