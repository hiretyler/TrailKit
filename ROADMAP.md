# TrailKit Roadmap

This is the source of truth for what's planned and what's next. Sessions in Claude Code start by picking the next unblocked item.

Format conventions:
- `[ ]` not started, `[~]` in progress, `[x]` done
- Each version is a release milestone. Items inside a version ship together.
- Technical debt and architecture work lives in [docs/AUDIT.md](docs/AUDIT.md) and is pulled into a version when it unblocks a feature.

---

## Current state

- **Released:** v1.0 — `TrailKit-1.0.html` at repo root. Single-file HTML app, no build, no deps.
- **Working on:** Foundation work for sustainable development (git, build, modules, tests, GitHub). Not yet versioned as a release.

---

## v1.05 — UI polish

- [ ] Bigger logo
- [ ] File menu (consolidate Import / Export / About into one menu instead of separate topbar buttons)
- [ ] Condensed indicator button for sample gear (currently the indicator + toggle button take two slots)
- [ ] Smaller dark/light switch
- [ ] No footer
- [ ] Print mode in packing list opens in a new tab (instead of in-place toggle)

## v1.1 — Add Your Gear onboarding (first pass)

- [ ] Onboarding: **Activity Starter Pack method** — pick an activity, get a curated starter inventory you can edit
- [ ] Onboarding: **Simple list method** — type names line-by-line, app infers types
- [ ] Onboarding: **Drag-and-drop gear categories method** — drag category bubbles into your inventory
- [ ] Sample gear overhaul (refresh the curated SAMPLE_INVENTORY — items, icons, descriptions, balance across activities)

## v1.15 — Activity onboarding + power import methods

- [ ] Onboarding: **Pick your activities** (gate later onboarding methods on which sports you actually do)
- [ ] Onboarding: **Pick from sample gear** — checkbox UI over SAMPLE_INVENTORY, pulls selected items into Your Gear
- [ ] Onboarding: **CSV template fill-and-upload** — downloadable template, parsed on upload (reuses XML import scaffolding)
- [ ] Onboarding: **Picture of gear + prompt → LLM** — user photographs their gear, app sends to an LLM, gets back structured items

---

## Backlog (unscheduled)

Ideas not yet slotted into a release. Add freely; we'll triage during planning.

- _(empty — add as ideas come up)_

---

## Done

- [x] **Foundation: git + roadmap + audit** (2026-05-15) — initialized git repo, drafted ROADMAP.md from Google Doc, drafted docs/AUDIT.md with concrete simplification items

---

## Out of scope

Things deliberately not on the roadmap (for now):
- Backend / server / accounts — TrailKit is intentionally client-only with `localStorage` + file import/export
- Native mobile app — responsive web only
- Multi-user sharing — file-based sharing only
