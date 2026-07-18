# Resver — Brand & Theme Context

## The app

Resver — "A Quiet Place to Write." A warm, literary, distraction-free writing app for
novelists and screenwriters (projects → books → scenes, with cast, continuity, and style
notes). The feeling is paper-and-ink: calm, serious, unhurried. Dark is the design's home
theme; a light "cream paper" theme also exists.

## Color palette

**Single source of truth:** [`src/renderer/styles/global.scss`](../../src/renderer/styles/global.scss)
— the `:root` block (dark, the app's home theme) and the `prefers-color-scheme: light` /
`[data-theme='light']` blocks (cream paper). Maintain colors there only; this file never
copies hex values so they can't drift.

Roles to pull from those CSS custom properties:

- `--bg` / `--bg-tint` — background & panels (warm near-black in dark; cream in light)
- `--ink` / `--ink-2` / `--ink-3` — text, from primary parchment down to muted
- `--line` — hairlines & borders
- `--accent` — the signature warm clay / terracotta
- `--accent-secondary` — soft sage green (sparing)
- `--on-accent` — text/shapes sitting on an accent fill

> When handing this brief to an external tool that can't read the repo, paste the current
> `:root` values from `global.scss` inline first.

## Typography

- Display / body: a refined old-style serif (Source Serif 4 / Palatino / Iowan Old Style).
  Wordmark "Resver" is set in italic serif.
- UI labels: Inter (clean grotesque sans), often small-caps with wide letter-spacing.

## Design language & motifs

- A thin centered "rule" hairline sits under scene titles — a recurring signature element.
- Soft, warm, low-contrast; gentle rounded corners (6–18px scale); nothing harsh or neon.
- Restrained, editorial, manuscript-like. No gradients-as-decoration, no drop shadows on art.
- Mood words: quiet, warm, literary, focused, analog, tactile paper.

## What I want generated

A brand logo that all my apps will use (favicon, pwa, etc...)

## Constraints for the image

- Use ONLY the palette above (`global.scss`). Warm clay (`--accent`) and cream (`--ink`) on
  warm-dark (`--bg`) is the core combination; sage (`--accent-secondary`) is a sparing secondary.
- Aesthetic: warm, literary, calm, minimal. Avoid: blue/indigo, neon, cold grays, glossy 3D,
  busy detail, generic "tech" gradients, stock quill cliches unless explicitly asked.
- If an app icon: must read clearly at 32px, work masked into both a circle and a rounded
  square, and keep a clear centered subject with breathing room.
