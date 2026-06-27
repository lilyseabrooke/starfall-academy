"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Icon } from "../Icon";
import { INV } from "../../data/inventory";
import type { Artifact } from "../../types";
import type { InvHandlers } from "./handlers";

/** Fast / Medium / Slow repair chooser — faster = higher DC; worse status = higher DC. */
export function RepairMenu({ art, h }: { art: Artifact; h: InvHandlers }) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const popRef = React.useRef<HTMLDivElement>(null);
  const [popStyle, setPopStyle] = React.useState<React.CSSProperties>({});

  const measure = React.useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const estH = 168;
    const spaceAbove = r.top - 8;
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const goAbove = spaceAbove >= estH || spaceAbove >= spaceBelow;
    setPopStyle(
      goAbove
        ? { position: "fixed", bottom: window.innerHeight - r.top + 6, right: window.innerWidth - r.right, width: 250, zIndex: 9999, maxHeight: spaceAbove, overflowY: "auto" }
        : { position: "fixed", top: r.bottom + 6, right: window.innerWidth - r.right, width: 250, zIndex: 9999, maxHeight: spaceBelow, overflowY: "auto" }
    );
  }, []);

  React.useLayoutEffect(() => {
    if (open) measure();
  }, [open, measure]);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if ((btnRef.current && btnRef.current.contains(e.target as Node)) || (popRef.current && popRef.current.contains(e.target as Node))) return;
      setOpen(false);
    };
    const onScroll = () => measure();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, measure]);

  const popup =
    open && typeof document !== "undefined"
      ? createPortal(
          <div ref={popRef} className="sf-repair__pop" style={popStyle}>
            <div className="sf-repair__head"><Icon name="shield-alert" /><span>Mend a <b>{art.condition}</b> artifact · Artificy roll</span></div>
            {INV.repairOrder.map((speed) => {
              const cfg = INV.repair[speed];
              const dc = (cfg.dc as Record<string, number>)[art.condition];
              const time = (cfg.time as Record<string, string>)[art.condition];
              return (
                <button key={speed} className="sf-repair__opt" onClick={() => { setOpen(false); if (btnRef.current) h.repairArtifact(art, speed, btnRef.current); }}>
                  <span className="sf-repair__pace">{cfg.label}</span>
                  <span className="sf-repair__time"><Icon name="clock" /> {time}</span>
                  <span className="sf-repair__dc">DC {dc}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="sf-repair">
      <button ref={btnRef} className="sf-ia t-gold" onClick={() => setOpen((v) => !v)}>
        <Icon name="hammer" /> Repair <Icon name={open ? "chevron-up" : "chevron-down"} />
      </button>
      {popup}
    </div>
  );
}
