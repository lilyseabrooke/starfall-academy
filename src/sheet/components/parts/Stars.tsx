"use client";

import * as React from "react";
import { Icon } from "../Icon";

/** Resolve track: filled stars up to `value`, hollow to `max`. */
export function Stars({ value, max }: { value: number; max: number }) {
  return (
    <span className="sf-stars">
      {Array.from({ length: max }).map((_, i) => (
        <Icon key={i} name="star" className={i < value ? "on" : ""} />
      ))}
    </span>
  );
}
