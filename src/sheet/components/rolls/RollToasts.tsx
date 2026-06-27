"use client";

import * as React from "react";
import { Icon } from "../Icon";
import { headline } from "../../data/roll-engine";
import { RollEntry } from "./RollEntry";
import type { Roll } from "../../types";

const CRIT_EMBERS = [
  { left: 12, delay: 0, dur: 1.0, drift: -26, size: 6 },
  { left: 20, delay: 0.12, dur: 1.3, drift: 16, size: 4 },
  { left: 28, delay: 0.05, dur: 1.15, drift: -14, size: 7 },
  { left: 35, delay: 0.2, dur: 1.4, drift: 22, size: 5 },
  { left: 42, delay: 0.02, dur: 1.05, drift: -20, size: 5 },
  { left: 48, delay: 0.16, dur: 1.35, drift: 12, size: 8 },
  { left: 54, delay: 0.08, dur: 1.1, drift: -10, size: 4 },
  { left: 60, delay: 0.24, dur: 1.45, drift: 26, size: 6 },
  { left: 66, delay: 0.04, dur: 1.0, drift: -24, size: 5 },
  { left: 72, delay: 0.18, dur: 1.3, drift: 18, size: 7 },
  { left: 78, delay: 0.1, dur: 1.15, drift: -16, size: 4 },
  { left: 84, delay: 0.28, dur: 1.4, drift: 24, size: 6 },
  { left: 16, delay: 0.32, dur: 1.25, drift: 30, size: 3 },
  { left: 38, delay: 0.36, dur: 1.5, drift: -30, size: 4 },
  { left: 58, delay: 0.3, dur: 1.2, drift: 14, size: 3 },
  { left: 76, delay: 0.4, dur: 1.45, drift: -22, size: 5 },
  { left: 90, delay: 0.14, dur: 1.1, drift: -12, size: 5 },
  { left: 8, delay: 0.22, dur: 1.35, drift: 20, size: 4 },
];

function CritBurst({ kind }: { kind: string }) {
  return (
    <span className={"sf-crit-burst is-" + kind} aria-hidden="true">
      <span className="sf-crit-burst__flare" />
      <span className="sf-crit-burst__embers">
        {CRIT_EMBERS.map((e, i) => (
          <span
            key={i}
            className="sf-crit-burst__ember"
            style={{ left: e.left + "%", width: e.size + "px", height: e.size + "px", "--delay": e.delay + "s", "--dur": e.dur + "s", "--drift": e.drift + "px" } as React.CSSProperties}
          />
        ))}
      </span>
    </span>
  );
}

interface Toast {
  roll: Roll;
  pinned: boolean;
  leaving: boolean;
  hover: boolean;
}

export interface RollToastsProps {
  log: Roll[];
  cap: number;
  lifetime: number;
  graceMs: number;
  expandDefault: boolean;
  position: string;
}

export function RollToasts({ log, cap: capN, lifetime, graceMs, expandDefault, position }: RollToastsProps) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const seen = React.useRef<Set<string>>(new Set());
  const mounted = React.useRef(false);
  const timers = React.useRef<Record<string, { life?: ReturnType<typeof setTimeout>; leave?: ReturnType<typeof setTimeout> | null }>>({});
  const cfg = React.useRef({ capN, lifetime, graceMs });
  cfg.current = { capN, lifetime, graceMs };

  const clearTimers = (id: string) => {
    const t = timers.current[id];
    if (t) {
      if (t.life) clearTimeout(t.life);
      if (t.leave) clearTimeout(t.leave);
    }
    delete timers.current[id];
  };
  const remove = (id: string) => {
    clearTimers(id);
    setToasts((p) => p.filter((t) => t.roll.id !== id));
  };
  const beginLeave = (id: string) => {
    setToasts((p) => p.map((t) => (t.roll.id === id ? { ...t, leaving: true } : t)));
    const t = timers.current[id] || (timers.current[id] = {});
    if (t.life) clearTimeout(t.life);
    t.leave = setTimeout(() => remove(id), cfg.current.graceMs);
  };
  const scheduleLife = (id: string) => {
    clearTimers(id);
    timers.current[id] = { life: setTimeout(() => beginLeave(id), cfg.current.lifetime), leave: null };
  };

  const add = (roll: Roll) => {
    setToasts((prev) => {
      const next = [{ roll, pinned: false, leaving: false, hover: false }, ...prev];
      const active = next.filter((t) => !t.leaving);
      if (active.length > cfg.current.capN) {
        const overflow = active.length - cfg.current.capN;
        const unpinned = active.filter((t) => !t.pinned);
        const pool = unpinned.length >= overflow ? unpinned : active;
        pool.slice(pool.length - overflow).forEach((v) => setTimeout(() => beginLeave(v.roll.id), 0));
      }
      return next;
    });
    scheduleLife(roll.id);
  };

  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      log.forEach((r) => seen.current.add(r.id));
      return;
    }
    const fresh = log.filter((r) => !seen.current.has(r.id));
    fresh.reverse().forEach((r) => {
      seen.current.add(r.id);
      add(r);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log]);

  React.useEffect(() => () => {
    Object.keys(timers.current).forEach(clearTimers);
  }, []);

  const onEnter = (id: string) => {
    clearTimers(id);
    setToasts((p) => p.map((t) => (t.roll.id === id ? { ...t, leaving: false, hover: true } : t)));
  };
  const onLeave = (id: string) =>
    setToasts((p) => {
      const t = p.find((x) => x.roll.id === id);
      if (t && !t.pinned) scheduleLife(id);
      return p.map((x) => (x.roll.id === id ? { ...x, hover: false } : x));
    });
  const togglePin = (id: string) => {
    let willPin = false;
    setToasts((p) =>
      p.map((t) => {
        if (t.roll.id !== id) return t;
        willPin = !t.pinned;
        return { ...t, pinned: willPin, leaving: false };
      })
    );
    clearTimers(id);
    setTimeout(() => {
      if (!willPin) scheduleLife(id);
    }, 0);
  };

  return (
    <div className={"sf-toasts pos-" + position} aria-live="polite">
      {toasts.map((t) => {
        const expanded = t.hover || t.pinned || expandDefault;
        return (
          <div
            key={t.roll.id}
            className={"sf-rtoast out-" + headline(t.roll).key + (t.roll.crit ? " is-crit is-crit-" + t.roll.crit.kind : "") + (t.leaving ? " is-leaving" : "") + (t.pinned ? " is-pinned" : "")}
            style={{ "--grace": cfg.current.graceMs + "ms" } as React.CSSProperties}
            onMouseEnter={() => onEnter(t.roll.id)}
            onMouseLeave={() => onLeave(t.roll.id)}
            onClick={() => togglePin(t.roll.id)}
          >
            {t.pinned && <span className="sf-rtoast__pin"><Icon name="pin" /></span>}
            <button className="sf-rtoast__x" aria-label="Dismiss" onClick={(e) => { e.stopPropagation(); remove(t.roll.id); }}><Icon name="x" /></button>
            {t.roll.crit ? <CritBurst kind={t.roll.crit.kind} /> : t.roll.outcome === "inflection" ? <CritBurst kind="inflect" /> : null}
            <RollEntry roll={t.roll} expanded={expanded} compact hint />
          </div>
        );
      })}
    </div>
  );
}
