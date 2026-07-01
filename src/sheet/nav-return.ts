"use client";

/* ===========================================================================
   Starfall Academy — "back" return-target tracking
   ---------------------------------------------------------------------------
   Jumping between character sheets (party roster) or from the GM dashboard
   to a player's sheet is a deliberate "hop," not a normal page navigation —
   the back button should return to where the hop CHAIN started, not to each
   intermediate stop. So: markJumpOrigin() records the current page only if
   nothing is already recorded (the first hop in a chain "wins" and every
   later hop in the same chain is silently skipped), and consumeReturnTarget()
   reads + clears it — so pressing back a second time (from the origin, which
   never recorded anything over itself) falls through to the /characters
   default instead of bouncing between intermediate sheets.
   =========================================================================== */
const KEY = "sf-nav-return-to";

export function markJumpOrigin(path: string) {
  try {
    if (!sessionStorage.getItem(KEY)) sessionStorage.setItem(KEY, path);
  } catch {
    /* sessionStorage unavailable (private mode, etc.) — back just falls through to /characters */
  }
}

export function consumeReturnTarget(): string | null {
  try {
    const v = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return v;
  } catch {
    return null;
  }
}
