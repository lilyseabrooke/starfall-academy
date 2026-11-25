"use client";

/* ===========================================================================
   Mapmaker — inspector: forms for everything the dossier shows, plus the
   numbers behind each handle on the canvas. Edits go through `edit`, which
   coalesces keystrokes in one field into a single undo step.
   =========================================================================== */
import * as React from "react";
import { GENERIC_TYPES, HOUSE_COLORS, SUB_TAG_LETTERS, slugOf, type LoreJson, type MapJson, type Problem, type SubAreaJson } from "../format";
import {
  blankZone, legendIds, newCentrepiece, newDistrict, renameAreaId, renameDistrict, renameZone, uniqueId, type Sel,
} from "./model";

export type EditFn = (fn: (d: MapJson) => void, coalesce?: string) => void;

export interface InspectorProps {
  doc: MapJson;
  sel: Sel;
  problems: Problem[];
  edit: EditFn;
  onSelect: (s: Sel) => void;
}

export function Inspector({ doc, sel, problems, edit, onSelect }: InspectorProps) {
  const mine = problems.filter((p) => pathSel(p.path, sel));
  return (
    <div className="mm-insp">
      {mine.length > 0 && (
        <ul className="mm-insp__problems">
          {mine.map((p, k) => <li key={k} className={"is-" + p.level}>{p.message}</li>)}
        </ul>
      )}
      <Body doc={doc} sel={sel} edit={edit} onSelect={onSelect} />
    </div>
  );
}

/** Does a validator path belong to the selected thing (for inline problems)? */
function pathSel(path: string, s: Sel): boolean {
  switch (s.kind) {
    case "map": return !/^(regions|centrepiece|pois)/.test(path);
    case "region": return new RegExp(`^regions\\[${s.i}\\](?!\\.submap\\.subs\\[)`).test(path);
    case "zone": return s.owner === "region"
      ? path.startsWith(`regions[${s.i}].submap.subs[${s.k}]`)
      : path.startsWith(`centrepiece.districts[${s.i}].subs[${s.k}]`);
    case "poi": return path.startsWith(`pois[${s.i}]`);
    case "centrepiece": return /^centrepiece(?!\.(districts|specials)\[)/.test(path);
    case "district": return new RegExp(`^centrepiece\\.districts\\[${s.i}\\](?!\\.subs\\[)`).test(path);
    case "special": return path.startsWith(`centrepiece.specials[${s.i}]`);
    case "outline": return path.startsWith(`outline[${s.v}]`);
  }
}

function Body({ doc, sel, edit, onSelect }: { doc: MapJson; sel: Sel; edit: EditFn; onSelect: (s: Sel) => void }) {
  switch (sel.kind) {
    case "map": return <MapForm doc={doc} edit={edit} onSelect={onSelect} />;
    case "outline": {
      const p = doc.outline[sel.v];
      if (!p) return null;
      return (
        <Section title={`Outline vertex ${sel.v + 1} of ${doc.outline.length}`}>
          <Row><Num label="x" value={p[0]} onChange={(v) => edit((d) => { d.outline[sel.v][0] = v; }, `ov${sel.v}x`)} />
            <Num label="y" value={p[1]} onChange={(v) => edit((d) => { d.outline[sel.v][1] = v; }, `ov${sel.v}y`)} /></Row>
          <button type="button" className="mm-btn mm-btn--danger" disabled={doc.outline.length <= 3}
            onClick={() => { edit((d) => { d.outline.splice(sel.v, 1); }); onSelect({ kind: "map" }); }}>Delete vertex</button>
          <p className="mm-hint">On the canvas: drag a vertex, click an edge to add one, Alt-click a vertex to delete it.</p>
        </Section>
      );
    }
    case "region": {
      const r = doc.regions[sel.i];
      if (!r) return null;
      const key = `r${sel.i}`;
      return (
        <>
          <Section title="Region">
            <IdField value={r.id} taken={legendIds(doc).filter((x) => x !== r.id)}
              onCommit={(v) => edit((d) => renameAreaId(d, r.id, v))} />
            <LoreForm lore={r} k={key} edit={edit} get={(d) => d.regions[sel.i]} />
          </Section>
          <Section title="World seed">
            <Row>
              <Num label="x" value={r.seed.x} onChange={(v) => edit((d) => { d.regions[sel.i].seed.x = v; }, key + "sx")} />
              <Num label="y" value={r.seed.y} onChange={(v) => edit((d) => { d.regions[sel.i].seed.y = v; }, key + "sy")} />
              <Num label="weight" value={r.seed.w} onChange={(v) => edit((d) => { d.regions[sel.i].seed.w = v; }, key + "sw")} />
            </Row>
            <Row>
              <Num label="label dx" value={r.seed.ldx} onChange={(v) => edit((d) => { d.regions[sel.i].seed.ldx = v; }, key + "ldx")} />
              <Num label="label dy" value={r.seed.ldy} onChange={(v) => edit((d) => { d.regions[sel.i].seed.ldy = v; }, key + "ldy")} />
            </Row>
            <Check label="Always split the label onto two lines" value={!!r.seed.splitLabel}
              onChange={(v) => edit((d) => { if (v) d.regions[sel.i].seed.splitLabel = true; else delete d.regions[sel.i].seed.splitLabel; })} />
          </Section>
          <Section title={`Zones (${r.submap.subs.length} of 6)`}>
            <ZoneList subs={r.submap.subs} onPick={(k) => onSelect({ kind: "zone", owner: "region", i: sel.i, k })} />
            <button type="button" className="mm-btn" disabled={r.submap.subs.length >= 6}
              onClick={() => { edit((d) => { d.regions[sel.i].submap.subs.push(blankZone(500, 380, `Zone ${SUB_TAG_LETTERS[d.regions[sel.i].submap.subs.length]}`)); }); }}>Add zone</button>
            <p className="mm-hint">Zones are drawn inside the region&apos;s live world cell. Double-click the region on the canvas to place them.</p>
          </Section>
          <Danger label="Delete region" disabled={doc.regions.length <= 1} onClick={() => {
            edit((d) => { d.regions.splice(sel.i, 1); if (d.legendOrder) d.legendOrder = d.legendOrder.filter((x) => x !== r.id); });
            onSelect({ kind: "map" });
          }} />
        </>
      );
    }
    case "zone": {
      const isRegion = sel.owner === "region";
      const subs = isRegion ? doc.regions[sel.i]?.submap.subs : doc.centrepiece?.districts[sel.i]?.subs;
      const a = subs?.[sel.k];
      if (!a) return null;
      const get = (d: MapJson): SubAreaJson => (isRegion ? d.regions[sel.i].submap.subs[sel.k] : d.centrepiece!.districts[sel.i].subs[sel.k]);
      const key = `z${sel.owner}${sel.i}.${sel.k}`;
      const ownerName = isRegion ? doc.regions[sel.i].name : doc.centrepiece!.districts[sel.i].name;
      return (
        <>
          <Section title={`Zone ${SUB_TAG_LETTERS[sel.k]} · ${ownerName}`}>
            <Text label="Name" value={a.name ?? ""} onChange={(v) => edit((d) => renameZone(d, sel.owner, sel.i, sel.k, v || null), key + "n")} />
            <Area label="Blurb" value={a.blurb ?? ""} onChange={(v) => edit((d) => { get(d).blurb = v || null; }, key + "b")} />
            {!isRegion && (
              <>
                <Select label="Generic type (used when unnamed / no blurb)" value={a.generic ?? ""} options={["", ...GENERIC_TYPES]}
                  onChange={(v) => edit((d) => { get(d).generic = v || null; })} />
                <Check label="Shown on the map" value={a.on} onChange={(v) => edit((d) => { get(d).on = v; })} />
              </>
            )}
          </Section>
          <Section title="Placement (district-field space, 1000×760)">
            <Row>
              <Num label="x" value={a.x} onChange={(v) => edit((d) => { get(d).x = v; }, key + "x")} />
              <Num label="y" value={a.y} onChange={(v) => edit((d) => { get(d).y = v; }, key + "y")} />
              <Num label="weight" value={a.w} onChange={(v) => edit((d) => { get(d).w = v; }, key + "w")} />
            </Row>
            <Row>
              <Num label="label dx" value={a.lx} onChange={(v) => edit((d) => { get(d).lx = v; }, key + "lx")} />
              <Num label="label dy" value={a.ly} onChange={(v) => edit((d) => { get(d).ly = v; }, key + "ly")} />
            </Row>
          </Section>
          {isRegion && (
            <Danger label="Delete zone" disabled={subs!.length <= 1} onClick={() => {
              edit((d) => { d.regions[sel.i].submap.subs.splice(sel.k, 1); });
              onSelect({ kind: "region", i: sel.i });
            }} note="Later zones move up a letter, which changes their whereabouts ids." />
          )}
        </>
      );
    }
    case "poi": {
      const q = doc.pois[sel.i];
      if (!q) return null;
      const key = `p${sel.i}`;
      const target = q.link.region ? "r:" + q.link.region : q.link.district ? "d:" + q.link.district : "";
      const zones = q.link.region
        ? doc.regions.find((r) => r.id === q.link.region)?.submap.subs
        : doc.centrepiece?.districts.find((d) => slugOf(d.name) === q.link.district)?.subs;
      return (
        <>
          <Section title="Point of interest">
            <Text label="Id" value={q.id} onChange={(v) => edit((d) => { d.pois[sel.i].id = v; }, key + "id")} />
            <Text label="Name" value={q.name} onChange={(v) => edit((d) => { d.pois[sel.i].name = v; }, key + "n")} />
            <Row>
              <Num label="x" value={q.x} onChange={(v) => edit((d) => { d.pois[sel.i].x = v; }, key + "x")} />
              <Num label="y" value={q.y} onChange={(v) => edit((d) => { d.pois[sel.i].y = v; }, key + "y")} />
            </Row>
          </Section>
          <Section title="Opens">
            <Select label="Area" value={target}
              options={["", ...doc.regions.map((r) => "r:" + r.id), ...(doc.centrepiece?.districts.map((d) => "d:" + slugOf(d.name)) ?? [])]}
              labels={(o) => o === "" ? "—" : o.startsWith("r:") ? doc.regions.find((r) => "r:" + r.id === o)?.name ?? o
                : (doc.centrepiece!.name + " › " + (doc.centrepiece!.districts.find((d) => "d:" + slugOf(d.name) === o)?.name ?? o))}
              onChange={(v) => edit((d) => { d.pois[sel.i].link = v.startsWith("r:") ? { region: v.slice(2) } : v.startsWith("d:") ? { district: v.slice(2) } : {}; })} />
            <Select label="Zone" value={q.link.zone ?? ""} options={["", ...(zones ?? []).map((z) => z.name).filter((n): n is string => !!n)]}
              labels={(o) => o || "(the whole area)"}
              onChange={(v) => edit((d) => { if (v) d.pois[sel.i].link.zone = v; else delete d.pois[sel.i].link.zone; })} />
          </Section>
          <Danger label="Delete POI" onClick={() => { edit((d) => { d.pois.splice(sel.i, 1); }); onSelect({ kind: "map" }); }} />
        </>
      );
    }
    case "centrepiece": {
      const c = doc.centrepiece;
      if (!c) {
        return (
          <Section title="Centrepiece">
            <p className="mm-hint">This map has no shield-shaped centrepiece (like the campus&apos;s Citadel).</p>
            <button type="button" className="mm-btn" onClick={() => edit((d) => {
              const nc = newCentrepiece(d.field);
              nc.id = uniqueId(nc.id, legendIds(d));
              d.centrepiece = nc;
            })}>Add a centrepiece</button>
          </Section>
        );
      }
      return (
        <>
          <Section title="Centrepiece">
            <IdField value={c.id} taken={legendIds(doc).filter((x) => x !== c.id)} onCommit={(v) => edit((d) => renameAreaId(d, c.id, v))} />
            <LoreForm lore={c} k="c" edit={edit} get={(d) => d.centrepiece!} />
          </Section>
          <Section title="On the world map">
            <Text label="Label lines (one per line)" multiline value={c.label.join("\n")}
              onChange={(v) => edit((d) => { d.centrepiece!.label = v.split("\n"); }, "clabel")} />
            <Text label="Legend eyebrow" value={c.eyebrow} onChange={(v) => edit((d) => { d.centrepiece!.eyebrow = v; }, "ceye")} />
            <Text label="District dossier 'house' line" value={c.districtHouse} onChange={(v) => edit((d) => { d.centrepiece!.districtHouse = v; }, "cdh")} />
            <Row>
              {(["cx", "top", "hw", "h"] as const).map((k) => (
                <Num key={k} label={k} value={c.place[k]} onChange={(v) => edit((d) => { d.centrepiece!.place[k] = v; }, "cp" + k)} />
              ))}
            </Row>
          </Section>
          <Section title="Shield shape">
            {(["spike", "shoulder", "side"] as const).map((k) => (
              <Slider key={k} label={k} value={c.opts[k]} min={k === "shoulder" ? -0.2 : 0} max={k === "side" ? 0.8 : 0.3} step={0.005}
                onChange={(v) => edit((d) => { d.centrepiece!.opts[k] = v; }, "co" + k)} />
            ))}
            <Row>
              {(["cx", "top", "hw", "h"] as const).map((k) => (
                <Num key={k} label={"shield " + k} value={c.shield[k]} onChange={(v) => edit((d) => { d.centrepiece!.shield[k] = v; }, "cs" + k)} />
              ))}
            </Row>
          </Section>
          <Section title={`Districts (${c.districts.length})`}>
            <button type="button" className="mm-btn" onClick={() => {
              const n = c.districts.length + 1;
              edit((d) => { d.centrepiece!.districts.push(newDistrict(`New District ${n}`, String(n).padStart(2, "0"), c.shield.cx, c.shield.top + c.shield.h / 2)); });
              onSelect({ kind: "district", i: c.districts.length });
            }}>Add district</button>
            <button type="button" className="mm-btn" disabled={!c.districts.length} onClick={() => {
              const t = c.districts[0];
              edit((d) => { d.centrepiece!.specials.push({ name: "New Location", x: Math.round(c.shield.cx + c.shield.hw * 0.4), y: Math.round(c.shield.top + c.shield.h * 0.15), blurb: "", link: { district: slugOf(t.name), zone: "A" } }); });
              onSelect({ kind: "special", i: c.specials.length });
            }}>Add special location</button>
          </Section>
          <Danger label="Remove centrepiece" onClick={() => {
            edit((d) => {
              d.centrepiece = null;
              d.pois = d.pois.filter((p) => !p.link.district);
              if (d.legendOrder) d.legendOrder = d.legendOrder.filter((x) => x !== c.id);
            });
            onSelect({ kind: "map" });
          }} note="Also removes POIs that open one of its districts." />
        </>
      );
    }
    case "district": {
      const c = doc.centrepiece, t = c?.districts[sel.i];
      if (!c || !t) return null;
      const key = `d${sel.i}`;
      const get = (d: MapJson) => d.centrepiece!.districts[sel.i];
      return (
        <>
          <Section title={`District · ${c.name}`}>
            <Text label="Name" value={t.name} onChange={(v) => edit((d) => renameDistrict(d, sel.i, v), key + "n")} />
            <p className="mm-hint">Slug (used in whereabouts ids): <code>{slugOf(t.name) || "—"}</code></p>
            <Row>
              <Text label="Ledger no." value={t.tag} onChange={(v) => edit((d) => { get(d).tag = v; }, key + "t")} />
              <Color label="Colour" value={t.color} onChange={(v) => edit((d) => { get(d).color = v; }, key + "c")} />
            </Row>
            <Area label="Blurb" value={t.blurb} onChange={(v) => edit((d) => { get(d).blurb = v; }, key + "b")} />
          </Section>
          <Section title="Seed (shield space)">
            <Row>
              <Num label="x" value={t.x} onChange={(v) => edit((d) => { get(d).x = v; }, key + "x")} />
              <Num label="y" value={t.y} onChange={(v) => edit((d) => { get(d).y = v; }, key + "y")} />
              <Num label="weight" value={t.w} onChange={(v) => edit((d) => { get(d).w = v; }, key + "w")} />
            </Row>
            <Row>
              <Num label="label dx" value={t.labelDx} onChange={(v) => edit((d) => { get(d).labelDx = v; }, key + "lx")} />
              <Num label="label dy" value={t.labelDy} onChange={(v) => edit((d) => { get(d).labelDy = v; }, key + "ly")} />
            </Row>
          </Section>
          <Section title="Zones A–F">
            <ZoneList subs={t.subs} onPick={(k) => onSelect({ kind: "zone", owner: "district", i: sel.i, k })} showOff />
            <p className="mm-hint">Double-click the district on the canvas to place its zones.</p>
          </Section>
          <Danger label="Delete district" disabled={c.districts.length <= 1} onClick={() => {
            const slug = slugOf(t.name);
            edit((d) => {
              d.centrepiece!.districts.splice(sel.i, 1);
              d.pois = d.pois.filter((p) => p.link.district !== slug);
            });
            onSelect({ kind: "centrepiece" });
          }} note="Also removes POIs that open it; special locations pointing at it will show as problems." />
        </>
      );
    }
    case "special": {
      const c = doc.centrepiece, s = c?.specials[sel.i];
      if (!c || !s) return null;
      const key = `s${sel.i}`;
      const zones = c.districts.find((d) => slugOf(d.name) === s.link.district)?.subs ?? [];
      return (
        <>
          <Section title="Special location">
            <Text label="Name" value={s.name} onChange={(v) => edit((d) => { d.centrepiece!.specials[sel.i].name = v; }, key + "n")} />
            <Area label="Blurb" value={s.blurb} onChange={(v) => edit((d) => { d.centrepiece!.specials[sel.i].blurb = v; }, key + "b")} />
            <Row>
              <Num label="x" value={s.x} onChange={(v) => edit((d) => { d.centrepiece!.specials[sel.i].x = v; }, key + "x")} />
              <Num label="y" value={s.y} onChange={(v) => edit((d) => { d.centrepiece!.specials[sel.i].y = v; }, key + "y")} />
            </Row>
          </Section>
          <Section title="Opens">
            <Select label="District" value={s.link.district} options={c.districts.map((d) => slugOf(d.name))}
              labels={(o) => c.districts.find((d) => slugOf(d.name) === o)?.name ?? o}
              onChange={(v) => edit((d) => { d.centrepiece!.specials[sel.i].link.district = v; })} />
            <Select label="Zone" value={s.link.zone} options={[...SUB_TAG_LETTERS]}
              labels={(o) => { const z = zones[SUB_TAG_LETTERS.indexOf(o as "A")]; return `${o} · ${z?.name || z?.generic || "unnamed"}${z && !z.on ? " (off)" : ""}`; }}
              onChange={(v) => edit((d) => { d.centrepiece!.specials[sel.i].link.zone = v; })} />
          </Section>
          <Danger label="Delete special location" onClick={() => { edit((d) => { d.centrepiece!.specials.splice(sel.i, 1); }); onSelect({ kind: "centrepiece" }); }} />
        </>
      );
    }
  }
}

function MapForm({ doc, edit, onSelect }: { doc: MapJson; edit: EditFn; onSelect: (s: Sel) => void }) {
  return (
    <>
      <Section title="Map">
        <Text label="Id (file name and baked module name)" value={doc.id} onChange={(v) => edit((d) => { d.id = v; }, "id")} />
        <Text label="Name (breadcrumb root)" value={doc.name} onChange={(v) => edit((d) => { d.name = v; }, "name")} />
        <Text label="Legend eyebrow" value={doc.eyebrow} onChange={(v) => edit((d) => { d.eyebrow = v; }, "eyebrow")} />
        <Text label="Legend title" value={doc.title} onChange={(v) => edit((d) => { d.title = v; }, "title")} />
        <Text label="Field watermark image" value={doc.watermark} onChange={(v) => edit((d) => { d.watermark = v; }, "wm")} />
      </Section>
      <Section title="Field and framing">
        <Row>
          <Num label="field w" value={doc.field[0]} onChange={(v) => edit((d) => { d.field[0] = v; }, "fw")} />
          <Num label="field h" value={doc.field[1]} onChange={(v) => edit((d) => { d.field[1] = v; }, "fh")} />
        </Row>
        <Row>
          {(["w", "h", "tx", "ty"] as const).map((k) => (
            <Num key={k} label={"fit " + k} value={doc.fit[k]} onChange={(v) => edit((d) => { d.fit[k] = v; }, "fit" + k)} />
          ))}
        </Row>
        <p className="mm-hint">Fit: the box that must fit on screen, a horizontal nudge in screen px, and a vertical nudge in map units. Check it in Preview.</p>
      </Section>
      <Section title="Add">
        <button type="button" className="mm-btn" onClick={() => {
          const ids = legendIds(doc);
          const id = uniqueId("region", ids);
          edit((d) => {
            d.regions.push({
              id, name: "New Region", house: "", crest: "", house_color: "meadow", sector: "", coord: "", tagline: "", blurb: "",
              facts: [["Terrain", ""]], seed: { x: Math.round(d.field[0] / 2), y: Math.round(d.field[1] / 2), w: 0, ldx: 0, ldy: 0 },
              submap: { view: [1000, 760], outline: d.regions[0]?.submap.outline ?? [[130, 170], [880, 200], [840, 620], [120, 500]], subs: [blankZone(500, 380, "Zone A")] },
            });
            if (d.legendOrder) d.legendOrder.push(id);
          });
          onSelect({ kind: "region", i: doc.regions.length });
        }}>Region</button>
        <button type="button" className="mm-btn" disabled={!doc.regions.length} onClick={() => {
          const id = uniqueId("poi", doc.pois.map((p) => p.id));
          edit((d) => { d.pois.push({ id, name: "New Place", x: Math.round(d.field[0] / 2), y: Math.round(d.field[1] / 2), link: { region: d.regions[0].id } }); });
          onSelect({ kind: "poi", i: doc.pois.length });
        }}>Point of interest</button>
        <button type="button" className="mm-btn" onClick={() => onSelect({ kind: "centrepiece" })}>{doc.centrepiece ? "Centrepiece…" : "Centrepiece"}</button>
      </Section>
    </>
  );
}

function LoreForm<T extends LoreJson>({ lore, k, edit, get }: { lore: T; k: string; edit: EditFn; get: (d: MapJson) => LoreJson }) {
  return (
    <>
      <Text label="Name" value={lore.name} onChange={(v) => edit((d) => { get(d).name = v; }, k + "name")} />
      <Row>
        <Text label="House" value={lore.house} onChange={(v) => edit((d) => { get(d).house = v; }, k + "house")} />
        <Select label="Colour" value={lore.house_color} options={[...HOUSE_COLORS]} onChange={(v) => edit((d) => { get(d).house_color = v; })} />
      </Row>
      <Row>
        <Text label="Crest" value={lore.crest} onChange={(v) => edit((d) => { get(d).crest = v; }, k + "crest")} />
        <Text label="Sector" value={lore.sector} onChange={(v) => edit((d) => { get(d).sector = v; }, k + "sector")} />
      </Row>
      <Row>
        <Text label="Coordinates" value={lore.coord} onChange={(v) => edit((d) => { get(d).coord = v; }, k + "coord")} />
        <Text label="Tagline" value={lore.tagline} onChange={(v) => edit((d) => { get(d).tagline = v; }, k + "tag")} />
      </Row>
      <Area label="Blurb" value={lore.blurb} onChange={(v) => edit((d) => { get(d).blurb = v; }, k + "blurb")} />
      <div className="mm-field">
        <span className="mm-field__label">Facts</span>
        {lore.facts.map((f, j) => (
          <div key={j} className="mm-fact">
            <input value={f[0]} placeholder="Label" onChange={(e) => edit((d) => { get(d).facts[j][0] = e.target.value; }, k + "f" + j + "a")} />
            <input value={f[1]} placeholder="Value" onChange={(e) => edit((d) => { get(d).facts[j][1] = e.target.value; }, k + "f" + j + "b")} />
            <button type="button" className="mm-iconbtn" aria-label="Remove fact" onClick={() => edit((d) => { get(d).facts.splice(j, 1); })}>×</button>
          </div>
        ))}
        <button type="button" className="mm-btn mm-btn--small" onClick={() => edit((d) => { get(d).facts.push(["", ""]); })}>Add fact</button>
      </div>
    </>
  );
}

function ZoneList({ subs, onPick, showOff }: { subs: SubAreaJson[]; onPick: (k: number) => void; showOff?: boolean }) {
  return (
    <ul className="mm-zonelist">
      {subs.map((a, k) => (
        <li key={k}>
          <button type="button" onClick={() => onPick(k)} className={a.on || !showOff ? "" : "is-off"}>
            <b>{SUB_TAG_LETTERS[k]}</b> {a.name || (a.generic ? <i>{a.generic}</i> : <i>unnamed</i>)}{showOff && !a.on ? " · off" : ""}
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ---- small form controls --------------------------------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mm-sec"><h3>{title}</h3>{children}</section>;
}
const Row = ({ children }: { children: React.ReactNode }) => <div className="mm-row">{children}</div>;

function Text({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <label className="mm-field">
      <span className="mm-field__label">{label}</span>
      {multiline ? <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} /> : <input value={value} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}
function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="mm-field">
      <span className="mm-field__label">{label}</span>
      <textarea rows={5} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [text, setText] = React.useState(String(value));
  const [last, setLast] = React.useState(value);
  if (value !== last) { setLast(value); setText(String(value)); }
  return (
    <label className="mm-field mm-field--num">
      <span className="mm-field__label">{label}</span>
      <input inputMode="decimal" value={text} onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value.trim() !== "" && Number.isFinite(n)) { setLast(n); onChange(n); }
      }} />
    </label>
  );
}
function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="mm-field mm-field--slider">
      <span className="mm-field__label">{label} <code>{value.toFixed(3)}</code></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
function Select({ label, value, options, labels, onChange }: { label: string; value: string; options: string[]; labels?: (o: string) => string; onChange: (v: string) => void }) {
  const opts = options.includes(value) ? options : [value, ...options];
  return (
    <label className="mm-field">
      <span className="mm-field__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {opts.map((o) => <option key={o} value={o}>{labels ? labels(o) : o || "—"}</option>)}
      </select>
    </label>
  );
}
function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mm-check"><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /> {label}</label>
  );
}
function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="mm-field">
      <span className="mm-field__label">{label}</span>
      <span className="mm-color"><span className="mm-color__sw" style={{ background: value }} /><input value={value} onChange={(e) => onChange(e.target.value)} /></span>
    </label>
  );
}
function Danger({ label, onClick, disabled, note }: { label: string; onClick: () => void; disabled?: boolean; note?: string }) {
  return (
    <section className="mm-sec mm-sec--danger">
      <button type="button" className="mm-btn mm-btn--danger" disabled={disabled} onClick={onClick}>{label}</button>
      {note && <p className="mm-hint">{note}</p>}
    </section>
  );
}

/** Ids are edited in a draft and committed on blur/Enter, so a half-typed id
 *  never rewrites every reference. */
function IdField({ value, taken, onCommit }: { value: string; taken: string[]; onCommit: (v: string) => void }) {
  const [draft, setDraft] = React.useState(value);
  const [last, setLast] = React.useState(value);
  if (value !== last) { setLast(value); setDraft(value); }
  const ok = /^[a-z][a-z0-9-]*$/.test(draft) && !taken.includes(draft);
  const commit = () => { if (draft !== value) { if (ok) onCommit(draft); else setDraft(value); } };
  return (
    <label className="mm-field">
      <span className="mm-field__label">Id (whereabouts ids start with it; don&apos;t change it after a map ships)</span>
      <input value={draft} className={ok ? "" : "is-bad"} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setDraft(value); }} />
    </label>
  );
}
