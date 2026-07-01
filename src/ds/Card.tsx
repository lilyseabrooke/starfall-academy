"use client";

import * as React from "react";

/**
 * The Academy's surface container. Default is a midnight panel; `gilded` adds a
 * gold leaf edge for hero content; `parchment` is the light scroll surface.
 */
export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Surface treatment. @default "default" */
  variant?: "default" | "gilded" | "parchment";
  /** Inner padding. @default "md" */
  padding?: "sm" | "md" | "lg";
  /** Lift on hover — use for clickable cards. @default false */
  interactive?: boolean;
  /** Optional gilded overline rendered above the title. */
  eyebrow?: React.ReactNode;
  /** Optional Spectral-caps title. */
  title?: React.ReactNode;
  children?: React.ReactNode;
}

export function Card({
  children,
  variant = "default",
  padding = "md",
  interactive = false,
  eyebrow,
  title,
  className = "",
  ...rest
}: CardProps) {
  const cls = [
    "sa-card",
    variant !== "default" ? `sa-card--${variant}` : "",
    `sa-card__pad-${padding}`,
    interactive ? "sa-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {eyebrow ? <div className="sa-card__eyebrow">{eyebrow}</div> : null}
      {title ? <h3 className="sa-card__title">{title}</h3> : null}
      {children}
    </div>
  );
}
