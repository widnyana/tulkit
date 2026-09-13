# Design guidelines — "instrument panel"

The design language for tulkit's homepage and site chrome. Read before touching
`app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components/Footer.tsx`, or
`components/theme-toggle.tsx`.

## Identity

- Warm paper (light) / warm graphite (dark), one safety-orange **signal** accent. No second accent, no per-category colors.
- Flat background; structure comes from hairline card borders, never page decoration.
- Monospace micro-labels: uppercase, 10–11px, tracking 0.15–0.2em — for indexes, categories, meta. Never for body copy.
- Cards read as instrument modules: mono index (`01`, `02`, …) top-left, category top-right, title + arrow, description, output "screen" at the bottom.

## Tokens (defined in `app/globals.css`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--signal` | `oklch(0.566 0.19 41)` | `oklch(0.727 0.174 46)` | hover accents, asterisk, arrows. Utilities: `text-signal` / `bg-signal` |
| `--ease-soft` | `cubic-bezier(0.23, 1, 0.32, 1)` | same | default UI curve (entrances, hover) |
| `--ease-swift` | `cubic-bezier(0.77, 0, 0.175, 1)` | same | on-screen movement |

Neutrals carry a warm hue (75–85 in oklch). Keep the shadcn token names
unchanged — every tool page depends on them.

## Motion budget

- Entrance: one-shot, `.tool-enter` on a WRAPPER element (never on the interactive element — animation fill-mode freezes its transform and kills `:active` scale). 420ms `ease-soft`, 40ms stagger via the `--i` custom property. Hero 500ms.
- Hover (seen tens of times a day, keep it cheap): border-color + arrow slide + index color, 200ms `ease-soft`. transform / opacity / border-color only.
- Press: `active:scale-[0.99]` on cards.
- `prefers-reduced-motion`: opacity-only fade (240ms), no transforms.
- Never animate: keyboard-initiated actions, anything seen 100+ times a day, anything over 300ms that is part of an interaction.

## Component patterns

**Tool card** (`app/page.tsx`): wrapper `div.tool-enter` → `Link` → index/category row →
title row (18px icon, title, `ArrowUpRight` slides in on hover) → description →
screen (`h-24`, `rounded-md`, `bg-muted/45`, hairline border). Every card
shares this single anatomy — no special variants, including the QR tool.

**Preview screens**: decorative (`aria-hidden`, `select-none`), mono 12px/18px,
≤3 lines, static content that looks like real tool output (env diff, subnet
tree, cron translation, base64 pair…). The QR screen renders a real, scannable
QR of `SITE_URL` via `lib/qrcodegen` at render time. Never invent numbers that
could be mistaken for live user data.
**Coming-soon placeholder**: quiet, dashed border, muted text, no screen, no
arrow, not a link. Carries only the backlog joke — never hero or footer facts.

**Site chrome** (`app/layout.tsx`): sticky header (h-14, wordmark `tulkit*`,
`ThemeToggle`), `main.flex-1`, global `Footer`. Tool pages inherit the chrome —
never add per-page headers/footers.

## Copy rules

- **NO volatile counts.** Never print numbers that rot on content change
  ("10 tools", "N utilities"). State invariants or omit.
- **One fact, one home.** The site tagline ("Solving your tiny, annoying
  problems…") is locked and lives in the footer. The hero carries only the
  locked h1 + subtitle — no extra tagline strips, and cards never repeat
  hero or footer facts.
- Locked brand copy (never reword): `<h1>tulkit</h1>`, the subtitle "because
  apparently, you *do* need another random tool on the internet. ¯\_(ツ)_/¯",
  the sr-only `<h2>Tools</h2>`, and the sr-only about paragraph.
- Wordmark device: `tulkit` + signal-colored `*`. The asterisk's footnote is
  the subtitle. Header/footer wordmarks carry it; the `<h1>` does not.

## Accessibility

- Decorative previews and icons: `aria-hidden` + `select-none`.
- Focus: visible outline preserved on links (`outline-offset-2`).
- Hover is never the only interactivity signal — arrow slide + border + index color stack redundantly.
