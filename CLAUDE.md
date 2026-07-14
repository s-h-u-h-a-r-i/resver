# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `bun run start` — run the app in dev mode (Electron Forge + Vite, with HMR for the renderer)
- `bun run package` — package the app without building installers
- `bun run make` — build platform installers (deb/rpm/zip/squirrel)
- `bun run publish` — publish via Electron Forge
- `bun run lint` — ESLint (`.ts`/`.tsx`) + Prettier check
- `bun run format` — Prettier write
- `bun run gen:types` — regenerate `src/shared/database.types.ts` from the local Supabase instance (`supabase gen types typescript --local`); run after any migration/schema change

No test suite is configured yet.

### Local Supabase

The backend is a local-only Supabase instance (`supabase/` holds `config.toml`/migrations). Start it with `supabase start` before running the app or `gen:types`. Default local ports: API `54321`, DB `54322`, Studio `54323`, Inbucket `54324`.

## Architecture

Electron Forge + Vite app with a SolidJS renderer, TypeScript throughout, `bun` as package manager. Three separate Vite builds are wired in `forge.config.ts`, one per Electron process, each with its own config (`vite.main.config.ts`, `vite.preload.config.ts`, `vite.renderer.config.ts`):

- **`src/main/`** — Electron main process (Node context). Entry: `src/main/index.ts`.
- **`src/preload/`** — preload scripts, bridges main and renderer via `contextBridge`. Entry: `src/preload/index.ts`.
- **`src/renderer/`** — SolidJS UI (browser context, no Node APIs). Entry: `src/renderer/main.tsx` → `App.tsx`.
- **`src/shared/`** — code safe to import from any process (types, constants, pure functions only — no `electron`, no Node built-ins, no DOM/browser globals). Currently holds `database.types.ts`, the generated Supabase schema types.

`src/shared/database.types.ts` is generated output — never hand-edit it. Regenerate it with `bun run gen:types` after any schema/migration change.

The `@/*` path alias maps to `src/*` and is configured identically in `tsconfig.json` and all three Vite configs — use it instead of relative `../../` imports.

### Feature folder convention

Business logic (both `src/main/features/*` and `src/renderer/features/*`) is organized by feature, not by technical layer (no `services/`, `repositories/`, `components/` catch-all folders — a prior project mixed features together this way and it became unmanageable). Each feature folder uses a fixed, generic set of filenames so purpose is inferable from the name alone, never from the contents:

```
src/main/features/<feature>/
  index.ts    — business logic; registers IPC handlers (ipcMain.handle). Never imports the Supabase client directly.
  db.ts       — the ONLY file allowed to import the Supabase client for this feature.
  types.ts    — feature-local types not already in src/shared/database.types.ts.

src/renderer/features/<feature>/
  index.tsx   — the component itself (its export), no separate barrel file.
  hook.ts     — Solid hook(s) wrapping window.api calls for this feature.
  types.ts    — view-model types local to this component, if any.
```

Rule for growth: when `index.ts`/`db.ts`/`types.ts` outgrows a single file, promote it to a same-named folder with an `index.ts` barrel inside (e.g. `db.ts` → `db/index.ts` + `db/profile.ts` + `db/orders.ts`). The import path from outside the feature never changes — callers always import from `./db` or `./types` regardless of whether it resolves to a file or a folder. Split further by sub-concern inside the folder, not by re-introducing type-based top-level folders.

IPC channel names are defined once in `src/shared/ipc-channels.ts` and imported by both `main` (handler registration) and `preload` (invoke calls) — never hardcode a channel string in more than one file.
