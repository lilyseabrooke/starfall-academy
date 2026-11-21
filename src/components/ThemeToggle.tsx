"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { nextThemePref, THEME_LABEL, useThemePref, type ThemePref } from "@/lib/theme";

const ICONS: Record<ThemePref, typeof Sun> = { dark: Moon, light: Sun, system: Monitor };

/**
 * Cycles the colour theme Dark → Light → System. Styling comes from the host
 * (sidebar nav item, HUD ghost button), so it takes the host's class names.
 */
export function ThemeToggle({
  className,
  labelClassName,
  label = "Theme",
  iconOnlyTitle = false,
}: {
  className?: string;
  labelClassName?: string;
  /** Prefix shown before the current value ("Theme: Light"). */
  label?: string;
  /** When the label is visually hidden (collapsed sidebar), expose it as a tooltip. */
  iconOnlyTitle?: boolean;
}) {
  const [pref, setPref] = useThemePref();
  const Ico = ICONS[pref];
  const next = nextThemePref(pref);
  const text = `${label}: ${THEME_LABEL[pref]}`;
  return (
    <button
      type="button"
      className={className}
      onClick={() => setPref(next)}
      title={iconOnlyTitle ? `${text} — switch to ${THEME_LABEL[next]}` : `Switch to ${THEME_LABEL[next]} theme`}
      aria-label={`${text}. Switch to ${THEME_LABEL[next]}.`}
    >
      <Ico aria-hidden="true" />
      <span className={labelClassName}>{text}</span>
    </button>
  );
}
