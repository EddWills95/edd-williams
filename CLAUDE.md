# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Edd Williams' personal website — a single-page site (about, experience, projects, contact) built with SvelteKit (Svelte 3, using the legacy `routes`/`__layout.svelte` file-based routing, not the newer `src/routes/+page.svelte` convention) and Tailwind CSS. Uses `@sveltejs/adapter-static` to produce a static site, served via Nginx in a Docker container.

## Commands

Package manager is Yarn (see `yarn.lock`, `.npmrc`, and `Dockerfile` which runs `yarn install`/`yarn build`).

- `yarn dev` — start dev server (`svelte-kit dev`)
- `yarn build` — production build (`svelte-kit build`), outputs to `build/`
- `yarn preview` — preview the production build
- `yarn check` — type-check via `svelte-check`
- `yarn check:watch` — type-check in watch mode
- `yarn lint` — Prettier check + ESLint over the whole repo
- `yarn format` — Prettier write

There is no test suite in this project.

## Architecture

- Single page app: `src/routes/index.svelte` composes the page from components in `src/components/` in a fixed order — `Header`, `TopSection`, `About`, `Experience`, `Projects`, `Contact` — each section wrapped in `<section class="base-section">` with an `<span class="anchor" id="...">` above it for in-page nav (see `Header`, which links to these anchor IDs).
- `src/routes/__layout.svelte` is the root layout; it only imports global styles (`src/app.css`) and renders `<slot />`.
- Styling is Tailwind-first, with custom theme extensions (colors like `bdazzled-blue`/`burnt-sienna`/`gunmetal`, a `translate-scroll` keyframe animation, and a `source-code` background image) defined in `tailwind.config.cjs`. Shared section-level classes (`.base-section`, `.section-break`, `.anchor`) live in `src/app.css`.
- Static assets (profile/company images as `.webp`, favicon) live in `static/` and are referenced directly by path (e.g. in `Experience`/`Projects`).
- Svelte preprocessing uses `svelte-preprocess` with PostCSS enabled (`svelte.config.js`), plus Vite preprocessing via the `experimental.useVitePreprocess` flag.

## Formatting

Prettier config (`.prettierrc`): tabs, single quotes, no trailing commas, 100 print width. ESLint extends `eslint:recommended` + `@typescript-eslint/recommended`, with the `svelte3` processor for `.svelte` files. Always run `yarn lint` (or `yarn format` to auto-fix) before finishing changes.

## Deployment

Pushes to `main` trigger `.github/workflows/push-to-docker.yml`, which builds a multi-arch (amd64/arm64) Docker image via the `Dockerfile` (Node build stage → static files served by Nginx) and pushes it to Docker Hub as `eddwills95/edd-williams:latest`.
