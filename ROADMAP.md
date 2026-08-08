# TrailKit Roadmap

This is the source of truth for what's planned and what's next. Sessions in Claude Code start by picking the next unblocked item.

Format conventions:
- `[ ]` not started, `[~]` in progress, `[x]` done
- Each version is a release milestone. Items inside a version ship together.
- Technical debt and architecture work lives in [docs/AUDIT.md](docs/AUDIT.md) and is pulled into a version when it unblocks a feature.

---

## Current state

- **Released:** v1.05 — `releases/TrailKit-1.05.html`. First release cut from the `src/` build pipeline.
- **Working on:** v1.1 onboarding follow-ups implemented in `src/` (2026-08-07); next step is cutting the v1.1 release (copy `dist/TrailKit.html` → `releases/TrailKit-1.1.html`, bump the Pages redirect, redeploy tgeddes.dev).

---

## v1.1 — Onboarding follow-ups (implemented 2026-08-07, release not yet cut)

- [x] **Post-commit backpack nudge** — the commit toast now carries a "Set Pack Size(s)" action that deep-links into the Edit Item modal and chains through each added pack on save (close/Escape abandons the chain)
- [x] **Starter loadouts** — STARTER_LOADOUTS in quickadd-data.js (one per sport, referencing starter item ids); committing with a pack chip on installs them via the new INSTALL_LOADOUTS action, resolving references to the user's minted item ids by name. Opt-in checkbox appears while a chip is active. If the active sport got a loadout and the board is empty, it auto-loads so the user lands on a packed board
- [x] **Bulk-add undo** — commit snapshots inventory, draft, checks, pack chips, sample flag, and store state; the toast's one-shot Undo (new QA_RESTORE action) restores all of it
- [x] **CSV template fill-and-upload** — CSV Template / Upload CSV buttons in the Quick Add modal; parseCSV + csvToGearLines in parse.js convert rows to grammar lines feeding the existing preview/commit pipeline (decided 2026-08-07: keep - spreadsheets are how people already inventory gear)

## v1.15 — UI polish (moved from the old v1.05)

- [x] Bigger logo (shipped 2026-08-05, commit 464a2a0)
- [ ] File menu (consolidate Import / Export / About into one menu instead of separate topbar buttons)
- [ ] Condensed indicator button for sample gear (currently the indicator + toggle button take two slots)
- [ ] Smaller dark/light switch
- [ ] No footer
- [ ] Print mode in packing list opens in a new tab (instead of in-place toggle)
- [ ] Sample gear overhaul (refresh the curated SAMPLE_INVENTORY — items, icons, descriptions, balance across activities; bike/moto still have no sample items)
- [ ] Quick Add polish — per-row icon editing via the emoji picker, slots/capacity editing in the preview, migrate importXML's alert() to the toast (moved from backlog 2026-08-07)

---

## Backlog (unscheduled)

Ideas not yet slotted into a release. Add freely; we'll triage during planning.

Dropped 2026-08-07: **Hosted photo-scan (v2 of the AI flow)** — the out-of-app copy-prompt flow hasn't seen enough use to justify a Worker proxy + rate-limit stack. The research notes live in git history if it ever comes back. Also removed the two superseded onboarding ideas (**drag-and-drop gear categories**, **pick from sample gear**) — starter packs plus Quick Add's ALREADY IN dedup cover both.

---

## Done

- [x] **v1.05 — Quick Add onboarding + build fixes** (2026-08-02) — one modal covering three onboarding paths sharing a single parser, preview, and commit: free-text quick entry ("3x wool socks", pipe fields, weights), per-sport starter packs (74 curated brand-free items including new bike/moto/camp data), and a paste-from-AI photo flow (Copy AI Prompt + permissive parser). Empty-locker CTA, dedup with suffix numbering, persisted draft, toast, mobile bottom-sheet mode, 28 parser tests. Also fixed four latent bugs: dead inline onclick handlers in the bundled build (mobile tab bar, Etc-tab export, essential-modal close), missing #mTapHint element (mobile had no selection/rejection feedback), importXML wiping an in-progress loadout on every import, and the upload button stranding users who cancel the file dialog.
- [x] **Foundation: git + roadmap + audit** (2026-05-15) — initialized git repo, drafted ROADMAP.md from Google Doc, drafted docs/AUDIT.md with concrete simplification items

---

## Out of scope

Things deliberately not on the roadmap (for now):
- Backend / server / accounts — TrailKit is intentionally client-only with `localStorage` + file import/export
- Native mobile app — responsive web only
- Multi-user sharing — file-based sharing only
