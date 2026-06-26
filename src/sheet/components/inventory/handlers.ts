import type { Artifact, Glyph, Item, Plant, Potion, Recipe, Wand } from "../../types";

/** The inventory handler bundle the root wires up (useInventoryState handlers
 *  wrapped with the magic-state setters, plus app-level give/edit/compendium
 *  actions) and passes to the inventory cards as `h`. */
export interface InvHandlers {
  addToRune: (g: Glyph) => void;
  adjustMaterials: (delta: number) => void;
  attune: (art: Artifact, anchorEl: HTMLElement) => void;
  brew: (r: Recipe, anchorEl: HTMLElement) => void;
  clearRune: () => void;
  createRune: (anchorEl: HTMLElement) => void;
  discardPotion: (p: Potion) => void;
  editArtifact: (art: Artifact) => void;
  editGlyph: (g: Glyph) => void;
  editPlant: (pl: Plant) => void;
  editRecipe: (r: Recipe) => void;
  editWand: (w: Wand) => void;
  equipWand: (w: Wand) => void;
  give: (kind: string, item: unknown) => void;
  harvestPlant: (pl: Plant) => void;
  openCompendium: (cat?: string) => void;
  openManual: (kind: string, editItem?: unknown) => void;
  refreshAllPlants: () => void;
  refreshPlant: (pl: Plant) => void;
  removeArtifact: (art: Artifact) => void;
  removeFromRune: (i: number) => void;
  removeGlyph: (g: Glyph) => void;
  removeItem: (it: Item) => void;
  removePlant: (pl: Plant) => void;
  removeRecipe: (r: Recipe) => void;
  removeWand: (w: Wand) => void;
  repairArtifact: (art: Artifact, speed: "fast" | "medium" | "slow", anchorEl: HTMLElement) => void;
  repairWand: (w: Wand, anchorEl: HTMLElement) => void;
  setWandCondition: (w: Wand, value: number) => void;
  takePotion: (p: Potion, anchorEl: HTMLElement) => void;
  useItem: (it: Item, anchorEl?: HTMLElement | null) => void;
  usePlant: (pl: Plant, anchorEl: HTMLElement) => void;
}
