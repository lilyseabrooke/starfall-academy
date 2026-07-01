"use client";

import * as React from "react";

/** Crest PNGs are served from the vendored design-system assets in /public. */
const DEFAULT_BASE_PATH =
  "/_ds/starfall-academy-design-system-61fef24c-b8ee-469f-860f-a6fd95fb2a6e/assets";

/**
 * The Academy crest, rendered from a copied PNG asset. Choose the form that
 * suits the task and (optionally) recolor the line form to gold or ink.
 */
export interface CrestProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Which crest artwork. @default "simple" */
  form?: "full" | "simple" | "lines";
  /** Rendered height in px (number) or any CSS length (string). @default 64 */
  size?: number | string;
  /** Recolor filter — `gold` and `ink` are intended for the `lines` form. @default "none" */
  tint?: "none" | "gold" | "ink";
  /** Folder the crest PNGs were copied to. @default the vendored /public assets path */
  basePath?: string;
  /** Alt text. */
  alt?: string;
}

export function Crest({
  form = "simple",
  size = 64,
  tint = "none",
  basePath = DEFAULT_BASE_PATH,
  alt = "Starfall Academy crest",
  className = "",
  ...rest
}: CrestProps) {
  const cls = ["sa-crest", tint !== "none" ? `sa-crest--${tint}` : "", className]
    .filter(Boolean)
    .join(" ");
  const src = `${basePath}/crest-${form}.png`;
  return (
    <span className={cls} style={{ height: typeof size === "number" ? `${size}px` : size }} {...rest}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} />
    </span>
  );
}
