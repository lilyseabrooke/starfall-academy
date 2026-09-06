"use client";

import { useMemo, useState } from "react";
import { STATS, SUBJECT_FIELD, ABILITY_STAT } from "../stats";

/* ===========================================================================
   The Stats explorer
   ---------------------------------------------------------------------------
   In the document this was a merged-cell grid you had to read in both
   directions at once. Here it answers each direction on its own: pick a Stat
   to see what rolls with it, or look up an Ability to be told which Stat it
   uses — the lookup players actually need mid-game.
   =========================================================================== */

const FIELD_TONE: Record<string, string> = {
  "Creation Magics": "creation",
  "Natural Magics": "natural",
  "Spectral Magics": "spectral",
  "Wisdom Magics": "wisdom",
};

export default function StatsMatrix() {
  const [active, setActive] = useState(STATS[0].name);
  const [query, setQuery] = useState("");

  const stat = STATS.find((s) => s.name === active)!;

  /** Abilities matching the lookup box, with the Stat each one rolls with. */
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return Object.entries(ABILITY_STAT)
      .filter(([ability]) => ability.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query]);

  return (
    <div className="gb-widget gb-stats">
      <div className="gb-widget__head">
        <span className="gb-widget__label">The six Stats</span>
        <div className="gb-stats__lookup">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Which Stat does… roll with?"
            aria-label="Look up which Stat an Ability rolls with"
          />
          {matches.length > 0 && (
            <ul className="gb-stats__results">
              {matches.map(([ability, statName]) => (
                <li key={ability}>
                  <button
                    type="button"
                    onClick={() => {
                      setActive(statName);
                      setQuery("");
                    }}
                  >
                    <span className="gb-stats__result-ability">{ability}</span>
                    <span className="gb-stats__result-stat">{statName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="gb-stats__tabs" role="tablist" aria-label="Stats">
        {STATS.map((s) => (
          <button
            key={s.name}
            type="button"
            role="tab"
            aria-selected={s.name === active}
            className={`gb-stats__tab${s.name === active ? " is-active" : ""}`}
            onClick={() => setActive(s.name)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="gb-stats__panel" role="tabpanel">
        <p className="gb-stats__blurb">{stat.blurb}</p>

        <div className="gb-stats__cols">
          <section className="gb-stats__col">
            <h4>Subjects</h4>
            {stat.subjects.length === 0 ? (
              <p className="gb-stats__none">No Subject rolls with {stat.name}.</p>
            ) : (
              <ul className="gb-stats__abilities">
                {stat.subjects.map((sub) => (
                  <li key={sub}>
                    <span>{sub}</span>
                    <em className={`gb-field gb-field--${FIELD_TONE[SUBJECT_FIELD[sub]]}`}>
                      {SUBJECT_FIELD[sub].replace(" Magics", "")}
                    </em>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="gb-stats__col">
            <h4>Skills</h4>
            <ul className="gb-stats__abilities">
              {stat.skills.map((sk) => (
                <li key={sk}>
                  <span>{sk}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="gb-stats__col gb-stats__col--resist">
            <h4>Resists</h4>
            {stat.resists ? (
              <p className="gb-stats__resist">{stat.resists}</p>
            ) : (
              <p className="gb-stats__none">{stat.name} resists no Condition.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
