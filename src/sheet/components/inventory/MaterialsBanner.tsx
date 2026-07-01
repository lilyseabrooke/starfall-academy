"use client";

import * as React from "react";
import { Icon } from "../Icon";

const CREST_LINES = "/_ds/starfall-academy-design-system-61fef24c-b8ee-469f-860f-a6fd95fb2a6e/assets/crest-lines.png";

export function MaterialsBanner({ materials, onAdjust, onGive }: { materials: number; onAdjust: (delta: number) => void; onGive: () => void }) {
  const [mode, setMode] = React.useState<"gain" | "spend" | null>(null);
  const [amt, setAmt] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (mode && inputRef.current) inputRef.current.focus();
  }, [mode]);
  const commit = () => {
    const v = parseInt(amt, 10);
    if (!v || v <= 0) {
      setMode(null);
      setAmt("");
      return;
    }
    onAdjust(mode === "gain" ? v : -v);
    setMode(null);
    setAmt("");
  };
  return (
    <section className="sf-mats">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="sf-mats__wm" src={CREST_LINES} alt="" />
      <div className="sf-mats__left">
        <span className="sf-eyebrow">Materials</span>
        <div className="sf-mats__figure">
          <Icon name="gem" />
          <span className="sf-mats__num">{materials.toLocaleString()}</span>
        </div>
      </div>
      <div className="sf-mats__right">
        {mode ? (
          <div className="sf-mats__form">
            <span className="sf-mats__formlabel">{mode === "gain" ? "Gain" : "Spend"} materials</span>
            <div className="sf-mats__formrow">
              <input
                ref={inputRef}
                type="number"
                min="1"
                value={amt}
                placeholder="0"
                onChange={(e) => setAmt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") {
                    setMode(null);
                    setAmt("");
                  }
                }}
              />
              <button className="sf-mats__go" onClick={commit}><Icon name="check" /></button>
              <button className="sf-mats__cancel" onClick={() => { setMode(null); setAmt(""); }}><Icon name="x" /></button>
            </div>
          </div>
        ) : (
          <div className="sf-mats__btns">
            <button className="sf-mats__btn t-gain" onClick={() => setMode("gain")}><Icon name="plus" /> Gain</button>
            <button className="sf-mats__btn t-spend" onClick={() => setMode("spend")}><Icon name="minus" /> Spend</button>
            <button className="sf-mats__btn t-give" onClick={onGive}><Icon name="gift" /> Transfer</button>
          </div>
        )}
      </div>
    </section>
  );
}
