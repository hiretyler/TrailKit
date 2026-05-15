# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

TrailKit ships as a single self-contained HTML file. As of v1.05 dev (May 2026) it has a minimal build that bundles ES-module source into that single file — but the *output* is still the same shape: open it in a browser, no install needed.

### Commands

```
npm install              # one-time, installs esbuild
npm run build            # bundle src/ → dist/TrailKit.html
npm run watch            # rebuild on file changes
npm test                 # headless node test runner (engine tests)
npm run test:browser     # opens tests/test.html in your default browser
npm run serve            # `python3 -m http.server 8000` — useful for the path to 0.9/ showcase
```

Persisted app state lives in `localStorage` under key `trailkit_v1`; clear via DevTools when testing fresh-state flows.

### File layout

**Source** (the new layout introduced when we resumed development):
- `src/index.html` — HTML shell with `<!-- {{STYLES}} -->` and `<!-- {{SCRIPT}} -->` placeholders the build replaces.
- `src/styles/app.css` — full stylesheet (CSS variables, layout, slot grid, modals, mobile responsive).
- `src/engine/` — the generic "Planner Engine" as real ES modules: `store.js`, `drag.js`, `rules.js`, `stats.js`, `persistence.js`, `ui.js`, plus an `index.js` barrel. **This directory is destined to be shared with PlanFit** — never let TrailKit-specific concepts (zones, item types, sports) leak into it.
- `src/trailkit/app.js` — all TrailKit-specific code (still one big file by intent; future audit pass splits it). Imports the engine.
- `build.mjs` — esbuild orchestrator. Bundles `src/trailkit/app.js` as IIFE, inlines into `src/index.html`, writes `dist/TrailKit.html`.
- `tests/` — `assert.js` (tiny helpers + test registry), `engine.test.js`, `run-node.mjs` (CLI runner), `test.html` (browser runner).

**Released snapshots at repo root** (do not edit; these are frozen):
- `TrailKit-1.0.html` — most recent release, hand-authored single file. The source under `src/` was extracted from this. New releases will be cut from `dist/TrailKit.html` and copied to `TrailKit-X.Y.html` at the root.
- `TrailKit-0.9.html`, `TrailKit-0.95.html`, `TrailKit-0.96.html`, `TrailKit-0.97.html`, `TrailKit-0.98.html`, `TrailKit-0.99.html` — earlier releases.

**Historical / reference (also frozen):**
- `path to 0.9/` — full iteration history `v1-TrailKit.html` … `v23-TrailKit.html` plus the three 0.9.x snapshots, fronted by `index.html` (a step-through showcase that iframes each version). Note: the showcase's hardcoded `iterations/...` paths assume deployment under `/showcase/iterations/` — see `docs/AUDIT.md` notes.
- `exports/` — sample XML/HTML artifacts produced by the export flows.
- `trailkit_narrative_blog.html`, `v1/v2/v3-trailkit_narrative_blog.html`, `TrailKit_Development_Narrative.docx` — long-form prose describing the development story.
- `trailkit-packing-lists-sample*.html` — examples of "Export Packing Lists" output.

**Project docs:**
- `ROADMAP.md` — release milestones (v1.05 → v1.1 → v1.15) driving session work.
- `docs/AUDIT.md` — robustness/simplification opportunities, sized by impact & effort.

**Build output (gitignored):**
- `dist/TrailKit.html` — built single-file app. Regenerable via `npm run build`. When releasing, copy to `TrailKit-X.Y.html` at the root.

## Architecture

Same two-layer split as before, but now physically separated:
- **Planner Engine** — `src/engine/*.js` — generic scaffolding, exported as ES modules.
- **TrailKit domain** — `src/trailkit/app.js` — imports the engine, contains everything app-specific.

The released `TrailKit-1.0.html` and the built `dist/TrailKit.html` both look the same end-user-wise: `<style>` → markup → `<script>` IIFE. The architecture description below applies to the source modules and to either output.

### 1. Planner Engine (`src/engine/`)

Reusable scaffolding labelled "PLANNER ENGINE v1.0" — intended to be the shared library for TrailKit, PlanFit (`~/projects/PlanFit/`), and any future single-file planner. Keep it domain-agnostic; nothing in this block should reference TrailKit zones, item types, or sports.

- **`PlannerStore`** — small reactive container. `.on(type, reducer)` registers reducers that return partial state (shallow-merged). `.dispatch(action)` runs middleware then the reducer then notifies subscribers. `._patch()` is for init/restore only.
- **`DragEngine`** — owns drag lifecycle and drop-zone registration. App calls `DragEngine.init(onDropFn)` once.
- **`RulesEngine`** — ordered list of `(item, toZone, state) → {valid, reason?}` predicates. First failure short-circuits. Register rules with `RulesEngine.register(fn)`.
- **`StatsEngine`** — pure aggregation helpers (`sumBy`, `countBy`, `groupBy`, `totalWeightKg`). No side effects.
- **`Persistence`** — `init(key, serialize, deserialize)` then `.save(state)` / `.load()`. Wraps `localStorage` with try/catch (quota errors swallowed).
- **`UIUtils`** — `openModal` / `closeModal` / `closeAllModals` / `closeAllPopovers`. The "open" CSS class on `.modal-overlay` drives visibility.

### 2. TrailKit domain (`src/trailkit/app.js`)

Everything else. Still one big file by intent — the audit pass listed in `docs/AUDIT.md` will split it further.

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

- **Default edit target is `src/`**, not the root snapshots. `TrailKit-1.0.html` and earlier are frozen releases — they only change when we cut a new version (copy `dist/TrailKit.html` to `TrailKit-X.Y.html`).
- Keep `src/engine/` generic. If a change needs domain knowledge (item types, zones, sports), it belongs in `src/trailkit/app.js`.
- After source changes: `npm run build`, then open `dist/TrailKit.html` in a browser to verify. Or `npm run watch` for autobuild during a session.
- Engine changes must pass `npm test`. Add a test before changing engine behavior; add a test for the new behavior when extending it.
- The app is deliberately framework-free at runtime. Devdeps (esbuild) are fine; runtime deps are not — the bundled output must remain a single HTML file with no external `<script src=>` beyond Google Fonts.
- Watch for the `S` proxy gotcha: code reads `S.mainItems` directly, but mutations must go through `store.dispatch(...)`. See `docs/AUDIT.md` #1 for the planned fix.
- After any state-changing action, the convention is `dispatch → renderAll()`. `renderAll` itself calls `persistState()`, so don't double-save.
- The `exportPackingLists` template embeds its own `<script>` — when editing it, preserve the `<' + 'script>` / `<\/script>` splits, otherwise the outer document's parser will close the wrong tag. See `docs/AUDIT.md` #6 for the planned cleanup.
