# TrailKit Roadmap

This is the source of truth for what's planned and what's next. Sessions in Claude Code start by picking the next unblocked item.

Format conventions:
- `[ ]` not started, `[~]` in progress, `[x]` done
- Each version is a release milestone. Items inside a version ship together.
- Technical debt and architecture work lives in [docs/AUDIT.md](docs/AUDIT.md) and is pulled into a version when it unblocks a feature.

---

## Current state

- **Released:** v1.1 — `releases/TrailKit-1.1.html`, live on GitHub Pages and tgeddes.dev/trailkit (2026-08-07).
- **Working on:** v1.15 UI polish implemented in `src/` (2026-08-07); ready to cut whenever. One item deferred: slots/capacity editing in the Quick Add preview.

---

## v1.15 — UI polish (implemented 2026-08-07, release not yet cut)

- [x] Bigger logo (shipped 2026-08-05, commit 464a2a0; +15% again 2026-08-07: 31px desktop / 24px / 21px tiers)
- [x] File menu — one topbar "File ▾" popover holding Upload / Type-or-Paste / Download / Packing Lists / CSV / About; replaced the import popover, the export modal, the footer buttons, and the ? help button. Mobile Etc-tab import/export delegate to it
- [x] Condensed indicator button for sample gear — the toggle button IS the indicator now ("⬡ Sample Gear" + amber pulse when on)
- [x] Smaller dark/light switch — icon-only, 34px track (was label + 44px)
- [x] No footer — bottom bar removed; version lives in About and the mobile Etc tab
- [x] Print in packing list opens a print view in a new tab (serializes the checked state, forces the B/W print style, auto-opens the print dialog); replaced the in-place print-mode toggle
- [x] Sample gear overhaul — 16 new items fill bike/moto/camp (was zero bike/moto), icon fixes (puffy, belay), MIPS helmet retyped bike/Safety; every sport now has a sample loadout (new Trail Ride, Dual-Sport Day, Weekend Camp — each slot-budget-exact)
- [x] Quick Add polish — per-row icon editing via the emoji picker (writes the emoji into the source line), importXML's alert() migrated to the toast
- [ ] Quick Add: slots/capacity editing in the preview (deferred - slots have no line-grammar token yet; decide whether to extend the grammar or edit rows directly)

---

## Backlog (unscheduled)

Ideas not yet slotted into a release. Add freely; we'll triage during planning.

Dropped 2026-08-07: **Hosted photo-scan (v2 of the AI flow)** — the out-of-app copy-prompt flow hasn't seen enough use to justify a Worker proxy + rate-limit stack. The research notes live in git history if it ever comes back. Also removed the two superseded onboarding ideas (**drag-and-drop gear categories**, **pick from sample gear**) — starter packs plus Quick Add's ALREADY IN dedup cover both.

---

## Done

- [x] **v1.1 — Onboarding follow-ups** (2026-08-07) — starter loadouts (STARTER_LOADOUTS per sport installed on commit via INSTALL_LOADOUTS, references resolved to minted item ids by name, opt-in checkbox, auto-load onto an empty board for the active sport); bulk-add undo (full pre-commit snapshot in the toast's one-shot Undo via QA_RESTORE); post-commit backpack nudge (toast's "Set Pack Size(s)" chains the Edit Item modal through each added pack); CSV template fill-and-upload (parseCSV + csvToGearLines transcode rows into the line grammar, same preview/commit pipeline). New curated-data invariant tests + 11 CSV parser tests (75 total). Deployed to GitHub Pages and tgeddes.dev/trailkit.
- [x] **v1.05 — Quick Add onboarding + build fixes** (2026-08-02) — one modal covering three onboarding paths sharing a single parser, preview, and commit: free-text quick entry ("3x wool socks", pipe fields, weights), per-sport starter packs (74 curated brand-free items including new bike/moto/camp data), and a paste-from-AI photo flow (Copy AI Prompt + permissive parser). Empty-locker CTA, dedup with suffix numbering, persisted draft, toast, mobile bottom-sheet mode, 28 parser tests. Also fixed four latent bugs: dead inline onclick handlers in the bundled build (mobile tab bar, Etc-tab export, essential-modal close), missing #mTapHint element (mobile had no selection/rejection feedback), importXML wiping an in-progress loadout on every import, and the upload button stranding users who cancel the file dialog.
- [x] **Foundation: git + roadmap + audit** (2026-05-15) — initialized git repo, drafted ROADMAP.md from Google Doc, drafted docs/AUDIT.md with concrete simplification items

---

## Out of scope

Things deliberately not on the roadmap (for now):
- Backend / server / accounts — TrailKit is intentionally client-only with `localStorage` + file import/export
- Native mobile app — responsive web only
- Multi-user sharing — file-based sharing only
