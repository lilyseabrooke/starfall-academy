"use client";

import * as React from "react";

/**
 * The Academy's primary action control — gilded gold for the principal action,
 * a gold outline for secondary, ghost for quiet actions, crimson for destructive.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual emphasis. @default "primary" */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** Control height. @default "md" */
  size?: "sm" | "md" | "lg";
  /** Icon node rendered before the label (e.g. a Lucide icon). */
  iconLeft?: React.ReactNode;
  /** Icon node rendered after the label. */
  iconRight?: React.ReactNode;
  /** Stretch to the width of the container. @default false */
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  fullWidth = false,
  disabled = false,
  type = "button",
  className = "",
  ...rest
}: ButtonProps) {
  const cls = ["sa-btn", `sa-btn--${variant}`, `sa-btn--${size}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type={type}
      className={cls}
      disabled={disabled}
      style={fullWidth ? { width: "100%" } : undefined}
      {...rest}
    >
      {iconLeft ? <span className="sa-btn__icon">{iconLeft}</span> : null}
      {children}
      {iconRight ? <span className="sa-btn__icon">{iconRight}</span> : null}
    </button>
  );
}
