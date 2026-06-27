"use client";

import * as React from "react";

/**
 * A small status / category pill. Tones map to the four houses plus gold &
 * neutral; use `solid` for a single high-emphasis gold badge.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color tone. @default "gold" */
  tone?: "gold" | "neutral" | "plum" | "forest" | "teal" | "crimson";
  /** Filled metallic gold instead of a tinted tone. @default false */
  solid?: boolean;
  /** Square corners instead of a pill. @default false */
  square?: boolean;
  /** Show a leading status dot. @default false */
  dot?: boolean;
  children?: React.ReactNode;
}

export function Badge({
  children,
  tone = "gold",
  solid = false,
  square = false,
  dot = false,
  className = "",
  ...rest
}: BadgeProps) {
  const cls = [
    "sa-badge",
    solid ? "sa-badge--solid" : `sa-badge--${tone}`,
    square ? "sa-badge--square" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      {dot ? <span className="sa-badge__dot" /> : null}
      {children}
    </span>
  );
}
