"use client";

import * as React from "react";

/**
 * An inline message / alert. Tones map to the semantic palette (info=teal,
 * success=forest, warning=gold, danger=crimson, arcane=plum). Pass `onDismiss`
 * to render a close button.
 */
export interface BannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Semantic tone. @default "info" */
  tone?: "info" | "success" | "warning" | "danger" | "arcane";
  /** Bold Spectral-caps title line. */
  title?: React.ReactNode;
  /** Leading icon node. */
  icon?: React.ReactNode;
  /** Called when the close button is clicked; omit to hide the button. */
  onDismiss?: () => void;
  children?: React.ReactNode;
}

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export function Banner({
  tone = "info",
  title,
  icon,
  children,
  onDismiss,
  className = "",
  ...rest
}: BannerProps) {
  return (
    <div className={["sa-banner", `sa-banner--${tone}`, className].filter(Boolean).join(" ")} role="status" {...rest}>
      {icon ? <span className="sa-banner__icon">{icon}</span> : null}
      <div className="sa-banner__body">
        {title ? <span className="sa-banner__title">{title}</span> : null}
        {children ? <span className="sa-banner__msg">{children}</span> : null}
      </div>
      {onDismiss ? (
        <button type="button" className="sa-banner__close" aria-label="Dismiss" onClick={onDismiss}>
          <CloseIcon />
        </button>
      ) : null}
    </div>
  );
}
