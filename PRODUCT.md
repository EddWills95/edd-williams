# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primarily the site owner (Edd Williams) and people who already know him or find him through his own links (network, GitHub, self-hosted project communities like Umbrel). Not optimized to convert cold recruiter traffic — it's a personal showcase and documentation space, not a job-hunting funnel.

## Product Purpose

A personal website that documents and shares what Edd actually builds — professional experience, side projects, and hands-on hardware/software work — for its own sake, not as a persuasion tool.

## Positioning

Edd is a hands-on builder, not just a software engineer who ships CRUD apps. The differentiator is real, running, self-hosted infrastructure (TrueNAS, Dokploy, Home Assistant, a RaspberryPi solar/battery dashboard, an Umbrel Bitcoin node) as proof of range, not claims about it. The site should lean into this identity — e.g. surfacing live data from systems he actually built and runs (battery savings, solar generation) — rather than reading as a generic "software engineer portfolio" template.

## Operating Context

- Statically built SvelteKit site (`adapter-static`), served via Nginx in Docker; deploys on push to `main` via GitHub Actions (`push-to-docker.yml`) to Docker Hub.
- Edd runs a home lab (TrueNAS, Dokploy + Traefik, Home Assistant) that is a real source of content/evidence for this site, not just infrastructure metaphor.
- A small proxy service (planned, to be hosted under the `edd-williams` project in Dokploy) will hold a restricted Home Assistant token server-side and expose a minimal public endpoint for live energy/battery stats — the site must never talk to Home Assistant directly or embed HA credentials client-side.

## Capabilities and Constraints

- No backend today beyond the planned energy-stats proxy; everything else is static HTML/CSS/JS.
- Content (CV/experience entries, project descriptions) must reflect Edd's real history — never fabricate roles, metrics, or projects.
- Live/near-live data (once the proxy exists) must come from real sensors, not mocked or invented numbers, though values may be rounded/obscured if Edd prefers not to show exact figures.

## Brand Commitments

- Name: Edd Williams. GitHub: EddWills95. Secondary project site: inventing-mostly.com (where more of his projects actually live).
- Incumbent visual system (not necessarily binding — actively under redesign as of this session): dark navy/"gunmetal" background, burnt-sienna accent, Raleway typeface, a recurring `—E—` section-divider motif, and an "offset-border" drop-shadow card treatment used across photos/projects.

## Evidence on Hand

- Real CV/experience history: Runna (Senior SWE, Growth squad, 2025–present), OakNorth Business Banking (Mid→Senior SWE, 2023–2025), LimeJump (Full Stack Engineer, 2022–2023), OVO Energy (Full Stack Engineer, 2022–2023), Intuit/QuickBooks Payroll UK (Junior→Mid Engineer, 2018–2020), plus earlier University of Hertfordshire and We Got Coders entries.
- Real side projects: Umbrel (Bitcoin/Lightning RaspberryPi node, contributed UI/bugfixes), EPSolar Dashboard (RaspberryPi solar charge controller dashboard), RaspberryPi Thermostat (first hardware/software project).
- Real live home-energy sensors available via Home Assistant (confirmed this session): lifetime battery-system savings (~£60.25, ticking upward), lifetime solar generation (~211 kWh), today's solar/battery savings, battery state of charge (%) and charge/discharge power (W).
- No testimonials, case studies, press, or third-party proof exist — do not invent any.

## Product Principles

1. Real over decorative — live data, real projects, and true history are the differentiators; never fabricate content or numbers to seem more impressive.
2. Hands-on builder identity — hardware, self-hosted infrastructure, and running systems are as central to the story as software engineering roles.
3. Personal pace, not a conversion funnel — this is documentation and sharing, not a lead-gen page; don't over-optimize for urgency or CTAs a personal site doesn't need.
4. Craft over AI-generic default — favor distinct, deliberate visual/interaction choices over safe defaults (a live audit already caught a copy-pasted "AI slop" glow shadow and default-safe layout choices in the incumbent build).
5. Security-conscious about home infrastructure — anything surfacing home-lab data must go through a proxy that never exposes Home Assistant credentials or unrestricted access to the browser.

## Accessibility & Inclusion

No formal requirement was set by the user, but this session's audit found real WCAG AA violations (insufficient text contrast, skipped heading levels) that are being fixed. Treat WCAG AA as the working bar for all future UI work on this site.
