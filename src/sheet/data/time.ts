/* ===========================================================================
   Starfall Academy — shared campaign clock constants
   ---------------------------------------------------------------------------
   DAYS/BLOCKS were previously private to GmView.tsx; extracted so the
   player-side read-only TimeBadge (and the campaigns.time_* persistence)
   can share the exact same day/time-of-day vocabulary as the GM's clock.
   =========================================================================== */
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const BLOCKS = [
  { label: "Morning", icon: "sunrise" },
  { label: "Afternoon", icon: "sun" },
  { label: "Evening", icon: "sunset" },
  { label: "Night", icon: "moon" },
];
