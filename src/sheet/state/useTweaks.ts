"use client";

/* ===========================================================================
   Starfall Academy — tweaks state
   ---------------------------------------------------------------------------
   Ported from the useTweaks hook in public/character-sheet/tweaks-panel.jsx.
   Holds display tweak values (toast position, stack cap, ladder density, …).

   Change from the prototype: the original also postMessaged the Design host
   (__edit_mode_set_keys) to rewrite an on-disk defaults block — a dev-tooling
   feature with no host in the native app, so it is dropped. The same-window
   `tweakchange` event is preserved for in-page listeners.
   =========================================================================== */
import * as React from "react";

export type TweakValues = Record<string, unknown>;
export type SetTweak<T extends TweakValues> = (keyOrEdits: keyof T | Partial<T>, val?: unknown) => void;

export function useTweaks<T extends TweakValues>(defaults: T): [T, SetTweak<T>] {
  const [values, setValues] = React.useState<T>(defaults);

  // Accepts setTweak('key', value) or setTweak({ key: value, ... }).
  const setTweak = React.useCallback<SetTweak<T>>((keyOrEdits, val) => {
    const edits =
      typeof keyOrEdits === "object" && keyOrEdits !== null
        ? (keyOrEdits as Partial<T>)
        : ({ [keyOrEdits as keyof T]: val } as Partial<T>);
    setValues((prev) => ({ ...prev, ...edits }));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tweakchange", { detail: edits }));
    }
  }, []);

  return [values, setTweak];
}
