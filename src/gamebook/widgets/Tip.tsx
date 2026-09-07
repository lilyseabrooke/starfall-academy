"use client";

import * as React from "react";

/* ===========================================================================
   A hover/focus detail bubble.
   ---------------------------------------------------------------------------
   Every number on a roll card can explain itself: what a die face means, what
   a modifier is, how the degrees were counted. That is a lot of small
   explanations, so this stays CSS-driven — the bubble is in the DOM and the
   stylesheet reveals it — rather than a popover per number.

   The trigger is focusable so a keyboard reaches the same detail, and the
   bubble is wired up with aria-describedby so a screen reader gets it as the
   description of the thing it explains rather than as loose text.
   =========================================================================== */

export default function Tip({
  detail,
  className,
  children,
}: {
  detail: string;
  className?: string;
  children: React.ReactNode;
}) {
  const id = React.useId();

  return (
    <span className={`gb-tip${className ? " " + className : ""}`} tabIndex={0} aria-describedby={id}>
      {children}
      <span className="gb-tip__bubble" role="tooltip" id={id}>
        {detail}
      </span>
    </span>
  );
}
