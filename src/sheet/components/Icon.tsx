"use client";

/* ===========================================================================
   Starfall Academy — icon
   ---------------------------------------------------------------------------
   Replaces the prototype's Lucide-UMD `Ic` wrapper (parts.jsx) with lucide-react.
   Same API: <Icon name="chevron-down" size className style />. Names are the
   kebab-case Lucide ids the sheet already uses; we map them to lucide-react's
   PascalCase component registry. Stroke defaults match SHARED.ICON_SVG_DEFAULTS.
   =========================================================================== */
import * as React from "react";
import { icons, type LucideProps } from "lucide-react";

const toPascal = (name: string) =>
  String(name)
    .split(/[-_]/)
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : ""))
    .join("");

export interface IconProps extends Omit<LucideProps, "ref"> {
  name: string;
  size?: number | string;
}

export function Icon({ name, size = "1em", strokeWidth = 1.85, ...rest }: IconProps) {
  const Cmp = (icons as Record<string, React.ComponentType<LucideProps>>)[toPascal(name)];
  if (!Cmp) {
    if (process.env.NODE_ENV !== "production") console.warn(`[Icon] unknown lucide icon: ${name}`);
    return null;
  }
  return <Cmp size={size} strokeWidth={strokeWidth} {...rest} />;
}
