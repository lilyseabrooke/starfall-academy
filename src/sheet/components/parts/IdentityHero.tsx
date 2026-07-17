"use client";

import * as React from "react";
import { Badge } from "@/ds";
import { Icon } from "../Icon";
import { TONE_700 } from "../../data/shared";
import type { CharacterVitals } from "../../types";

const CREST_LINES = "/_ds/starfall-academy-design-system-61fef24c-b8ee-469f-860f-a6fd95fb2a6e/assets/crest-lines.png";

export function IdentityHero({ c }: { c: CharacterVitals; onEdit?: () => void }) {
  const heroTint = TONE_700[c.houseTone] || TONE_700.plum;
  const [bioExpanded, setBioExpanded] = React.useState(false);
  const [bioOverflows, setBioOverflows] = React.useState(false);
  const bioRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = bioRef.current;
    if (!el) return;
    const measure = () => setBioOverflows(el.scrollHeight - el.clientHeight > 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [c.bio, bioExpanded]);

  return (
    <section className="sf-hero" style={{ "--sf-hero-tint": heroTint } as React.CSSProperties}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="sf-hero__crest" src={CREST_LINES} alt="" />
      <div className="sf-hero__main">
        <span className="sf-eyebrow">{c.title}</span>
        <h1 className="sf-hero__name">{c.name}</h1>
        <div className="sf-hero__meta">
          <Badge tone={c.houseTone === "silver" ? "neutral" : c.houseTone} dot>{c.house}</Badge>
          <span className="sf-meta-dot" />
          <span className="sf-hero__metaitem"><b>Year</b> {c.year}</span>
          {c.pronouns ? (
            <React.Fragment>
              <span className="sf-meta-dot" />
              <span className="sf-hero__metaitem">{c.pronouns}</span>
            </React.Fragment>
          ) : null}
        </div>
        {c.bio ? (
          <div
            ref={bioRef}
            className={
              "sf-hero__bio-wrap" +
              (bioOverflows ? " sf-hero__bio-wrap--clamped" : "") +
              (bioExpanded ? " sf-hero__bio-wrap--expanded" : "")
            }
            onClick={() => setBioExpanded((v) => !v)}
            role={bioOverflows ? "button" : undefined}
            tabIndex={bioOverflows ? 0 : undefined}
            aria-expanded={bioOverflows ? bioExpanded : undefined}
            onKeyDown={(e) => {
              if (bioOverflows && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                setBioExpanded((v) => !v);
              }
            }}
          >
            <p className="sf-hero__bio">{c.bio}</p>
          </div>
        ) : null}
      </div>
      <div className="sf-hero__side">
        <div className="sf-materials">
          <Icon name="gem" />
          <span className="sf-materials__num">{c.materials.toLocaleString()}</span>
        </div>
        <span className="sf-materials__cap">Materials</span>
      </div>
    </section>
  );
}
