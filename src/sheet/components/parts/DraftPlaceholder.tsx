"use client";

import * as React from "react";
import { Button, Crest } from "@/ds";
import { Icon } from "../Icon";

/** Placeholder for wings not yet redrawn in the new layout. `onBack` replaces
 *  the prototype's window.__sfGoOverview global. */
export function DraftPlaceholder({ wing, onBack }: { wing: string; onBack?: () => void }) {
  return (
    <div className="sf-draft">
      <div className="sf-draft__card">
        <Crest form="lines" size={84} tint="gold" className="crest" />
        <span className="sf-eyebrow">Coming to the app</span>
        <h2>{wing}</h2>
        <p>
          We&apos;re exploring the Overview first. The {wing} wing carries over from the existing sheet and will be
          redrawn in this new layout next.
        </p>
        <Button variant="secondary" iconLeft={<Icon name="arrow-left" />} onClick={() => onBack?.()}>
          Back to Overview
        </Button>
      </div>
    </div>
  );
}
