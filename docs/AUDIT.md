# TrailKit-1.0 Audit

A working list of robustness, simplification, and maintainability opportunities found while reading `TrailKit-1.0.html` end-to-end. Each item is rated for **impact** (how much it improves the codebase) and **effort** (rough sizing). Items get pulled into a `ROADMAP.md` release when they unblock a feature or have accumulated enough to justify a maintenance pass.

Line numbers refer to `TrailKit-1.0.html` at the v1.0 commit.

Status legend: `[ ]` open, `[~]` in progress, `[x]` done.

---

## High impact

### [ ] 1. Replace the live `S` proxy with explicit `getState()` calls
- **Where:** lines 1807–1808 — `const S = store.getState(); store.subscribe((state) => { Object.assign(S, state); });`
- **Problem:** Any code can do `S.mainItems.push(x)` and *partially* work — the in-memory object updates but the store never sees the change, subscribers don't fire, and persistence doesn't save. There's no compile-time or runtime barrier. Several call sites already do this kind of mutation (see #7).
- **Fix:** Call `store.getState()` at the top of each render function (cheap — it's a shallow copy). Or, in a stricter version, replace `S` with a real `Proxy` whose `set` trap throws.
- **Impact:** High — eliminates a whole class of state bugs.
- **Effort:** Medium — touches every render function and several handlers, but it's mechanical.

### [ ] 2. Move module-level mutable globals into store state
- **Where:** lines 1733–1740 — `let USER_INVENTORY = []; let useSampleGear = true; let INVENTORY = SAMPLE_INVENTORY;`
- **Problem:** `setSampleGear` (line ~3690) and `importXML` (line ~3015) mutate these directly. `restoreState` then has to do `Object.assign` + side effects to keep them in sync. The store is supposed to be the source of truth — these globals undermine that.
- **Fix:** Add to store state: `useSampleGear`, `userInventory`. Make `INVENTORY` a derived selector: `getInventory(state) => state.useSampleGear ? SAMPLE_INVENTORY : state.userInventory`. `setSampleGear` becomes `dispatch({type:'SET_SAMPLE_GEAR', on})`.
- **Impact:** High — collapses two parallel state systems into one.
- **Effort:** Medium.

### [ ] 3. Use event delegation instead of per-render handler caching
- **Where:** `mBindTapListeners` (line ~4125) — uses `el._mTapBound`, `el._mHandler`, `el._lpBound` flags to avoid double-binding because `renderAll()` rebuilds DOM nodes.
- **Problem:** Brittle and easy to forget on new slot types. Memory leaks if a slot type ever stops being re-rendered. Long-press handlers are bound per node even though the parent is stable.
- **Fix:** Bind one listener per stable container (`#stashGrid`, `#mainGrid`, `#mobileWornList`). Use `e.target.closest('.slot[data-id]')` to identify the row. Same pattern for long-press via `touchstart` on the container.
- **Impact:** High — removes ~80 lines, eliminates the `_lpBound`/`_mHandler` footguns.
- **Effort:** Medium.

### [ ] 4. Add tests for pure functions
- **Where:** none exist.
- **What to cover first:** `RulesEngine.validate` (combinations of rules), `StatsEngine.{sumBy,countBy,totalWeightKg}`, XML `buildXML` / `importXML` round-trip, `itemById`, the store reducers.
- **Fix:** `tests/test.html` with a tiny `assert` helper that prints pass/fail to the page. No framework. Open in browser to run.
- **Impact:** High — every Phase 2 refactor lands safer.
- **Effort:** Small for the harness, then per-feature.

---

## Medium impact

### [ ] 5. Extract emoji picker data to its own file (+ dedupe)
- **Where:** `EP_DATA` lives in `src/trailkit/app.js` (was lines 3118+ in TrailKit-1.0.html).
- **Problem:** ~600 entries with keyword strings inflate `app.js`. Build also reports **20 duplicate-key warnings** (e.g. `🏞️`, `🧊`, `🧣`, `🧤`, `🔦`, `⛑️`, `💡`, `🏹`, `📡`, `🛰️`, `🫙`, `🍄`, `🌰`, `🚑`, `🛶`, `🔐`, `🎵`, `🧲`, `🪤`, `🏗️`). JS silently keeps the last value, so some keywords are unreachable.
- **Fix:** Move to `src/trailkit/data/emojis.js` (or `.json`). Dedupe keys by merging keyword strings so all search terms remain hittable.
- **Impact:** Medium — readability + restores ~20 emojis' searchability.
- **Effort:** Small (build is in place).

### [ ] 6. Move packing-list export template to a build-inlined file
- **Where:** `exportPackingLists` in `src/trailkit/app.js` (was line 2630 in TrailKit-1.0.html); contains `<' + 'script>` and `<\/script>` splits.
- **Problem:** The script-tag splits are a parser-evasion hack that's easy to break when editing. The template is ~250 lines of HTML embedded in a JS template string with no syntax highlighting.
- **Fix:** Put the template in `src/trailkit/exports/packing-list.html`. Add a build step that JSON.stringifies the file contents and exposes it as an import (or via an esbuild loader). No more script-tag splits needed.
- **Impact:** Medium — eliminates a known footgun.
- **Effort:** Small.

### [ ] 7. Stop direct-mutating store state in `importXML`
- **Where:** lines ~3047–3058 — `if(!S.userLoadouts[sport]) S.userLoadouts[sport] = {}; S.userLoadouts[sport][key] = {...}`
- **Problem:** Bypasses the SAVE_LOADOUT reducer entirely. Works today only because `persistState` is called manually right after. Will break if/when subscribers grow.
- **Fix:** Dispatch a new `BULK_IMPORT_LOADOUTS` action that takes a `{[sport]: {[key]: loadout}}` map and merges it via the reducer.
- **Impact:** Medium — fixes one of the bug-prone patterns #1 protects against.
- **Effort:** Small.

### [ ] 8. Constants for action types
- **Where:** strings like `'SET_BACKPACK'`, `'ADD_TO_MAIN'`, `'CLEAR_LOADOUT'` appear in 20+ places.
- **Problem:** Typos silently no-op (no reducer registered → action ignored).
- **Fix:** Export `const ACTION = { SET_BACKPACK: 'SET_BACKPACK', ... }` from `src/engine/store.js` (or actions module). Use everywhere.
- **Impact:** Medium.
- **Effort:** Small (mechanical).

### [ ] 9. Surface localStorage quota failures
- **Where:** `Persistence.save` line 1605 — `catch(e){ /* quota exceeded — silent */ }`
- **Problem:** User loses persistence without any signal. With sample data + emojis + growing user inventory, hitting quota is plausible.
- **Fix:** Once per session, surface a toast: "Couldn't save your changes — local storage is full." UIUtils should grow a toast helper anyway.
- **Impact:** Medium — data-loss visibility.
- **Effort:** Small.

---

## Low impact (cleanup, do opportunistically)

### [ ] 10. Add a `VERSION` constant
- The version is encoded only in the filename today. Add `const VERSION = '1.0.0'`, surface in About modal and in XML/CSV/packing-list exports as a comment header.

### [ ] 11. Rename `bladderIds` → `bladderId`
- State key is plural but the slot only holds one bladder. Confusing for newcomers.
- Touches store, render, XML import/export. Schema migration needed in `restoreState`.

### [ ] 12. Centralize hardcoded element IDs
- Hundreds of `getElementById('foo')` calls scattered across the file. Each is a stringly-typed coupling.
- Lower priority — paying off requires a sweep through all renderers. Worth doing piecewise as part of #1.

### [ ] 13. Replace `alert()` with toasts
- `importXML` line ~3069 uses `alert()` for both success ("X items imported") and failure ("Import failed: ..."). Add toast helper to UIUtils.

### [ ] 14. Sort `SAMPLE_INVENTORY` and document the implied invariants
- Items appear in a specific order that drives rendering. Codify the order convention in a comment or sort dynamically by `TYPE_ORDER`.

---

## Notes (not action items)

- **The dev mode/iteration showcase at `path to 0.9/index.html`** uses paths like `iterations/v1-TrailKit.html` that don't match the current `path to 0.9/v1-TrailKit.html` layout. It only works if deployed to a server under `/showcase/` with the iterations under `/showcase/iterations/`. Not broken locally — just be aware before linking publicly.
- The `path to 0.9` directory name contains a space — fine for git, but anything that shells out to that path needs quoting.
- The "Planner Engine" comment claims shared use with PlanFit. PlanFit-0.85 does not actually import or copy this code (verified 2026-05-15). The shared library is forward-looking, not retroactive.
