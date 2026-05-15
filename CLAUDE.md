# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

This is **not** a typical software project — there is no build, no package manager, no tests, no lint, and no framework. Every "version" of TrailKit is a single self-contained `.html` file that runs by opening it in a browser. There are no npm/yarn/pip steps; there is nothing to install.

To run a version: open the file in a browser (e.g. `open TrailKit-1.0.html`). Persisted state lives in `localStorage` under the key `trailkit_v1`; clear it via DevTools when testing fresh-state flows.

### File layout

- `TrailKit-1.0.html` — current/latest app. Treat this as the working file unless the user specifies otherwise.
- `TrailKit-0.9.html`, `TrailKit-0.95.html`, `TrailKit-0.96.html`, `TrailKit-0.97.html`, `TrailKit-0.98.html`, `TrailKit-0.99.html` — frozen prior releases at repo root. Don't edit these; they're snapshots referenced from the narrative.
- `path to 0.9/` — full iteration history `v1-TrailKit.html` … `v23-TrailKit.html` plus the three 0.9.x snapshots, fronted by `index.html` (a step-through showcase that iframes each version). Snapshots — do not edit.
- `exports/` — sample XML/HTML artifacts produced by the export flows. Reference data, not source.
- `trailkit_narrative_blog.html`, `v1/v2/v3-trailkit_narrative_blog.html`, `TrailKit_Development_Narrative.docx` — long-form prose describing the development story. Useful for context; not code.
- `trailkit-packing-lists-sample*.html` — examples of what the "Export Packing Lists" feature produces.

## Architecture of `TrailKit-1.0.html`

The file is organised as `<style>` → markup → `<script>`. The script is split into two distinct layers, separated by banner comments:

### 1. Planner Engine (generic, ~lines 1398–1635)

Reusable scaffolding labelled "PLANNER ENGINE v1.0" — intended to be copied verbatim into future single-file planners (the narrative calls out PlanFit as the next target). Keep it domain-agnostic; nothing in this block should reference TrailKit zones, item types, or sports.

- **`PlannerStore`** — small reactive container. `.on(type, reducer)` registers reducers that return partial state (shallow-merged). `.dispatch(action)` runs middleware then the reducer then notifies subscribers. `._patch()` is for init/restore only.
- **`DragEngine`** — owns drag lifecycle and drop-zone registration. App calls `DragEngine.init(onDropFn)` once.
- **`RulesEngine`** — ordered list of `(item, toZone, state) → {valid, reason?}` predicates. First failure short-circuits. Register rules with `RulesEngine.register(fn)`.
- **`StatsEngine`** — pure aggregation helpers (`sumBy`, `countBy`, `groupBy`, `totalWeightKg`). No side effects.
- **`Persistence`** — `init(key, serialize, deserialize)` then `.save(state)` / `.load()`. Wraps `localStorage` with try/catch (quota errors swallowed).
- **`UIUtils`** — `openModal` / `closeModal` / `closeAllModals` / `closeAllPopovers`. The "open" CSS class on `.modal-overlay` drives visibility.

### 2. TrailKit domain (~line 1638 onward)

Everything below the "TRAILKIT DOMAIN" banner is app-specific.

- **Inventory model** — items have `{id, icon, name, type, activity, slots, weightKg, capacityL, maxKg, desc}`. `type` is one of `Backpack | Bladder | Bottle | Safety | Medical | Tools | Worn | Item`. `slots` is consumption of the main compartment; for a Backpack it's the capacity. `activity` is `'all'` or a sport key.
- **Two parallel inventories**: `SAMPLE_INVENTORY` (curated demo data, ships with the app) and `USER_INVENTORY` (built up via import / Add Item). The module-level `INVENTORY` pointer is swapped by `setSampleGear(on)` along with the `useSampleGear` boolean. Anything that reads gear must go through `INVENTORY` (or `itemById` / `itemByName`) so the toggle works.
- **Sports**: `hike | bike | run | climb | moto | camp`. Each has its own loadout namespace under `S.userLoadouts[sport]` and `SAMPLE_LOADOUTS[sport]`.
- **Store + live `S` proxy** — `const S = store.getState()` returns a plain object, then a subscriber does `Object.assign(S, state)` after every dispatch. Render functions read from `S` directly; **never reassign `S`**, only mutate it via `dispatch` (which patches it through the subscriber). `store._patch()` is used only by `restoreState()` and must be paired with `Object.assign(S, restored)` to keep the proxy in sync.
- **Rules registered**: `ruleTypeMatch` → `ruleBackpackRequired` → `ruleCapacity`. Order matters (cheapest first). To add a rule, write a named function and `RulesEngine.register(it)`; do not edit the engine.
- **Drop zones**: `backpack`, `bladder`, `bottle-left`, `bottle-right`, `main`, `worn`, `stash`. `stash` and `main` accept any type; the others enforce type via `ruleTypeMatch`'s `ZONE_TYPE` map.
- **Render functions** are called via `renderAll()` after every dispatch: `renderStash`, `renderBackpackSlot`, `renderWater`, `renderMain`, `renderWorn`, `renderStats`. They are pure-ish DOM rebuilders that read `S` and the active `INVENTORY`.
- **Persistence key** is `trailkit_v1`. The serialize function packs `useSampleGear`, the user inventory, all `userLoadouts`, and the currently active loadout. Deserialize re-points `INVENTORY` and rewrites module-level `USER_INVENTORY` / `useSampleGear` as side effects — be careful when changing it.
- **Mobile mode** has a separate code path (`isMobile()`, `initMobile()`, `mBindTapListeners()`, `mTapDropZone()`, long-press tooltips). Drag-and-drop is desktop only; mobile uses tap-to-select-then-tap-target. Re-bind happens inside `renderAll()` because each render replaces DOM nodes — persistent slots cache handlers on the element (`el._mHandler`, `el._lpBound`).
- **Exports**: `exportXML` (the `.trailkit` file — XML with `<yourgear>` and `<loadouts>` sections, schema documented in the narrative), `exportPackingLists` (standalone HTML with its own embedded dark/light/print modes — note the `<' + 'script>` / `<\/script>` splits inside the template string to keep the outer script from terminating early), and `exportCSV`. All three pull from `useSampleGear ? SAMPLE_INVENTORY : USER_INVENTORY` and warn before exporting sample data.
- **Import**: `importXML` is permissive (defaults supplied for every field) and always lands items into `USER_INVENTORY`, then flips the app to user-gear mode.

## Working in this codebase

- When asked to "fix" or "change" something, default to editing `TrailKit-1.0.html`. The older snapshots exist for historical reference and the showcase iframe — leave them alone unless explicitly asked.
- Keep the Planner Engine block generic. If a change needs domain knowledge (item types, zones, sports), it belongs below the "TRAILKIT DOMAIN" banner.
- The app is deliberately framework-free with no external runtime dependencies beyond Google Fonts. Don't introduce a build step, npm package, or CDN script.
- Watch for the `S` proxy gotcha: code reads `S.mainItems` directly, but mutations must go through `store.dispatch(...)`. The proxy is re-synced inside the subscriber.
- After any state-changing action, the convention is `dispatch → renderAll()`. `renderAll` itself calls `persistState()`, so don't double-save.
- The `exportPackingLists` template embeds its own `<script>` — when editing it, preserve the `<' + 'script>` / `<\/script>` splits, otherwise the outer document's parser will close the wrong tag.
