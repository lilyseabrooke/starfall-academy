"use client";

// TEMPORARY scratch route — renders the character sheet on seed data so the
// light theme can be compared against dark. ?theme=light flips it.
// Delete once the light theme ships.

import * as React from "react";
import { CharacterSheet } from "@/sheet/CharacterSheet";

export default function ThemePreviewPage() {
  React.useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("theme");
    if (t === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
  }, []);
  return <CharacterSheet mode="create" />;
}
