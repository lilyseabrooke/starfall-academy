"use client";

/* ===========================================================================
   Starfall Academy — campaign clock badge
   ---------------------------------------------------------------------------
   Shared between the GM dashboard (clickable — opens the Clock modal) and
   the player's own sheet (read-only — same look, no interaction), so both
   sides of the table always see the exact same day/time-of-day.
   =========================================================================== */
import { Icon } from "../Icon";
import { DAYS, BLOCKS } from "../../data/time";
import type { GmTime } from "../../data/gm-seed";

export interface TimeBadgeProps {
  time: GmTime;
  onClick?: () => void;
}

export function TimeBadge({ time, onClick }: TimeBadgeProps) {
  const icon = time.enabled ? BLOCKS[time.block].icon : "calendar";
  const value = time.enabled ? DAYS[time.day] + " " + BLOCKS[time.block].label : DAYS[time.day];
  const content = (
    <>
      <Icon name={icon} />
      <span className="gm-timebtn__txt">
        <span className="gm-timebtn__eyebrow">{time.enabled ? "Day · Time" : "Day"}</span>
        <span className="gm-timebtn__val">{value}</span>
      </span>
    </>
  );
  return onClick
    ? <button className="gm-timebtn" onClick={onClick}>{content}</button>
    : <div className="gm-timebtn gm-timebtn--readonly" aria-label={"Campaign time: " + value}>{content}</div>;
}
