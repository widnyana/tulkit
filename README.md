# tulkit

[![Netlify Status](https://api.netlify.com/api/v1/badges/a7a6bfd2-f047-4bb5-83fb-feac5383bda7/deploy-status)](https://app.netlify.com/projects/thetulkit/deploys)

Solving your tiny, annoying problems so you can get back to the big ones.

**Visit**: <https://tulkit.widnyana.web.id/>

## The problem this solves

You need to compare two `.env` files. Or decode one Base64 string. Or generate a QR code, once. So you search for it, land on one of those tool sites, and get a cookie banner, three ad slots, and an email-capture modal — all before the input field loads.

tulkit is the opposite bet: a handful of single-purpose tools that do exactly one thing, load fast, and don't want anything from you. No account, no tracking, no server round-trip.

## The tools

| Tool | What it does |
| --- | --- |
| [.env Comparator](https://tulkit.widnyana.web.id/env-compare) | Diff two `.env` files side by side |
| [NetPlan](https://tulkit.widnyana.web.id/ip-planner) | Plan IP address subnets |
| [IP Calculator](https://tulkit.widnyana.web.id/ipcalc) | Subnet math without the mental arithmetic |
| [Random String Generator](https://tulkit.widnyana.web.id/random-string) | Passwords, tokens, ids — with the character sets you want |
| [Invoice Generator](https://tulkit.widnyana.web.id/invoice) | Build invoices and export them as PDF |
| [QR Code Generator](https://tulkit.widnyana.web.id/qr-gen) | Turn text or URLs into QR codes |
| [JSON Schema Visualizer](https://tulkit.widnyana.web.id/json-schema) | See the shape of a JSON Schema instead of squinting at it |
| [Base64 Encoder / Decoder](https://tulkit.widnyana.web.id/base64) | Encode and decode, both directions |
| [Cron Expression Generator](https://tulkit.widnyana.web.id/cron) | Write cron schedules and read them back in plain English |
| [Tire Pressure Calculator](https://tulkit.widnyana.web.id/tire-pressure) | Pressure conversion and sizing for your tires |

## Where your data goes

Nowhere. Every tool runs entirely in your browser — the code ships once and executes locally, so whatever you paste into a tool never leaves your machine.

One honest exception: the JSON Schema Visualizer can resolve `$ref`s pointing at remote schemas, and that lookup goes through a small server-side proxy (the only server code in the project) because browsers block cross-origin requests.

## Development

Requires Node and [pnpm](https://pnpm.io/) (both pinned in `.tool-versions` — `pnpm install` picks up the right versions via mise or a compatible tool manager).

```sh
pnpm install
pnpm dev
```

Other commands you'll actually use:

```sh
pnpm build      # production build — also the type gate
pnpm lint       # biome check
pnpm test       # unit tests (node:test)
pnpm test:e2e   # Playwright (Chromium)
```

### The gitleaks bit

A pre-commit hook scans staged changes for secrets. It wires itself up on `pnpm install` via `core.hooksPath`, but you need the binary installed once:

```sh
mise use -g gitleaks@latest
```
