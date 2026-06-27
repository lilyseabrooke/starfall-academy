"use client";

import * as React from "react";
import { Icon } from "../Icon";
import type { Potion } from "../../types";
import type { InvHandlers } from "./handlers";

function PotionSlot({ p, recipeKnown, h }: { p: Potion; recipeKnown: boolean; h: InvHandlers }) {
  const [menu, setMenu] = React.useState(false);
  const [info, setInfo] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!menu && !info) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenu(false);
        setInfo(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu, info]);
  const stop = (fn?: (e: React.MouseEvent) => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn && fn(e);
  };
  return (
    <div
      className={"sf-slot is-filled" + (info ? " is-open" : "")}
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={() => { setInfo((v) => !v); setMenu(false); }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setInfo((v) => !v);
          setMenu(false);
        }
      }}
    >
      <div className="sf-slot__top">
        <span className="sf-slot__ring"><Icon name="flask-conical" /></span>
        <div className="sf-slot__tools">
          <button className={"sf-slot__peek" + (info ? " is-on" : "")} onClick={stop(() => { setInfo((v) => !v); setMenu(false); })} aria-label="Preview" title="Preview"><Icon name="eye" /></button>
          <div className="sf-cardmenu">
            <button className="sf-cardmenu__btn" onClick={stop(() => { setMenu((v) => !v); setInfo(false); })} aria-label="More"><Icon name="ellipsis" /></button>
            {menu ? (
              <div className="sf-cardmenu__pop">
                <button onClick={stop(() => { setMenu(false); h.give("potion", p); })}><Icon name="gift" /> Give one to a party-mate</button>
                <button className="is-danger" onClick={stop(() => { setMenu(false); h.discardPotion(p); })}><Icon name="trash-2" /> Discard one</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <span className="sf-slot__name">{p.name}</span>
      <div className="sf-slot__meta">
        <span className="sf-chip"><b>Int</b> {p.intensity}</span>
        {recipeKnown ? <span className="sf-slot__known" title="Recipe known"><Icon name="scroll-text" /></span> : null}
      </div>
      <button className="sf-slot__take" onClick={stop((e) => h.takePotion(p, e.currentTarget as HTMLElement))}><Icon name="dices" /> Take</button>
      {info ? (
        <div className="sf-slot__pop" onClick={stop()}>
          <div className="sf-slot__pop-head">
            <span className="sf-slot__pop-name">{p.name}</span>
            <button className="sf-slot__pop-close" onClick={stop(() => setInfo(false))} aria-label="Close"><Icon name="x" /></button>
          </div>
          <div className="sf-slot__pop-chips">
            <span className="sf-chip"><b>Intensity</b> {p.intensity}</span>
            {recipeKnown ? <span className="sf-chip sf-chip--ok"><Icon name="scroll-text" /> Recipe known</span> : null}
          </div>
          <p className="sf-slot__pop-desc">{p.desc}</p>
        </div>
      ) : null}
    </div>
  );
}

export function PotionLoadout({ potions, cap, knownNames, h }: { potions: Potion[]; cap: number; knownNames: Set<string>; h: InvHandlers }) {
  const units: Potion[] = [];
  potions.forEach((p) => {
    for (let i = 0; i < p.qty; i++) units.push(p);
  });
  const cells = Array.from({ length: cap }, (_, i) => units[i] || null);
  return (
    <div className="sf-loadout">
      {cells.map((p, i) =>
        p ? (
          <PotionSlot key={i} p={p} recipeKnown={knownNames.has(p.name)} h={h} />
        ) : (
          <div key={i} className="sf-slot is-empty">
            <span className="sf-slot__ring"><Icon name="flask-conical" /></span>
            <span className="sf-slot__empty">Empty</span>
          </div>
        )
      )}
    </div>
  );
}
