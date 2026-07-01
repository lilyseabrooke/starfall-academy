"use client";

import * as React from "react";

/**
 * A square, icon-only button for toolbars and compact controls.
 * Always pass `label` for accessibility (used as aria-label + tooltip).
 */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label — also shown as the native tooltip. */
  label: string;
  /** Visual style. @default "ghost" */
  variant?: "ghost" | "outline" | "solid";
  /** Control size. @default "md" */
  size?: "sm" | "md" | "lg";
  /** The icon node (e.g. a Lucide icon). */
  children?: React.ReactNode;
}

export function IconButton({
  children,
  label,
  variant = "ghost",
  size = "md",
  disabled = false,
  className = "",
  ...rest
}: IconButtonProps) {
  const cls = ["sa-iconbtn", `sa-iconbtn--${variant}`, `sa-iconbtn--${size}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      className={cls}
      aria-label={label}
      title={label}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
