"use client";

import * as React from "react";
import { Badge } from "@/ds";
import { Icon } from "../Icon";
import { accentOf } from "../../data/shared";
import type { Artifact } from "../../types";
import type { InvHandlers } from "./handlers";
import { CardMenu, ItemAct, condTone } from "./shared";
import { RepairMenu } from "./RepairMenu";

export function ArtifactCard({ art, attuneFull, h, open, onToggle }: { art: Artifact; attuneFull: boolean; h: InvHandlers; open: boolean; onToggle: () => void }) {
  const acc = accentOf(art.level);
  const blocked = !art.attuned && attuneFull;
  const needsRepair = art.condition !== "stable";
  const skills = art.skills && art.skills.length ? art.skills : art.move && art.move.skill && art.move.skill !== "—" ? [art.move.skill] : [];
  const dc = art.dc != null ? art.dc : art.move ? art.move.dc : null;
  const hasRoll = skills.length > 0;
  return (
    <div className={"sf-itm sf-art" + (acc.flat ? " is-flat" : "") + (art.attuned ? " is-attuned" : "") + (art.condition !== "stable" ? " is-" + art.condition : "") + (open ? " is-open" : " is-collapsed")} style={acc.style}>
      <div className="sf-itm__head" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle && onToggle()}>
        <span className="sf-itm__name">{art.name}</span>
        <Badge tone={acc.tone && acc.tone !== "silver" ? acc.tone : "neutral"} square>{art.level}</Badge>
        <button className="sf-itm__edit" title="Edit artifact" onClick={(e) => { e.stopPropagation(); h.editArtifact(art); }}><Icon name="pencil" /></button>
        <CardMenu onGive={() => h.give("artifact", art)} onRemove={() => h.removeArtifact(art)} />
        <span className="sf-itm__chev"><Icon name={open ? "chevron-up" : "chevron-down"} /></span>
      </div>
      <div className="sf-itm__chips">
        <span className="sf-chip sf-chip--field"><Icon name="sparkles" /> {art.subject}</span>
        {art.attuned ? (
          <span className="sf-chip sf-chip--ok"><Icon name="link" /> Attuned</span>
        ) : (
          <span className="sf-chip"><b>Intensity</b> {art.intensity}</span>
        )}
        <span className={"sf-chip sf-chip--cond t-" + condTone(art.condition)}>
          <Icon name={art.condition === "broken" ? "shield-x" : art.condition === "damaged" ? "shield-alert" : "shield-check"} /> {art.condition}
        </span>
      </div>
      {open && (
        <React.Fragment>
          <p className="sf-itm__desc">{art.desc}</p>
          {hasRoll ? (
            <div className="sf-art__wire">
              <div className="sf-art__roll">
                <Icon name="dices" />
                <span className="sf-art__roll-skill">{skills.join(" / ")}</span>
                <span className="sf-art__roll-dc">{dc != null ? "DC " + dc : "Opposed"}</span>
              </div>
              <Icon name="arrow-right" className="sf-art__wire-arrow" />
              <div className="sf-art__move">
                <Icon name="swords" />
                {art.attuned ? (
                  <span className="sf-art__move-state is-on">Move on your Overview <Icon name="check" /></span>
                ) : (
                  <span className="sf-art__move-state">attune to grant its Move</span>
                )}
              </div>
            </div>
          ) : (
            <div className="sf-itm__link">
              <Icon name="swords" /> {art.attuned ? <React.Fragment>Move <span className="sf-itm__link-on">on your Overview</span></React.Fragment> : <React.Fragment>Attune to grant its <b>Move</b></React.Fragment>}
            </div>
          )}
        </React.Fragment>
      )}
      <div className="sf-itm__foot sf-itm__foot--split">
        {art.attuned ? (
          <span className="sf-itm__note"><Icon name="check-circle" /> Attuned &amp; answering</span>
        ) : blocked ? (
          <span className="sf-itm__warn"><Icon name="lock" /> Attunement slots full</span>
        ) : (
          <ItemAct icon="dices" label="Attune" tone="gold" onClick={(e) => h.attune(art, e.currentTarget as HTMLElement)} />
        )}
        {needsRepair ? <RepairMenu art={art} h={h} /> : null}
      </div>
    </div>
  );
}
