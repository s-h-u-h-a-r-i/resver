# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Feature folder convention

Business logic is organized by feature, not by technical layer — no `services/`, `repositories/`, `components/` catch-all folders. A prior project mixed features together this way and it became unmanageable. Each feature folder uses a fixed, generic set of filenames so purpose is inferable from the name alone, never from the contents:

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

Rule for growth: when `index.ts`/`db.ts`/`types.ts` outgrows a single file, promote it to a same-named folder with an `index.ts` barrel inside (e.g. `db.ts` → `db/index.ts` + `db/profile.ts` + `db/orders.ts`). The import path from outside the feature never changes. Split further by sub-concern inside the folder, not by re-introducing type-based top-level folders.

IPC channel names are defined once in `src/shared/ipc-channels.ts` and imported by both `main` and `preload` — never hardcode a channel string in more than one file.

`src/shared/database.types.ts` is generated output (`bun run gen:types`) — never hand-edit it.

## Styling

`src/renderer/styles/global.scss` is tokens + reset only, not a component library. Opinionated visual styling for an actual UI element (e.g. an `Input`'s border/focus ring/placeholder color) belongs in that component, not in the global stylesheet — otherwise it leaks onto every raw tag and fights the component's own variants.
