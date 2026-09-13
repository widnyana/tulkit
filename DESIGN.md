# Design guidelines — "directory + palette"

The design language for tulkit's homepage and site chrome. Read before touching
`app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components/tools-palette.tsx`,
`components/tools-directory.tsx`, `components/tools-ui.tsx`, `components/Footer.tsx`,
or `lib/tool-search.ts`.

## Principles

1. **Finding beats browsing.** Two paths to every tool: the palette (`⌘K` on Mac, `Ctrl+K`
   elsewhere, or `/`) for people who know what they want, and the directory page for people
   who don't. The palette is global chrome — it works from every tool page.
2. **Function over decoration.** No decorative output specimens, no index numbers, no
   per-category colours. An icon, a title, one line of description, and a real link.
3. **No state is carried by hue alone.** Focus = outline + fill. Active filter = fill +
   weight + border. Search hit = tint + weight. Colour is always redundant.
4. **AA everywhere, colour-blind safe by construction.** The single accent is Okabe-Ito
   blue — never a red/green pair, never hue as the only difference. Ratios below were
   measured with the WCAG relative-luminance formula against the shipped hex values.
5. **Motion only explains state** and never runs on load. Keyboard-initiated actions
   (opening the palette) do not animate at all.

## Palette

Every value below is authored as hex in `app/globals.css` because these exact values were
measured. Text pairs are ≥4.5:1, control boundaries ≥3:1.

| Token | Light | Dark |
|---|---|---|
| `--background` | `#ffffff` | `#0f1216` |
| `--foreground` | `#16181d` | `#e8ecf1` |
| `--card` | `#ffffff` | `#151a20` |
| `--muted` | `#f4f6f8` | `#1b2129` |
| `--muted-foreground` | `#5b6675` | `#a5b0bd` |
| `--accent` | `#eef2f6` | `#1e242c` |
| `--border` | `#e5e8ec` | `#262d36` |
| `--input` (control boundary) | `#6f7a88` | `#6b7784` |
| `--ring` (accent, focus) | `#0072b2` | `#56b4e9` |
| `--highlight` (search hit) | `#dcebf5` | `#14313f` |

Measured contrast (light → dark): body text 17.76:1 / 15.83:1 · muted text 5.83:1 / 8.53:1 ·
accent 5.19:1 / 8.14:1 · control boundary 4.36:1 / 4.11:1 · text on row-hover fill
16.39:1 / 13.66:1 · muted text on row-hover fill 5.38:1 / 7.36:1 · text on search-hit tint
14.58:1 / 11.49:1. `--border` (1.23:1 / 1.35:1) is decorative only — never a control
boundary and never the sole carrier of state.

Accent hue: Okabe-Ito blue. Deuteranopia, protanopia and tritanopia all keep blue
distinct from the neutral ramp; category colours were removed instead of being made
accessible, because text labels already carry that information.

## Type, layout, surfaces

- Geist Sans everywhere, including the footer's meta links — a deliberate choice, not
  drift: the old instrument-panel identity used mono for micro-labels and machine-address
  texture, and this identity replaces that with one consistent typeface site-wide. No
  uppercase tracking, no micro-labels.
- Wordmark device: `tulkit` + a `text-muted-foreground` asterisk (header, footer, OG
  card) — a footnote marker for the locked subtitle, which is itself written as a
  footnote joke. It carries no state and uses no accent colour; it opted out of the
  accent economy rather than reviving the orange signal system it used to render in.
- Scale: `h1` 36/48 `font-semibold tracking-tight`; group labels 12px `font-medium`
  `text-muted-foreground`; row title 15px `font-medium`; row description 14px with
  `line-clamp-2`; status 12px.
- Body column `mx-auto w-full max-w-4xl px-5 sm:px-6` (narrow column = scannable list).
  Chrome containers stay `max-w-6xl` so they align with the wide tool pages.
- Surfaces: flat. Structure comes from hairline borders (`--border`) and the row-hover
  fill (`--muted`), never from shadows, gradients or page decoration. The palette panel is
  the one elevated surface: `rounded-xl border border-border bg-background shadow-2xl`
  over a `backdrop:bg-foreground/30` scrim.

## Components

**Header** (`app/layout.tsx`): sticky, `h-14`, `border-b border-border`, `bg-background/85
backdrop-blur-sm`. Wordmark `tulkit*` (asterisk in `text-muted-foreground`, see the
wordmark device note above), then `ToolsPalette` trigger and `ThemeToggle`. A
`Skip to content` link is the first focusable element and targets `#main` (present on
every page).

**Palette** (`components/tools-palette.tsx`): native `<dialog>` + `showModal()` — top
layer, backdrop, focus trap, inert background, Escape and focus restore come from the
platform. No dependency is used for it (`cmdk` is installed but intentionally unused; its
list/input layer would duplicate the tested `lib/tool-search`). Trigger is a visible
button, so touch users reach the palette too. Behaviour: `⌘K`/`Ctrl+K` and `/` open it
from anywhere (when focus is not in a text field); the query resets on open; the input is
focused on open; `ArrowDown`/`ArrowUp` move real focus through the result links and
`scrollIntoView({ block: "nearest" })`; `Enter` from the input opens the first result;
`Escape` clears a non-empty query first and closes only when empty (`cancel` is
`preventDefault`ed while a query exists); clicking the scrim closes; clicking a row
records the recent and closes before navigation. Rows are real `<a>` elements (middle-click
and open-in-new-tab work).

**Palette row**: 40px tall, icon, title (with hit highlighting), category, chevron on
hover/focus.

**Directory** (`components/tools-directory.tsx`): category chips (pointer-driven sliding
indicator — `transform` plus width/height on one tiny absolutely-positioned element, so no
content reflows; re-measured on resize, on row scroll and after `document.fonts.ready`),
a live status line, "Recently used" (shown only when unfiltered and non-empty), then one
section per category.

**Directory row**: 64px-tall link, 36px icon tile, title, `line-clamp-2` description,
chevron on hover/focus. Hover fill `--muted`, press `--accent`, focus outline at
`--ring` with `outline-offset-2`.

**Footer**: hairline top border, `tulkit*` wordmark (same muted asterisk as the header),
quiet meta links in Geist Sans (source, `agents: /llms.txt`, tip jar).

## Motion budget

- Nothing animates on page load. The rejected entrance stagger is gone.
- Keyboard-initiated actions never animate: the palette appears instantly (Raycast
  behaviour — it is used many times a day).
- Hover/press colour changes: `transition-colors duration-150`.
- Chevron reveal: `transition-opacity duration-200 ease-soft`.
- Chips indicator: `transition-[transform,width,height] duration-300 ease-soft`,
  `motion-reduce:transition-none` (reduced motion snaps instead of sliding).
- `prefers-reduced-motion` also disables nothing else — there is nothing else.

## Interaction contract

- Filtering is instant (no debounce) over `title`, `description`, `category` and
  `keywords`; multi-word queries are AND-ed; case-insensitive substring matching.
- Category scoping and the palette are independent: chips scope the page, the palette
  always searches every tool.
- Recents: `localStorage["tulkit:recent-tools"]`, newest first, max 3, written on row
  click, read defensively (corrupt/absent/foreign data yields `[]`). Never sent anywhere.

## Copy rules

- **No volatile counts.** Never write quantities that rot ("10 tools", "N utilities") into
  copy, docs or plan artifacts. Counts computed at runtime from the registry (the
  `role="status"` line, the palette status) are live data, not copy, and stay.
- **One fact, one home.** The site tagline ("Solving your tiny, annoying problems…") is in
  the footer only. The hero carries only the locked `h1` and subtitle — no extra taglines,
  no repeated facts in cards.
- Locked, never reword: `<h1>tulkit</h1>`, the subtitle "because apparently, you *do* need
  another random tool on the internet. ¯\\_(ツ)_/¯", the sr-only `<h2>Tools</h2>`, the
  sr-only about paragraph.

## Accessibility checklist

- Skip link first in tab order; `#main` on every page.
- Every tool row is a real link with `aria-label` equal to its visible title (clean
  link lists in screen readers, no duplicated description text in the name).
- Chips are `<button aria-pressed>` inside a labelled group; the active chip differs by
  fill, border and weight, not hue.
- The palette is a labelled `<dialog>` with a labelled search input and a polite status
  region; results are links, so Tab and arrow keys both work.
- Focus is always visible: 2px outline at `--ring` with offset 2 (never removed, never
  colour-only), plus a fill change on palette rows.
- Hit targets: rows ≥64px, chips 36px, header controls 36px.
- Contrast: see the measured table above; do not ship a token change without re-measuring.
