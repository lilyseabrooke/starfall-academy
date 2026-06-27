"use client";

// TEMPORARY scratch route — smoke-renders every design-system primitive to
// verify the ported package + ds.css end to end. Delete before F1 ships.

import * as React from "react";
import { Search, Star, Plus } from "lucide-react";
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  Crest,
  IconButton,
  Input,
  Select,
  Switch,
  Tabs,
} from "@/ds";

export default function DsPreviewPage() {
  const [tab, setTab] = React.useState("one");
  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-page)", padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 720, margin: "0 auto" }}>
      <Crest form="full" size={96} />

      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <Button variant="primary" iconLeft={<Plus />}>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <IconButton label="Favourite" variant="solid"><Star /></IconButton>
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <Badge tone="gold">Gold</Badge>
        <Badge tone="plum">Plum</Badge>
        <Badge tone="forest">Forest</Badge>
        <Badge tone="teal" dot>Teal</Badge>
        <Badge tone="crimson">Crimson</Badge>
        <Badge solid>Solid</Badge>
      </div>

      <Card variant="gilded" eyebrow="Eyebrow" title="A gilded card">
        <p style={{ color: "var(--text-body)" }}>Body content inside a gilded surface.</p>
      </Card>

      <Banner tone="info" title="Heads up" icon={<Star />}>An informational banner.</Banner>
      <Banner tone="danger" title="Trouble" onDismiss={() => {}}>A dismissible danger banner.</Banner>

      <Input label="Name" hint="Your character's name" iconLeft={<Search />} placeholder="Type here" />
      <Select label="House" options={["Dragon", "Phoenix", "Griffin"]} />
      <Checkbox label="Attuned" description="Currently bonded to this artifact" defaultChecked />
      <Switch label="Edit mode" defaultChecked />

      <Tabs
        items={[
          { value: "one", label: "Spells", count: 12 },
          { value: "two", label: "Inventory", count: 4 },
          { value: "three", label: "Classes" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div style={{ color: "var(--text-muted)" }}>Active tab: {tab}</div>
    </div>
  );
}
