# Character Sheet — Code Audit & Optimization Plan

## Current State
- **Main file**: 541 lines (HTML + mounted App)
- **Supporting files**: parts.jsx (873), rolls.jsx (564), inventory.jsx (695), data.js (359+), classes.js/jsx (unread)
- **Total LOC**: ~3000+ lines in one project
- **Pain point**: App.jsx is a 500-line monolith with deep state coupling; adding features burns tokens fast

## Key Issues

### 1. **Monolithic App Component** (Character Sheet.html lines 155–541)
- **Problem**: All state, handlers, and business logic live in one 400-line function
- **Impact**: Every small change requires understanding the full tree; Opus reads the whole file repeatedly
- **Example**: `invH` handlers object (lines 253–363) is 110 lines of callbacks spread across inventory, wands, artifacts, spells
- **Cost**: Changing inventory logic requires scanning ~200 lines of unrelated code (magic, classes, rolls)

### 2. **State Duplication & Watchers**
- Lines 195–217: 12 state hooks for inventory subsystems (artifacts, potions, recipes, plants, wands, glyphs, items)
- Lines 202–209: Spell/bonus state derived from wand equip state — manual wiring instead of a unified effect system
- **Cost**: Adding a new item type requires wiring state + sync logic + cleanup handlers

### 3. **Callback Hell in invH** (lines 253–363)
- 111 lines of nested callbacks with closures over character data
- Each callback mixes UI events, state mutations, roll prompts, and toast logic
- **Cost**: Debugging a single action (e.g., "attune artifact") requires reading 50+ lines

### 4. **Hardcoded Logic in Mount Script** (lines 354–541)
- Roll engine, prompt confirm, backfire resist, tweaks defaults all live in the main HTML
- **Cost**: Can't test or iterate on these without touching the main file

### 5. **Repeated Patterns**
- Icon component (`Ic`) defined separately in **3 files** (parts, rolls, inventory)
- TONE_FG, TONE_500, TONE_MIX color maps duplicated across 3 files
- Level-to-tone logic (LEVEL_TONE, levelTone) duplicated in parts & inventory
- **Cost**: Changing a color constant requires 3 edits; inconsistencies creep in

### 6. **Data Dependencies Hard-Coded**
- Inventory rules (attuneCap, potionCap, repair costs, etc.) live in external `window.SF_INV`
- Character data (faculties, magic schools, bonuses) live in `window.SF_DATA`
- **Cost**: Hard to mock for testing; unclear what each module depends on

---

## Optimization Strategy

### Phase 1: Extract & Share Constants (1–2 hours)
Create `shared.js` to eliminate duplication:
```javascript
// shared.js
const ICON_SVG_DEFAULTS = { /* ... */ };
const TONE_COLORS = { /* merged TONE_FG + TONE_500 + TONE_MIX */ };
const LEVEL_TONE_MAP = { /* ... */ };
const levelTone = (lvl) => { /* extracted once */ };

// Export both for direct reference and as window globals for backward compat
Object.assign(window, { SF_SHARED: { /* ... */ } });
```

**Impact**: −100 LOC, +1 file. Each component reads from one source.

---

### Phase 2: Modularize Inventory State & Handlers (2–3 hours)
Split `invH` into a dedicated state manager:
```javascript
// inventory-state.js (200 LOC)
function useInventoryState(character, caps, rolls) {
  // All 12 inventory state hooks + 111 lines of invH logic
  // Return: { state: { artifacts, potions, ... }, handlers: { attune, brew, ... } }
}
```

**Pattern**:
```javascript
// In App.jsx: from 110 lines of invH to 5 lines
const { state: inv, handlers: invH } = useInventoryState(c, caps, { push: pushRoll, openPrompt });
```

**Impact**: Inventory logic becomes testable; adding a new item type = add 1 handler in isolation.

---

### Phase 3: Extract Roll & Spell Logic (2 hours)
Move spell/bonus/wand-sync logic to `magic-state.js`:
```javascript
// magic-state.js (150 LOC)
function useMagicState(spellData, wandData) {
  // Lines 202–217: spell/bonus/move sync logic
  // Lines 343–365: wandEquip handlers
  return { spells, bonuses, moves, handlers };
}
```

**Impact**: Spell system is now independent; can iterate on new spell features without touching App.

---

### Phase 4: Move Classes State to Dedicated Module (1 hour)
Extract lines 185–194 + 220–247 (class ranking logic) into `classes-state.js`:
```javascript
// classes-state.js (80 LOC)
function useClassState(startingRp, classData) {
  return { rp, classState, handlers: { rankUp, refund, choose } };
}
```

---

### Phase 5: Modularize Roll Prompt & Backfire (1–2 hours)
Move `confirmPrompt` + `setResistRoll` flow into `roll-state.js`:
```javascript
// roll-state.js (100 LOC)
function useRollState(character, conditions) {
  const [pending, setPending] = React.useState(null);
  const [resistRoll, setResistRoll] = React.useState(null);
  
  return {
    pending, resistRoll,
    openPrompt, confirmPrompt, onResist,
    close,
  };
}
```

---

## File Structure After Refactor

```
Starfall App/
├── Character Sheet.html          (100 LOC — just mount + imports)
├── app.jsx                       (180 LOC — App component, now delegating)
├── shared.js                     (80 LOC — colors, tone logic, icon helper)
├── inventory-state.js            (200 LOC — state + handlers)
├── magic-state.js                (150 LOC — spell/bonus/wand sync)
├── classes-state.js              (80 LOC — class ranking)
├── roll-state.js                 (100 LOC — prompt + backfire)
├── parts.jsx                     (873 LOC — UI components, unchanged)
├── rolls.jsx                     (564 LOC — roll engine, unchanged)
├── inventory.jsx                 (695 LOC — UI components, unchanged)
├── classes.jsx                   (unread — UI, unchanged)
├── data.js                       (359+ LOC — seed data, unchanged)
├── classes.js                    (unread — rules, unchanged)
├── inventory.js                  (rules — unchanged)
├── app.css, rolls.css, inventory.css (unchanged)
└── tweaks-panel.jsx              (unchanged)
```

---

## Token Burn Reduction

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| Add new inventory item type | Read App (400 LOC) + invH (110 LOC) | Read inventory-state.js (200 LOC) | −310 LOC |
| Add new spell feature | Read App + magic system (150 LOC) | Read magic-state.js (150 LOC) | −200 LOC |
| Fix a render bug in Artifacts | Scan parts + App context | Scan parts only, know invH interface | −150 LOC |
| Understand inventory flow | Read entire App | Read inventory-state.js + parts.jsx | −250 LOC |

**Estimated reduction**: 30–50% per feature request after refactor.

---

## What NOT to Change

- ✅ **Design system bundle load** — stays as-is
- ✅ **Parts, rolls, inventory JSX** — purely presentational, no change needed
- ✅ **Data seed files** — reference stays the same via window
- ✅ **CSS** — all styling untouched
- ✅ **HTML structure** — mount point stays `<div id="root"></div>`

---

## Implementation Order

1. **Create shared.js** (extract duplicated icons/colors) — low risk, immediate payoff
2. **Create roll-state.js** (move prompt logic out of App) — isolated, testable
3. **Create inventory-state.js** (move invH handlers) — largest single gain
4. **Create magic-state.js** (move spell/bonus sync) — decouples magic features
5. **Create classes-state.js** (move class logic) — smallest, can be last
6. **Refactor app.jsx** to use the new modules
7. **Update Character Sheet.html** to import the new files

---

## Backward Compatibility

All modules export to `window.SF_*` for now, so existing parts/rolls/inventory code doesn't need changes. Each state module is a pure export; the App glues them together.

---

## Next Steps

Ready to start Phase 1 (shared.js) or jump to Phase 2 (inventory-state.js) if you prefer the bigger win first.
