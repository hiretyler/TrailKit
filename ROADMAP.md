# TrailKit Roadmap

This is the source of truth for what's planned and what's next. Sessions in Claude Code start by picking the next unblocked item.

Format conventions:
- `[ ]` not started, `[~]` in progress, `[x]` done
- Each version is a release milestone. Items inside a version ship together.
- Technical debt and architecture work lives in [docs/AUDIT.md](docs/AUDIT.md) and is pulled into a version when it unblocks a feature.

---

## Current state

- **Released:** v1.05 — `releases/TrailKit-1.05.html`. First release cut from the `src/` build pipeline.
- **Working on:** Onboarding follow-ups (v1.1).

---

## v1.1 — Onboarding follow-ups (next session)

- [ ] **Post-commit backpack nudge** — when a Quick Add commit includes Backpack items, make the toast actionable ("N packs added - set their sizes?") deep-linking into the existing Edit Item modal, since backpacks are the one type a text line under-specifies (slots, max load, pocket flags)
- [ ] **Starter loadouts** — pack chips optionally install a ready-made loadout per sport, not just inventory items (install items first; loadouts reference item ids)
- [ ] **Bulk-add undo** — snapshot USER_INVENTORY before a Quick Add commit and offer one-shot undo from the toast
- [ ] **CSV template fill-and-upload** — downloadable template, parsed on upload. May be superseded by the Quick Add line grammar; decide at session start whether it still earns its keep

## v1.15 — UI polish (moved from the old v1.05)

- [ ] Bigger logo
- [ ] File menu (consolidate Import / Export / About into one menu instead of separate topbar buttons)
- [ ] Condensed indicator button for sample gear (currently the indicator + toggle button take two slots)
- [ ] Smaller dark/light switch
- [ ] No footer
- [ ] Print mode in packing list opens in a new tab (instead of in-place toggle)
- [ ] Sample gear overhaul (refresh the curated SAMPLE_INVENTORY — items, icons, descriptions, balance across activities; bike/moto still have no sample items)

---

## Backlog (unscheduled)

Ideas not yet slotted into a release. Add freely; we'll triage during planning.

- **Hosted photo-scan (v2 of the AI flow)** — Cloudflare Worker proxy + Claude Haiku/Sonnet with Turnstile and per-IP rate limits, so the photo flow works without leaving the app. Only worth building if the out-of-app flow sees real use. Research notes: Google Vision rejected (generic labels, 10-object cap, unsecurable browser keys); multimodal LLM is the only viable recognizer.
- **Onboarding: drag-and-drop gear categories** — drag category bubbles into your inventory (from the old v1.1 list; superseded for now by starter packs)
- **Onboarding: pick from sample gear** — checkbox UI over SAMPLE_INVENTORY, pulls selected items into Your Gear (the ALREADY IN dedup in Quick Add covers most of this need)
- **Quick Add polish** — per-row icon editing via the emoji picker, slots/capacity editing in the preview, migrate importXML's alert() to the toast

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
