# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Tulkit — a collection of single-purpose, client-side web utilities. Live: https://tulkit.widnyana.web.id/. Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict), Tailwind v4, shadcn/ui. Deployed on Netlify.

## Commands

Package manager is **pnpm** (pinned 11.21.0 via `.tool-versions`; Node 22 in CI).

- `pnpm dev` — dev server (Turbopack; Node inspector enabled)
- `pnpm build` — production build (Turbopack). Also the type gate: `ignoreBuildErrors: false`, so types must pass.
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — `biome check --max-diagnostics 1000` (Biome is the sole linter/formatter; no ESLint/Prettier)
- `pnpm format` — `biome format --use-server --use-editorconfig=true --write --max-diagnostics 1000` (needs the Biome daemon running; if it errors with "No running instance", use `pnpm exec biome check --write` instead)
- `pnpm test` — `node --test --experimental-strip-types` (unit tests in `lib/**/*.test.ts`)
- `pnpm test:e2e` — Playwright (`e2e/*.spec.ts`, Chromium). Auto-starts `pnpm dev` via `webServer` and targets dev mode on purpose (React dev-time console assertions); first react-pdf compile is slow, hence 30s timeouts in specs.
- Single unit test: `node --test --experimental-strip-types lib/invoice/sample-data.test.ts`. Single e2e file: `pnpm test:e2e invoice.spec.ts` (no `--`: pnpm forwards args verbatim, and playwright treats everything after `--` as pass-through custom args, ignoring the file filter); by name: `pnpm test:e2e -g "Load sample"`.

**node:test constraints:** tests import with explicit relative `.ts` extensions (see `lib/invoice/validation.test.ts`) — the runner doesn't resolve the `@/` alias. `--experimental-strip-types` only strips types, so files using TS `namespace`/`enum` (e.g. `lib/qrcodegen.ts`) cannot be imported by node:test at all.

Biome's lint scope is explicit (`biome.json` `files.includes`): `app/**`, `lib/**`, and root config files. **`components/**` and `config.ts` are not linted.**

## CodeGraph

This repo is indexed by CodeGraph (`.codegraph/` at root). Reach for it BEFORE grep/find/Read when locating or understanding code.

**MCP** (one tool): `codegraph_explore` — pass a question or a bag of symbol/file names; returns verbatim line-numbered source grouped by file + call paths (including dynamic-dispatch hops) + blast radius. One call usually answers the whole question. (The MCP surface also exposes `codegraph_node`.)

**CLI** (`codegraph <command>`, always works without MCP):
- Query/read: `explore <query...>` (same output as the MCP tool), `node [name]` (one symbol's source + caller/callee trail, or a file with line numbers + dependents), `query <search>` (symbol name search), `callers <symbol>`, `callees <symbol>`, `impact <symbol>`, `affected [files...]` (test files hit by changed sources), `files` (indexed file tree)
- Index lifecycle: `init`, `index` (full rebuild), `sync` (delta since last index), `status`, `uninit`, `unlock` (clear stale lock)
- Admin: `daemon`, `install`/`uninstall` (MCP into agents), `telemetry`, `upgrade`, `version`

The index lags writes ~1s via the file watcher. `callers`/`callees`/`impact`/`affected`/`sync`/`status` are CLI-only — not exposed as MCP tools.

## Code navigation is mandatory — no blind grepping

All agents MUST locate and understand code through structured tooling, not raw text search. In strict order of preference:

1. **CodeGraph** (see section above) — first stop for finding or understanding symbols, call sites, and blast radius.
2. **LSP** — for exact type info, go-to-definition, find-references, hover, and renames. If no TypeScript language server is running, install/start one (`pnpm exec tsserver` is available via the existing deps; or `mise use -g typescript@latest` / `npm i -g typescript-language-server typescript`), don't skip it. The repo also has Biome's daemon (`biome lsp-proxy`) as a capable TS-aware LSP.
3. **AST parsing** — for structural queries LSP/CodeGraph can't answer (e.g. every JSX prop of a name, every import of a module). Use the already-installed toolchain: `pnpm exec biome` (has AST queries), `node --experimental-strip-types` with `ts-morph`/`typescript` compiler API, or `npx ast-grep`.

Plain `grep`/`rg`/`Read` are a last resort for things none of the above can express (plain strings, config values, comments). Never guess a symbol's signature, callers, or location from memory — verify with one of these tools first, every time.

## Architecture

**Single source of truth: `lib/tools.ts`.** Exports the `Tool` interface, the `tools[]` array, `getTool(href)`, and `buildToolMetadata(href)`. The registry drives the homepage grid, `app/sitemap.ts`, per-tool metadata, per-tool OG images (`app/<tool>/opengraph-image.tsx`), and JSON-LD. Root `app/opengraph-image.tsx`, `app/manifest.ts`, and `app/robots.ts` are **site-level** (constants from `lib/site.ts`), not registry-driven. **Never hand-write per-tool metadata** — add a registry entry and call the helpers.

**Each tool is a filesystem route `app/<href>/`** following a repeated convention (no abstract base):
- `page.tsx` — `"use client"` UI; owns its `useState`/`useReducer`; persistence via `localStorage` or URL query state
- `layout.tsx` — server component: `export const metadata = buildToolMetadata("/<href>")` and renders `<ToolJsonLd href="/<href>" />` around `{children}`
- `utils.ts` / `types.ts` — pure logic and local types
- `opengraph-image.tsx` — calls `renderOgCard({title, subtitle})` from `lib/og.tsx`
- `components/` (optional) — for complex tools

`app/random-string/` is the canonical minimal template. `app/qr-gen/`, `app/ipcalc/`, `app/invoice/`, `app/json-schema/` show the same pattern scaled up (extra `components/` and logic modules). `app/invoice/` is the one **exception**: its logic/types were extracted to `lib/invoice/` (`formatNumber.ts`, `sample-data.ts`, `storage.ts`, `types.ts`, `validation.ts`) rather than living at the route, and it ships a tool-local `components/ui/` shadow — not a second template to copy. Its PDF templates live in `app/invoice/templates/<name>/` (one dir per `TemplateKey`: `default`, `stripe`, `apex`, `granite`); the render switch is a chained ternary duplicated in `InvoicePDFViewer.tsx` and `InvoiceDownloadButton.tsx`.

**Client-side by default.** No database, no auth, no server state. The only API route is `app/api/fetch-schema/route.ts` — a hardened SSRF/CORS proxy used solely by the json-schema tool to resolve remote `$ref`s. It is an exception, not a pattern to copy; add a server route only to escape CORS/SSRF constraints.

Shared helpers: `lib/site.ts` (site metadata constants), `lib/utils.ts` (`cn()` = `twMerge(clsx(...))`), `components/ui/*` (shadcn primitives), `components/ToolJsonLd.tsx` (`ToolJsonLd` per route + `SiteJsonLd` for homepage), `lib/og.tsx` (OG card renderer). Path alias `@/*` → repo root.

Tailwind v4 is configured CSS-first in `app/globals.css` (`@import "tailwindcss"` + `@theme`); there is no `tailwind.config.js`. Fonts: Geist Sans/Mono via `next/font`.

## Conventions

**Adding a tool** = (1) new entry in `lib/tools.ts`, (2) `app/<href>/` folder with the file set above. Without the registry entry the tool won't appear on the homepage, sitemap, or metadata.

**State conventions.** Shareable URL state uses the `useQueryState` hook at `app/ipcalc/useQueryState.ts` (wraps `useSearchParams` + `useRouter().replace({scroll:false})`, deletes the param when empty). It is tool-local, not in `lib/` — copy it rather than reinventing. For `localStorage`, there is no single key convention: invoice uses `tulkit_invoice_data`, the json-schema cache uses `tulkit:jschcache:<sha256>`. Stay consistent within a tool.

**"SEO content block"** is not a component — it is a short `<p className="text-gray-600 mb-4 leading-relaxed">…</p>` dropped into the tool's `page.tsx` `<header>`. Copy formula: what it does → features → use cases → privacy assurance ("runs in your browser; nothing is sent to a server").

**No volatile counts anywhere — strictly.** Never write mutable quantities (tool counts, file counts, line numbers, benchmark figures, "recent commit" references) into any spec strip, doc, plan artifact, or copy. The spec strip must state stable facts only: what a thing is, what it does, where it lives — not how many or what number it currently is. Counts rot; restate as invariants or omit.

**Brand voice is a hard constraint.** The homepage hero (`<h1>tulkit</h1>` and the "because apparently you do need another random tool on the internet" subtitle) and the short branded `<title>` are intentionally playful and **not to be changed** without explicit approval. `docs/plans/` holds compound-engineering plan artifacts (frontmatter + R/KTD/U sections); the homepage-seo plan there locks two decisions not to undo: **R3** (brand voice wins over the SEO audit — homepage `<h1>`/subtitle/`<title>` stay) and **KTD1** (the `sr-only` `<h2>Tools</h2>` in `app/page.tsx` is a deliberate audit fix, not noise). Copy is drafted for approval, never invented-and-shipped.

**Design system.** The homepage and site chrome follow the "directory + palette"
design language documented in `DESIGN.md` (palette, measured contrast table,
motion budget, component anatomy, locked copy, no-volatile-counts rule). Read it
before touching `app/globals.css`, `app/layout.tsx`, `app/page.tsx`,
`components/tools-palette.tsx`, `components/tools-directory.tsx`, or
`components/Footer.tsx`.

**Supply-chain posture — do not bypass:**
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 10080` (7 days) — no freshly-published packages install.
- `allowBuilds` permits only `@parcel/watcher`, `@swc/core`, `sharp`. New build-script deps go through `pnpm approve-builds`.
- `overrides.picomatch: ^2.3.2` is a forced ReDoS patch (pnpm 11 reads overrides here, not `package.json`).
- CI (`.github/workflows/supply-chain.yml`) runs `pnpm audit --audit-level=high` and flags install/build scripts. There is **no CI build/lint/typecheck job** — those run locally and on Netlify.

## Work ethic — be meticulous

Rushed work is rejected work. Before editing any file: read the whole file (not the excerpt), trace every caller and callee of what you touch (CodeGraph `impact`), and check sibling callers for the same bug. After editing: run `pnpm typecheck` and `pnpm lint`, run the relevant tests (`pnpm test`, `pnpm test:e2e <file>`), and re-read your diff as if reviewing someone else's PR. Never leave a half-migrated state, a stale comment, or a dangling import. Prefer finishing one thing completely over starting three things. When unsure about behavior, verify against the actual code — "it probably works" is not verification.

## Gotchas

- README's tool list can drift from the registry; `lib/tools.ts` is the source of truth.
- `next-intl` and `@t3-oss/env-nextjs` are installed but **not wired** (no `middleware.ts`, no `env.ts`). `next-themes` **is** wired: `<ThemeProvider>` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`) and the global `<ThemeToggle />` live in `app/layout.tsx`; storage key is `"theme"`; `useTheme()` in `components/ui/sonner.tsx` is live. Don't assume i18n is active. Env *validation* is off, but env *values* are live: `lib/site.ts` reads `NEXT_PUBLIC_SITE_URL` (fallback `https://tulkit.widnyana.web.id`) and it drives sitemap/robots/JSON-LD/OG; `app/api/fetch-schema/route.ts` reads `ALLOWED_ORIGINS` and `NODE_ENV`.
- Only `pnpm-lock.yaml` is tracked; pnpm is canonical. `bun.lock` is not in the repo — if bun recreates it, don't commit it (no `.gitignore` rule currently catches it).
- `config.ts` is **dead code** (zero importers; `components/Footer.tsx` hardcodes the GitHub URL rather than importing `GITHUB_URL`). Site constants live in `lib/site.ts` — don't extend `config.ts`, treat it as removable.
- `next.config.ts` gates `compiler.removeConsole` on `VERCEL_ENV === "production"`, but the app deploys to Netlify where `VERCEL_ENV` is unset — so `removeConsole` never fires and `console.log`s reach production (e.g. `app/qr-gen/page.tsx`). Strip logs manually or change the guard. There is no `netlify.toml`; deploy config lives in the Netlify dashboard.
- `<Toaster>` is mounted once, globally, in `app/layout.tsx` (`top-center`, `richColors`) via the `components/ui/sonner.tsx` wrapper (theme-aware through `useTheme`). New tools should reuse it, not mount another.
- `app/api/fetch-schema/` is hardened for SSRF/CORS only. Its `TODO` records that request-level auth (same-domain enforcement, timestamp/replay protection, HMAC signing) is **not** implemented — don't assume the endpoint is fully locked down.
- `app/invoice/templates/index.ts` (`TEMPLATE_REGISTRY`) is **dead code** with zero importers, and its `graniteLedger` key disagrees with the canonical `"granite"` used everywhere else (`lib/invoice/types.ts`, the form select, both render switches). Don't consume it; the canonical template keys are `default | stripe | apex | granite`.
- Staging anything under `docs/` is blocked by a local hook ("docs/ is protected") — plan artifacts there can't be committed normally.
- A gitleaks pre-commit hook runs via `core.hooksPath` (`.githooks/`, auto-wired on `pnpm install` by the `prepare` script). Install the binary once: `mise use -g gitleaks@latest`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
