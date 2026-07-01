"use client";

import * as React from "react";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export type RangeValue = [number | null, number | null];

export interface DualRangeProps {
  label: string;
  max: number;
  step: number;
  value: RangeValue;
  onChange: (value: RangeValue) => void;
}

/** A min/max range filter with number inputs + a dual slider. */
export function DualRange({ label, max, step, value, onChange }: DualRangeProps) {
  const a = value[0];
  const b = value[1];
  const lo = a == null ? 0 : a;
  const hi = b == null ? max : b;
  return (
    <div className="sf-filter-group">
      <label>{label}</label>
      <div className="sf-range-nums">
        <input
          type="number"
          className="sf-range-num"
          placeholder="MIN"
          min="0"
          max={max}
          step={step}
          value={a == null ? "" : a}
          onChange={(e) => {
            const raw = e.target.value;
            const v = raw === "" ? null : clamp(parseFloat(raw) || 0, 0, max);
            onChange([v == null ? null : Math.min(v, hi), b]);
          }}
        />
        <span>–</span>
        <input
          type="number"
          className="sf-range-num"
          placeholder="MAX"
          min="0"
          max={max}
          step={step}
          value={b == null ? "" : b}
          onChange={(e) => {
            const raw = e.target.value;
            const v = raw === "" ? null : clamp(parseFloat(raw) || 0, 0, max);
            onChange([a, v == null ? null : Math.max(v, lo)]);
          }}
        />
      </div>
      <div className="sf-dual">
        <div className="sf-dual__rail" />
        <div className="sf-dual__fill" style={{ left: (lo / max) * 100 + "%", right: 100 - (hi / max) * 100 + "%" }} />
        <input
          type="range"
          className="sf-dual__thumb sf-dual__thumb--min"
          min="0"
          max={max}
          step={step}
          value={lo}
          aria-label={label + " minimum"}
          onChange={(e) => {
            const v = Math.min(parseFloat(e.target.value), hi);
            onChange([v <= 0 ? null : v, b]);
          }}
        />
        <input
          type="range"
          className="sf-dual__thumb sf-dual__thumb--max"
          min="0"
          max={max}
          step={step}
          value={hi}
          aria-label={label + " maximum"}
          onChange={(e) => {
            const v = Math.max(parseFloat(e.target.value), lo);
            onChange([a, v >= max ? null : v]);
          }}
        />
      </div>
    </div>
  );
}
