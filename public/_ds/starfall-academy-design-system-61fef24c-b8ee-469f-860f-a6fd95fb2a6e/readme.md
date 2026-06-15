# Starfall Academy — Design System

> **Motto:** *"Semper ad astra."* — the official Academy motto, for ceremonial and formal use.
> **Unofficial motto:** *"Stay out of trouble."* — for lighthearted, off-duty, and playful contexts.
>
> An immersive, multimedia modern-fantasy world. Aesthetic shorthand: **Art Deco meets dark academia** — gilded, a little opulent, with plenty of gold and small touches of magic.

This repository is the single source of truth for Starfall Academy's brand and product surfaces. A compiler reads it, bundles the React components into a runtime library (`_ds_bundle.js`), and indexes the design tokens. Consuming projects link **`styles.css`** (the global entry point) and read components from the `window` namespace.

---

## Sources provided

This system was built from brand assets supplied directly by the client. No codebase or Figma file was provided.

- **Crest artwork** (`uploads/`, copied to `assets/`): `Crest.png` (full color), `Crest Simple.png` (flat shield), `Crest Lines.png` (outline).
- **Typeface**: Spectral (Regular, Italic, Bold, Bold Italic) — `uploads/*.ttf`, copied to `assets/fonts/`.
- **Brief**: "Art Deco meets dark academia. Gilded, opulent, golds, touches of magic. Spectral bold all-caps for headers. The crest is the logo, in full / simple / lines as appropriate."

The full color palette was sampled pixel-by-pixel from the crest (the four heraldic quarters, the gilded laurel, the parchment banner, the midnight ink of the creatures).

---

## Content fundamentals — how Starfall writes

The Academy speaks like a **stately fantasy institution that takes itself just seriously enough to be charming.** It is warm, ceremonial, and a little arch — never corporate, never jokey. The world has its own vocabulary of names and terms; those live with the writer, not here. The notes below cover *register and mechanics* only.

- **Voice**: second person, addressed to the reader as *"you,"* with the Academy as the implied *"we."* Inviting and a touch grand.
- **Tone**: ceremonial but warm. Frame actions as invitations or rites rather than chores. Two registers, mirroring the mottos — formal and aspirational for official moments; dry and playful for lighthearted ones.
- **Casing**: **Spectral Bold, ALL CAPS** for every heading and title, generously letterspaced. Eyebrows/overlines are uppercase Jost with very wide tracking. Body and UI labels are sentence case. Never title-case headings — they are always full caps.
- **Numerals**: roman numerals for ceremonial moments (terms, dates); arabic for data and counts.
- **Punctuation flourish**: the middot ` · ` separates metadata. Em dashes attribute quotes.
- **Quotes & decrees**: short, aphoristic, set in italic Spectral.
- **No emoji.** Ever. Magic is conveyed through language and gilding, not emoji. Iconography is line-based (see below).
- **Length**: concise. Headlines are short — a few words. Body is one or two graceful sentences, never a wall.

---

## Visual foundations

The world is rendered as **gold leaf on midnight** — a deep, slightly cool charcoal-blue canvas, gilded with metallic gold, accented by the four heraldic house colors, and relieved by warm parchment for "light" surfaces.

### Color
- **Canvas**: a midnight *ink* ramp (`--ink-950 → --ink-400`). Pages sit on `--ink-950` under a subtle radial **vignette** (`--grad-vignette`) that deepens at the edges. Panels/cards step up to `--ink-800` / `--ink-700`.
- **Gold is the one brand accent** (`--gold-500` #b99d53, sampled from the crest). It appears as thin strokes, the `--grad-gold` metallic gradient on primary buttons/avatars/progress, gilded card edges, and the `--rule-gold` divider. Used sparingly and preciously — gold means "important" or "earned."
- **Four house colors** — plum, forest, teal, crimson — are the secondary palette, drawn from the crest quarters. They tint badges, course glyphs, and section accents. They also map to **semantics**: forest=success, teal=info, gold=warning, crimson=danger, plum=arcane.
- **Parchment** (`--parchment-50→400`) is the inverse surface: cream cards with dark ink text, for decrees, certificates, printable matter.
- **Imagery vibe**: warm, candle-lit, slightly desaturated. Heraldic, painterly. The crest is the hero image; line-crest watermarks (recolored gold or white at ~6–12% opacity) add depth behind heroes and media.

### Type
- **Display / headings**: Spectral Bold, uppercase, tracking `0.06–0.14em`. Often clipped with `--grad-gold` for hero numerals/wordmarks.
- **Body**: Spectral regular — a genuine reading serif; italic for quotes/decrees.
- **UI / labels**: **Jost** (geometric, Art-Deco lineage) — buttons, form labels, nav, eyebrows (very wide tracking, uppercase).
- **Data / code**: JetBrains Mono — counts, times, sigils, keys.
- Scale is a 1.250 major third on a 16px root. On-screen minimum 11px (micro labels only).

### Space, radius, elevation
- **4px spacing grid** (`--space-1`=4 … `--space-10`=96).
- **Radii are crisp and restrained** (Art Deco favors clean edges): default controls 4–6px; cards 10px; `--radius-pill` reserved for badges and toggles only. Nothing is overly soft.
- **Shadows** are deep and soft against the dark canvas (`--shadow-sm→xl`). The signature elevation flourish is **`--glow-gold`**, a faint gold halo used on hover for primary buttons, the player's play button, and hero cards. Raised gilded surfaces also carry `--inset-hi` (a 1px top gold highlight).
- **Borders**: hairlines are low-opacity gold (`--border-subtle/default/strong`) or parchment (`--hairline`). Gilded cards render a masked gold-gradient edge.

### Motion & states
- **Easing**: `--ease-standard` for most transitions; `--ease-out` for entrances/lifts; a slower `--dur-stately` (600ms) for grand, opulent reveals.
- **Hover**: links/icons lighten toward gold; ghost controls fill with `--ink-700`; cards marked `interactive` **lift** `translateY(-3px)` with a deeper shadow; primary buttons gain `--glow-gold`.
- **Press**: controls nudge `translateY(1px)` (no harsh scale).
- **Focus**: a 2–3px gold focus ring (`--focus-ring`).
- **No bounces, no infinite decorative loops.** Magic is expressed through gilding and easing, not bouncy physics.

### Layout
- App surfaces use a **fixed left sidebar + sticky top bar**, with an internally-scrolling canvas. Content max-widths keep prose readable (`--width-prose` 68ch).
- Backgrounds are flat midnight + vignette + occasional gold line-crest watermark. **No busy gradients, no purple/blue tech gradients, no emoji cards, no colored-left-border cards.**
- Transparency/blur is used deliberately: the sticky top bar uses a 6px backdrop blur over a translucent ink fill; the player play-button is a frosted disc.

---

## Iconography

- **System**: [**Lucide**](https://lucide.dev) — clean, consistent 2px line icons that suit the academic line-art feel. Loaded from CDN (`unpkg.com/lucide`). This is a **substitution** chosen to match the brand's line aesthetic; no proprietary icon set was provided. *If the Academy adopts a bespoke icon set, swap it here.*
- **Style**: stroked (never filled), `1.05–1.25em`, inheriting `currentColor`. Icons take gold or house-tinted color inside chips/glyphs, muted gray inline.
- **Usage in code**: render `<i data-lucide="name"></i>` then call `lucide.createIcons()` after mount (see any component card or the UI kit). Components accept icon nodes via props (`iconLeft`, `icon`, etc.).
- **The crest is not an icon** — it is the logo. Use the `Crest` component (`form="full|simple|lines"`, `tint="gold|ink"`). The **line crest** doubles as a decorative watermark (recolor to gold or white, drop to ~6–12% opacity).
- **No emoji, no unicode-glyph icons.** The only non-Lucide glyphs are the middot `·` separator and roman numerals as text.

---

## Index / manifest

**Root**
- `styles.css` — global entry point (imports only). Consumers link this.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skills front-matter so this system can be used as a downloadable skill.

**`tokens/`** — design tokens, each `@import`ed by `styles.css`
- `fonts.css` — `@font-face` for Spectral + Google import of Jost & JetBrains Mono
- `colors.css` — ink, gold, parchment, four houses, semantic aliases
- `typography.css` — families, weights, type scale, line-height, tracking
- `spacing.css` — 4px spacing scale, radii, container widths, control sizing
- `effects.css` — shadows, gold glow, metallic gradients, vignette, motion
- `base.css` — base element styling + heading / eyebrow / body helper classes

**`assets/`**
- `crest-full.png`, `crest-simple.png`, `crest-lines.png`
- `fonts/Spectral-*.ttf`

**`components/`** — reusable React primitives (read from `window.StarfallAcademyDesignSystem_61fef2`)
- `core/` — **Button**, **IconButton**, **Badge**, **Card**, **Crest**
- `forms/` — **Input**, **Select**, **Checkbox**, **Switch**
- `navigation/` — **Tabs**
- `feedback/` — **Banner**
- Each has `<Name>.jsx`, `<Name>.d.ts`, `<Name>.prompt.md`, and a `*.card.html` specimen.

**`ui_kits/academy-portal/`** — full-screen interactive recreation of the student portal
- `index.html` — interactive flow: enrollment **gate → the Atrium (dashboard) → a multimedia course**
- `AppShell.jsx`, `GateScreen.jsx`, `AtriumScreen.jsx`, `CourseScreen.jsx`, `data.js`, `portal.css`
- `README.md` — kit notes

**`guidelines/`** — Design-System-tab specimen cards (Colors, Type, Spacing, Brand).

---

## Using the system

1. Link the styles: `<link rel="stylesheet" href="styles.css">`.
2. For brand assets, copy `assets/` into your project and reference the crest PNGs / fonts.
3. For React surfaces, load `_ds_bundle.js` and read components from `window.StarfallAcademyDesignSystem_61fef2` (see any `*.card.html`). Add Lucide from CDN for icons.
4. Stay in voice (the house lexicon), gild sparingly, and keep headings in Spectral all-caps.
