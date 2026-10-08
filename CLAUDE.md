# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — Next.js dev server on http://localhost:3000
- `npm run build` — production build
- `npm run start` — serve the production build (run `build` first)
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, `core-web-vitals` + TypeScript rules)
- `npx tsc --noEmit` — typecheck (no `typecheck` script exists)
- No test runner is configured. Verification is `build` + `lint` + `tsc` plus manual checks in the browser.

## Skills

- Usa siempre `frontend-design` cuando requieras hacer interfaces de usuario (including new game covers in `app/globals.css`).
- Project skills live in `.claude/skills/` (mirrored in `.agents/skills/`). All are user-invoked only (`disable-model-invocation: true`):
  - `/spec <feature>` — guided spec designer. Writes `specs/NN-slug.md` in `Borrador` state. Never writes code.
  - `/spec-impl <NN-slug>` — implements a spec only if its state is approved (`Aprobado`/`Approved`). Creates branch `spec-NN-slug` (see `specs/.spec-config.yml`, `AutoCreateBranch: true`) and works step by step with diff pauses.
  - `/add-game <name | NN-folder>` — writes the spec for a new game, ported from `references/started-games/` or described from scratch. Its "Fase 3" is the integration contract every game must follow (see Games below). Support files: `template.md`, `porting.md`.
- `spec` and `spec-impl` come from `Klerith/fernando-skills` (`skills-lock.json`). `add-game` is local to this repo.

## Workflow (Spec Driven Design)

1. `/spec` or `/add-game` writes a spec in `specs/` with state `Borrador`.
2. A person reviews it and changes the state to `Aprobado` by hand.
3. `/spec-impl NN-slug` implements it on its own branch; the branch is merged to `main` through a GitHub PR.
4. Set the spec state to `Implementado` when done. Specs 01–09 are implemented.

Read the relevant spec before changing a feature; the "Decisiones" section explains why things are the way they are.

| Spec | Feature |
| --- | --- |
| 01 | Visual screens MVP (library, detail, player, hall of fame, login) |
| 02 | Landing page at `/` |
| 03 | About page with contact form via Resend |
| 04 | Supabase: game catalog and scores |
| 05 | Asteroides playable in the player |
| 06 | Leaderboard per player and per game |
| 07 / 08 / 09 | Tetris / Arkanoid / Snake playable |

## Stack and layout

- Next.js 16 App Router, React 19, TypeScript (strict). Styling is plain CSS in `app/globals.css` (theme variables, neon/CRT classes, `cover-*` game covers). Tailwind v4 is installed via `@tailwindcss/postcss` but not imported.
- Fonts via `next/font/google`: Press Start 2P (`--pixel`), JetBrains Mono / Courier Prime (`--mono`).
- Supabase (`@supabase/supabase-js`) for data, Resend for contact email, `server-only` to guard server modules.
- Import alias `@/*` maps to the repo root.
- `next-env.d.ts` and `.next/` are generated. Do not edit them.

### Routes (`app/`)

- `/` landing, `/games` library, `/juegos/[id]` game detail, `/juegos/[id]/jugar` player, `/salon` hall of fame (`?cat=` filter), `/acerca` about + contact, `/login` fake login.
- `POST /api/scores` — validates `{ game, name, score }` and inserts into `scores`; calls `revalidatePath` on `/salon`, `/games`, `/juegos/[id]`. Responses: 400 `invalid`, 500 `db_failed`.
- `POST /api/contact` — validates and sends email via Resend. Responses: 400 `invalid`, 500 `send_failed`.
- `/`, `/games`, `/juegos/[id]/jugar` use `revalidate = 60`. `/salon` is dynamic.

### Code map

- `components/<area>/` — UI per screen (`home`, `library`, `about`, `hall`, `player`) plus `nav.tsx`.
- `lib/games.ts` — catalog reads (`getGames`, `getGame`).
- `lib/scores.ts` — score validation shared by client and API (no React, no Supabase imports).
- `lib/scores-db.ts` — score reads/writes (`getBestScores`, `getGameStats`, global ranking, `insertScore`).
- `lib/contact.ts` / `lib/send-contact-email.ts` — contact validation / Resend sender (server only).
- `lib/supabase/public.ts` — publishable-key client, read only (RLS allows only `select`).
- `lib/supabase/admin.ts` — secret-key client, bypasses RLS, `server-only`, created lazily.
- `lib/use-session-user.ts` — fake session in `localStorage` key `av_user` (`{ name }`, uppercase, max 10 chars). No real auth.
- `lib/data/` — shared types and static content (home page data).

### Database (Supabase)

- Tables `games` (catalog: `id, title, short, long, cat, cover, color, best, plays`) and `scores`. View `best_scores` (best run per name per game) and function `global_ranking(p_cat, p_limit)`.
- `cat` ∈ `ARCADE | PUZZLE | SHOOTER | VERSUS`; `color` ∈ `cyan | magenta | green | yellow` (DB `check`).
- Migrations in `supabase/migrations/<YYYYMMDDHHMMSS>_<slug>.sql`. Apply them with the Supabase MCP (`.mcp.json`) `apply_migration` only when the user decides.
- Env vars (see `.env.template`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_DB_PASSWORD`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`.

## Games

Playable: `asteroides`, `tetris`, `arkanoid`, `snake`. and more ... (see `\references\implemented-games.md`) when you need to implement a new game.

- Pure engine in `lib/games/<slug>/engine.ts` (`createGame()`, `step(state, input, dt)`, clamped `dt`) and `render.ts` (`draw(ctx, state)`). No `react`, `next` or `document` in `lib/games/<slug>/`.
- `components/player/<slug>-canvas.tsx` owns the game: state in `useRef`, `requestAnimationFrame` loop cancelled on cleanup, keyboard on `window`, side panel with score/level/controls.
- Commands arrive as props (`paused`, `endRequest`, `restartRequest`); `onChange(snapshot)` fires only when `score`, `lives`, `level`, `lines` or `status` change. Shared types in `lib/games/types.ts`.
- Register the canvas in `lib/games/registry.ts` (`SURFACES`, with `showLives`). `components/player/game-player.tsx` renders it and saves the score via `POST /api/scores`.
- A new game also needs a migration (insert into `games`, or rename an existing catalog id) and a `cover-<slug>` class in `app/globals.css`.
- `references/` holds source material (original vanilla JS games, UI templates, assets). Read it; never modify it.

## Conventions

- User-facing text (UI, specs, code comments, migrations) is in Spanish.
- Next.js 16 differs from earlier versions. Read `node_modules/next/dist/docs/` before writing framework code, as `AGENTS.md` requires.
- After finishing a spec, commit any leftover uncommitted changes in the tree.
