# TrailKit — Gear Loadout Manager

TrailKit is a single-file, framework-free web app for planning outdoor gear loadouts. Drag your gear into a backpack, water slots, worn items, and a stash; the app validates fit by type and capacity, totals your pack weight, and lets you save per-activity loadouts. Everything runs in the browser with no backend — state lives in `localStorage`, and you import/export via files.

Activities: hike, bike, run, climb, moto, camp.

## Try it

The released app is a single self-contained HTML file. Open [`TrailKit-1.0.html`](TrailKit-1.0.html) directly in any modern browser — no install, no server.

## Highlights

- **Drag-and-drop loadout planning** (desktop) with tap-to-place fallback on mobile.
- **Fit validation** — type matching, "backpack required", and capacity rules run before any drop.
- **Live weight + capacity stats** as you build a loadout.
- **Per-activity loadouts** saved independently per sport.
- **Sample gear vs. your gear** — explore with curated demo inventory, then import or add your own.
- **Exports** — `.trailkit` (XML), standalone HTML packing lists (with their own dark/light/print modes), and CSV.
- **Permissive import** — bring gear in from XML with sensible defaults for every field.

## Architecture

Two layers, physically separated under `src/`:

- **Planner Engine** (`src/engine/`) — generic, domain-agnostic scaffolding: a small reactive store, drag engine, rules engine, stats helpers, persistence, and UI utilities. Designed to be shared across single-file planners (TrailKit and a sister project, PlanFit).
- **TrailKit domain** (`src/trailkit/app.js`) — everything app-specific: the inventory model, sports, drop zones, render functions, import/export.

A minimal [esbuild](https://esbuild.github.io/) step bundles the ES-module source into the same single-file output shape as the hand-authored releases.

## Development

```bash
npm install          # one-time, installs esbuild
npm run build        # bundle src/ → dist/TrailKit.html
npm run watch        # rebuild on file changes
npm test             # headless node test runner (engine tests)
npm run test:browser # open tests/test.html in your browser
npm run serve        # python3 -m http.server 8000
```

Default edit target is `src/`. The `TrailKit-*.html` files at the repo root are frozen releases — a new release is cut by copying `dist/TrailKit.html` to `TrailKit-X.Y.html`.

## Layout

- `src/` — the ES-module source (engine + domain) and HTML shell.
- `tests/` — engine test harness (node CLI runner + browser runner).
- `TrailKit-*.html` — frozen released snapshots (0.9 → 1.0).
- `path to 0.9/` — full iteration history with a step-through showcase.
- `docs/` — [`ROADMAP.md`](ROADMAP.md), [`docs/AUDIT.md`](docs/AUDIT.md), and planning documents.
- `exports/`, `trailkit-packing-lists-sample*.html` — sample output artifacts.

## Roadmap

See [`ROADMAP.md`](ROADMAP.md). Near-term: UI polish (v1.05), then "Add Your Gear" onboarding flows (v1.1 / v1.15).

## License

No license specified yet — all rights reserved by default until one is added.
