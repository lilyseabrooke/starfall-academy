"use client";

import * as React from "react";
import { Button } from "@/ds";
import { Icon } from "../Icon";
import type { Artifact, Glyph, Item, Plant, Potion, Recipe, Wand } from "../../types";
import type { InvHandlers } from "./handlers";
import { EmptyShelf, LimitMeter, ShelfHead } from "./shared";
import { MaterialsBanner } from "./MaterialsBanner";
import { PotionLoadout } from "./Potions";
import { ItemCard, PlantCard, RecipeCard, WandCard } from "./Cards";
import { ArtifactCard } from "./ArtifactCard";
import { GlyphForge } from "./GlyphForge";

export interface InventoryCaps {
  potionCap: number;
  attuneCap: number;
  plantCap: number;
}

export interface InventoryPageProps {
  materials: number;
  caps: InventoryCaps;
  artifacts: Artifact[];
  potions: Potion[];
  recipes: Recipe[];
  plants: Plant[];
  wands: Wand[];
  glyphs: Glyph[];
  items: Item[];
  runeStack: Glyph[];
  h: InvHandlers;
}

function useOpenSet<T extends { id: string }>(list: T[]) {
  const [openIds, setOpenIds] = React.useState<Set<string>>(() => new Set());
  const allOpen = list.length > 0 && openIds.size === list.length;
  const toggleAll = () => setOpenIds(allOpen ? new Set() : new Set(list.map((x) => x.id)));
  const toggle = (id: string) =>
    setOpenIds((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return { openIds, allOpen, toggleAll, toggle };
}

export function InventoryPage({ materials, caps, artifacts, potions, recipes, plants, wands, glyphs, items, runeStack, h }: InventoryPageProps) {
  const heldCount = potions.reduce((s, p) => s + p.qty, 0);
  const heldFull = heldCount >= caps.potionCap;
  const knownRecipeNames = new Set(recipes.map((r) => r.name));
  const plantSum = plants.reduce((s, p) => s + (p.value || 0), 0);
  const attunedCount = artifacts.filter((a) => a.attuned).length;
  const attuneFull = attunedCount >= caps.attuneCap;
  const equippedWand = wands.find((w) => w.equipped);

  const art = useOpenSet(artifacts);
  const rec = useOpenSet(recipes);
  const wnd = useOpenSet(wands);
  const plt = useOpenSet(plants);
  const gly = useOpenSet(glyphs);
  const itm = useOpenSet(items);

  const shelf = (id: string) => () => document.getElementById("shelf-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const jump = [
    { id: "potions", label: "Potions", icon: "flask-conical", n: heldCount },
    { id: "artifacts", label: "Artifacts", icon: "gem", n: artifacts.length },
    { id: "wands", label: "Wands", icon: "wand-2", n: wands.length },
    { id: "plants", label: "Plants", icon: "leaf", n: plants.length },
    { id: "glyphs", label: "Glyphs", icon: "pen-tool", n: glyphs.length },
    { id: "items", label: "Items", icon: "package", n: items.length },
  ];

  return (
    <div className="sf-canvas sf-inv">
      <MaterialsBanner materials={materials} onAdjust={h.adjustMaterials} onGive={() => h.give("materials", null)} />

      <div className="sf-jump">
        {jump.map((j) => (
          <button key={j.id} className="sf-jump__btn" onClick={shelf(j.id)}>
            <Icon name={j.icon} /> {j.label}<span className="sf-jump__n">{j.n}</span>
          </button>
        ))}
      </div>

      <section className="sf-shelf" id="shelf-potions">
        <ShelfHead
          icon="flask-conical"
          eyebrow="Held vials & recipes"
          title="Potions"
          meter={<LimitMeter n={heldCount} cap={caps.potionCap} unit="held" over={false} />}
          onTake={(e) => h.takePotion({ id: "new", name: "New Potion", tone: "gold", intensity: 0, qty: 1, desc: "Metabolize a potion to work it through your system and be prepared sooner to pop the next one." }, e.currentTarget as HTMLElement)}
          onManual={() => h.openManual("potion")}
          onCompendium={() => h.openCompendium("potion")}
          disabledAdd={heldFull}
        />
        <div className="sf-sub">
          <div className="sf-sub__head"><span className="sf-sub__title"><Icon name="flask-conical" /> Potion Sheaf</span></div>
          <PotionLoadout potions={potions} cap={caps.potionCap} knownNames={knownRecipeNames} h={h} />
        </div>
        <div className="sf-sub">
          <div className="sf-sub__head">
            <span className="sf-sub__title"><Icon name="scroll-text" /> Potion Recipes</span>
            <span className="sf-sub__count">{recipes.length} known</span>
            <div className="sf-sub__actions">
              {recipes.length > 0 && <button className="sf-ghost-btn" onClick={rec.toggleAll}><Icon name={rec.allOpen ? "chevrons-up" : "chevrons-down"} /> {rec.allOpen ? "Collapse" : "Expand"}</button>}
              <button className="sf-ghost-btn" onClick={() => h.openManual("recipe")}><Icon name="pencil-line" /> Add recipe</button>
              <Button variant="primary" size="sm" iconLeft={<Icon name="book-open-text" />} onClick={() => h.openCompendium("potion")}>Compendium</Button>
            </div>
          </div>
          {recipes.length ? (
            <div className="sf-itemgrid">
              {recipes.map((r) => <RecipeCard key={r.id} r={r} heldFull={heldFull} h={h} open={rec.openIds.has(r.id)} onToggle={() => rec.toggle(r.id)} />)}
            </div>
          ) : (
            <EmptyShelf icon="scroll-text" text="No recipes learned yet." small />
          )}
        </div>
      </section>

      <section className="sf-shelf" id="shelf-artifacts">
        <ShelfHead
          icon="gem"
          eyebrow="Concentrated power"
          title="Artifacts"
          meter={<LimitMeter n={attunedCount} cap={caps.attuneCap} unit="attuned" over={false} />}
          onToggleAll={artifacts.length ? art.toggleAll : undefined}
          allOpen={art.allOpen}
          onManual={() => h.openManual("artifact")}
          onCompendium={() => h.openCompendium("artifact")}
        />
        <p className="sf-shelf__rule-note"><Icon name="info" /> Any number may be carried; you can attune to <b>{caps.attuneCap}</b> at once (3 + 1 per 5 ranks of Artificy). Use Attune to attempt an attunement, and Repair to fix a damaged artifact.</p>
        {artifacts.length ? (
          <div className="sf-itemgrid">
            {artifacts.map((a) => <ArtifactCard key={a.id} art={a} attuneFull={attuneFull} h={h} open={art.openIds.has(a.id)} onToggle={() => art.toggle(a.id)} />)}
          </div>
        ) : (
          <EmptyShelf icon="gem" text="No artifacts yet." />
        )}
      </section>

      <section className="sf-shelf" id="shelf-wands">
        <ShelfHead
          icon="wand-2"
          eyebrow="Casting channel"
          title="Wands"
          meter={<span className="sf-equipread">{equippedWand ? <React.Fragment><Icon name="check-circle" /> {equippedWand.name}</React.Fragment> : <React.Fragment><Icon name="circle-dashed" /> none equipped</React.Fragment>}</span>}
          onToggleAll={wands.length ? wnd.toggleAll : undefined}
          allOpen={wnd.allOpen}
          onManual={() => h.openManual("wand")}
          onCompendium={() => h.openCompendium("wand")}
        />
        <p className="sf-shelf__rule-note"><Icon name="info" /> Carry any number, but only <b>one</b> can be equipped at a time.</p>
        {wands.length ? (
          <div className="sf-itemgrid">
            {wands.map((w) => <WandCard key={w.id} w={w} h={h} open={wnd.openIds.has(w.id)} onToggle={() => wnd.toggle(w.id)} />)}
          </div>
        ) : (
          <EmptyShelf icon="wand-2" text="No wands in the satchel yet." />
        )}
      </section>

      <section className="sf-shelf" id="shelf-plants">
        <ShelfHead
          icon="leaf"
          eyebrow="Cultivation"
          title="Plants"
          meter={<LimitMeter n={plantSum} cap={caps.plantCap} unit="value" over={plantSum > caps.plantCap} />}
          onRefreshAll={h.refreshAllPlants}
          onToggleAll={plants.length ? plt.toggleAll : undefined}
          allOpen={plt.allOpen}
          onManual={() => h.openManual("plant")}
          onCompendium={() => h.openCompendium("plant")}
        />
        <p className="sf-shelf__rule-note"><Icon name="info" /> Total Material value may not exceed <b>{caps.plantCap}</b> (50 × your Herbalism rank) materials&apos; worth of plants. Use a plant&apos;s ability, or harvest it to collect materials.</p>
        {plants.length ? (
          <div className="sf-itemgrid">
            {plants.map((pl) => <PlantCard key={pl.id} pl={pl} h={h} open={plt.openIds.has(pl.id)} onToggle={() => plt.toggle(pl.id)} />)}
          </div>
        ) : (
          <EmptyShelf icon="leaf" text="No plants yet." />
        )}
      </section>

      <section className="sf-shelf" id="shelf-glyphs">
        <ShelfHead icon="pen-tool" eyebrow="Compose a rune" title="Glyphs" onManual={() => h.openManual("glyph")} onCompendium={() => h.openCompendium("glyph")} />
        <p className="sf-shelf__rule-note"><Icon name="info" /> Stack glyphs into the forge to build a rune, then roll <b>Runology</b> and then roll to inscribe it.</p>
        {glyphs.length ? (
          <GlyphForge glyphs={glyphs} runeStack={runeStack} h={h} glyphOpenIds={gly.openIds} toggleGlyph={gly.toggle} toggleAllGlyphs={gly.toggleAll} allGlyphsOpen={gly.allOpen} />
        ) : (
          <EmptyShelf icon="pen-tool" text="No glyphs yet." />
        )}
      </section>

      <section className="sf-shelf" id="shelf-items">
        <ShelfHead icon="package" eyebrow="Everything else" title="Items" onToggleAll={items.length ? itm.toggleAll : undefined} allOpen={itm.allOpen} onManual={() => h.openManual("item")} onCompendium={() => h.openCompendium("item")} />
        {items.length ? (
          <div className="sf-itemgrid">
            {items.map((it) => <ItemCard key={it.id} it={it} h={h} open={itm.openIds.has(it.id)} onToggle={() => itm.toggle(it.id)} />)}
          </div>
        ) : (
          <EmptyShelf icon="package" text="No items yet." small />
        )}
      </section>
    </div>
  );
}
