# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — Next.js dev server on http://localhost:3000
- `npm run build` — production build
- `npm run start` — serve the production build (run `build` first)
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, `core-web-vitals` + TypeScript rules)
- `npx tsc --noEmit` — typecheck (no `typecheck` script exists)
- No test runner is configured. There is no way to run a single test yet.

## Stack and layout

- Next.js 16 App Router, React 19, TypeScript (strict), Tailwind CSS v4 via `@tailwindcss/postcss`.
- Routes live in `app/`: `layout.tsx` (root layout, Geist fonts via `next/font/google`), `page.tsx` (home), `globals.css` (Tailwind import plus CSS variables for light/dark background and foreground).
- Import alias `@/*` maps to the repo root (`tsconfig.json`).
- `next-env.d.ts` and `.next/` are generated. Do not edit them.

## Project intent

`README.md` (in Spanish) describes the product: Arcade Vault, an online gaming platform where users play and compete for points. The codebase is still the unmodified `create-next-app` scaffold, so there is no game logic, data layer, or auth yet.

The README says the project follows Spec Driven Design, based on `/spec` and `/spec-impl`. Those directories do not exist yet. Check for them before assuming they hold specs.

## Conventions

- Write user-facing text in the language the existing content uses. The README is Spanish; the current UI strings are English.
- Next.js 16 differs from earlier versions. Read `node_modules/next/dist/docs/` before writing framework code, as `AGENTS.md` requires.
