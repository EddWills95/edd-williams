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

- Statically built SvelteKit site (`adapter-static`), served via Nginx in Docker; built from the `Dockerfile` and deployed by Dokploy (no GitHub Actions workflow remains).
- Edd runs a home lab (TrueNAS, Dokploy + Traefik, Home Assistant) that is a real source of content/evidence for this site, not just infrastructure metaphor.
- A small proxy service (`energy-proxy/`, hosted under the `edd-williams` project in Dokploy) is live. It holds a restricted Home Assistant token server-side and exposes minimal public endpoints for live energy/battery stats (with a 60s stale-while-revalidate cache), an estimated "cups of tea" count derived from kettle power spikes, and build stats (Claude token/line/commit counts pushed from Edd's Mac). The site polls it through a shared, visibility-aware poller and must never talk to Home Assistant directly or embed HA credentials client-side.

## Capabilities and Constraints

- No backend beyond the energy/build-stats proxy; everything else is static HTML/CSS/JS.
- Content (CV/experience entries, project descriptions) must reflect Edd's real history — never fabricate roles, metrics, or projects.
- Live/near-live data (once the proxy exists) must come from real sensors, not mocked or invented numbers, though values may be rounded/obscured if Edd prefers not to show exact figures.

## Brand Commitments

- Name: Edd Williams. GitHub: EddWills95. Secondary project site: inventing-mostly.com (where more of his projects actually live).
- Incumbent look retained (gunmetal/burnt-sienna, self-hosted Raleway, Solar blueprint-style diagram); visual detail lives in DESIGN.md, not yet written.

## Evidence on Hand

- Real CV/experience history: Self Employed as Inventing Mostly (2026–present, including a Prodigies platform rebuild from Directus to Supabase on Next.js/React), Wise (Senior Frontend Engineer, 2026), Runna (Senior SWE, Growth squad, 2025–2026), OakNorth Business Banking (Mid→Senior SWE, 2023–2025), LimeJump (Full Stack Engineer, 2022–2023), OVO Energy (Full Stack Engineer, 2022–2023), Intuit/QuickBooks Payroll UK (Junior→Mid Engineer, 2018–2020), plus earlier University of Hertfordshire and We Got Coders entries.
- Real side projects: Umbrel (Bitcoin/Lightning RaspberryPi node, contributed UI/bugfixes), plus projects curated under inventing-mostly.com: Stash (wardrobe app, coming soon), onvif-protect-bridge (ONVIF cameras into UniFi Protect), Backcast (solar/battery simulation, in progress). Earlier hardware work: EPSolar Dashboard, RaspberryPi Thermostat.
- Real live home-energy sensors available via Home Assistant, now surfaced on the site: lifetime battery-system savings (~£60.25, ticking upward), lifetime solar generation (~211 kWh), today's solar/battery savings, battery state of charge (%) and charge/discharge power (W).
- No testimonials, case studies, press, or third-party proof exist — do not invent any.

## Product Principles

1. Real over decorative — live data, real projects, and true history are the differentiators; never fabricate content or numbers to seem more impressive.
2. Hands-on builder identity — hardware, self-hosted infrastructure, and running systems are as central to the story as software engineering roles.
3. Personal pace, not a conversion funnel — this is documentation and sharing, not a lead-gen page; don't over-optimize for urgency or CTAs a personal site doesn't need.
4. Craft over AI-generic default — favor distinct, deliberate visual/interaction choices over safe defaults (a live audit already caught a copy-pasted "AI slop" glow shadow and default-safe layout choices in the incumbent build).
5. Security-conscious about home infrastructure — anything surfacing home-lab data must go through a proxy that never exposes Home Assistant credentials or unrestricted access to the browser.

## Accessibility & Inclusion

No formal requirement was set by the user, but this session's audit found real WCAG AA violations (insufficient text contrast, skipped heading levels) that are being fixed. Treat WCAG AA as the working bar for all future UI work on this site.
