# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Edd Williams' personal website — a single-page site (about, experience, projects, contact) built with SvelteKit 2 and Svelte 5 (components still use legacy Svelte syntax — `export let`, `$:`, `on:click` — which Svelte 5 supports) and Tailwind CSS. Uses `@sveltejs/adapter-static` to produce a static site, served via Nginx in a Docker container.

## Commands

Package manager is Yarn (see `yarn.lock`, `.npmrc`, and `Dockerfile` which runs `yarn install`/`yarn build`).

- `yarn dev` — start dev server (`vite dev`)
- `yarn build` — production build (`vite build`), outputs to `build/`
- `yarn preview` — preview the production build
- `yarn run check` — type-check via `svelte-check` (plain `yarn check` is Yarn's own built-in command)
- `yarn check:watch` — type-check in watch mode
- `yarn lint` — Prettier check + ESLint over the whole repo
- `yarn format` — Prettier write

There is no test suite in this project.

## Architecture

- Single page app: `src/routes/+page.svelte` composes the page from components in `src/components/` in a fixed order — `Header`, `TopSection`, `About`, `Experience`, `Projects`, `Contact` — each section wrapped in `<section class="base-section">` with an `<span class="anchor" id="...">` above it for in-page nav (see `Header`, which links to these anchor IDs).
- `src/routes/+layout.svelte` is the root layout; it only imports global styles (`src/app.css`) and renders `<slot />`. `src/routes/+layout.js` sets `prerender = true` for the static adapter.
- Styling is Tailwind-first, with custom theme extensions (colors like `bdazzled-blue`/`burnt-sienna`/`gunmetal`, a `translate-scroll` keyframe animation, and a `source-code` background image) defined in `tailwind.config.cjs`. Shared section-level classes (`.base-section`, `.section-break`, `.anchor`) live in `src/app.css`.
- Static assets (profile/company images as `.webp`, favicon) live in `static/` and are referenced directly by path (e.g. in `Experience`/`Projects`).
- Svelte preprocessing uses `vitePreprocess()` from `@sveltejs/vite-plugin-svelte` (`svelte.config.js`); Vite config is `vite.config.js`.

## Formatting

Prettier config (`.prettierrc`): tabs, single quotes, no trailing commas, 100 print width. ESLint 9 flat config (`eslint.config.js`) using `typescript-eslint` and `eslint-plugin-svelte`. Always run `yarn lint` (or `yarn format` to auto-fix) before finishing changes.

## Deployment

There is no CI workflow in this repo (the Docker Hub push workflow was removed). The `Dockerfile` (Node build stage → static files served by Nginx) is built and deployed by Dokploy; trigger a deploy there after pushing to `main`.
