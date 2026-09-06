"use client";

import { useState } from "react";
import Link from "next/link";
import { HOUSES } from "../houses";

/* ===========================================================================
   The Houses explorer
   ---------------------------------------------------------------------------
   The document compared the five Houses as a five-column table, which meant
   reading each House as a vertical slice and losing it as a whole. Here you
   pick a House and get it whole — and, because each House knows the region of
   campus it stands in, it can hand you straight to that chapter.
   =========================================================================== */

export default function HouseExplorer() {
  const [active, setActive] = useState(HOUSES[0].name);
  const house = HOUSES.find((h) => h.name === active)!;

  return (
    <div className={`gb-widget gb-houses gb-houses--${house.tone}`}>
      <div className="gb-widget__head">
        <span className="gb-widget__label">The five Houses</span>
      </div>

      <div className="gb-houses__tabs" role="tablist" aria-label="Houses">
        {HOUSES.map((h) => (
          <button
            key={h.name}
            type="button"
            role="tab"
            aria-selected={h.name === active}
            className={`gb-houses__tab gb-houses__tab--${h.tone}${
              h.name === active ? " is-active" : ""
            }`}
            onClick={() => setActive(h.name)}
          >
            <span className="gb-houses__tab-name">{h.name.replace(" House", "")}</span>
            <span className="gb-houses__tab-founder">{h.founder}</span>
          </button>
        ))}
      </div>

      <div className="gb-houses__panel" role="tabpanel">
        <header className="gb-houses__title">
          <h3>{house.name}</h3>
          <p className="gb-houses__beast">
            {house.beast}, <strong>{house.founder}</strong>
            {house.founderAka && <em> ({house.founderAka})</em>}
          </p>
        </header>

        <p className="gb-houses__building">{house.building}</p>

        <div className="gb-houses__traits">
          <section>
            <h4>Virtues</h4>
            <ul className="gb-houses__tags">
              {house.virtues.map((v) => (
                <li key={v} className="gb-tag gb-tag--virtue">
                  {v}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h4>May be</h4>
            <ul className="gb-houses__tags">
              {house.flaws.map((f) => (
                <li key={f} className="gb-tag gb-tag--flaw">
                  {f}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="gb-houses__links">
          <Link href={`/gamebook/world#${house.anchor}`}>
            Read {house.name} in full
          </Link>
          <Link href={`/gamebook/world#${house.locationAnchor}`}>
            Its grounds: {house.location}
          </Link>
        </footer>
      </div>
    </div>
  );
}
