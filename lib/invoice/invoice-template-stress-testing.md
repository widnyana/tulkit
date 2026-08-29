# Stress-testing invoice PDF templates

How the `app/invoice/templates/*` renderers get verified, and how to design a
stress test that is worth running. Written after a pass over `granite-ledger`
that found six defects, every one of them invisible to `pnpm test`, `pnpm
test:e2e`, and `pnpm typecheck`.

## Why the normal test suite cannot see these

The unit tests cover `lib/invoice/*` — number formatting, validation, storage.
The e2e spec drives the form and asserts a download happens. Neither looks at
the produced page. A template can render a total in navy-on-navy, drop the
column header on page 2, or emit a blank overflow page, and every check stays
green.

The rendered page is the artifact. Test it directly.

## The method

Everything below runs against a live dev server (`pnpm dev`, port 3001) and
`POST /api/invoice-pdf`, which takes the same JSON the UI exports. No test
framework, no fixtures — a payload, a render, and measurements on the output.

### Tooling

Poppler supplies everything needed. On macOS: `brew install poppler`.

| tool | use |
| --- | --- |
| `pdftotext -bbox file.pdf -` | XML with every word and its `xMin/yMin/xMax/yMax` in points — the measurement source |
| `pdftotext file.pdf -` | plain text, for "did this content survive at all" checks |
| `pdftoppm -png -r 80 file.pdf out` | full-page images, for looking |
| `pdftoppm -png -r 260 -x .. -y .. -W .. -H ..` | zoomed crop, for glyph-level inspection |
| `pdfimages -list file.pdf` | confirms embedded logo/QR and their effective DPI |
| `file -b out.pdf` | quick page count |

A4 geometry to measure against: page is 595 × 842 pt. With `page.paddingBottom:
56`, body content must stay above y = 786. Anything below that is running into
the fixed footer.

### The four automated checks

Run these on every rendered PDF. They are cheap and they catch the defects that
matter.

**1. Page count and per-page body words.** Count words per page, excluding the
fixed footer band (`yMax >= 790`). A page with fewer than about six body words
is a near-empty page — the reader gets a sheet carrying a background fill and a
page number.

```python
words = re.findall(r'<word xMin="([\d.]+)" yMin="[\d.]+" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', page_xml)
body  = [w for w in words if float(w[2]) < 790]
```

**2. Horizontal overflow.** Any body word whose `xMax` exceeds 566 (595 minus
the 30pt page padding, minus a hair) has escaped the page box. Also worth
checking against the column edge when the table matters: granite's description
column ends near x = 297.

**3. Nothing dropped.** Take every input word longer than six characters —
descriptions, item notes, invoice notes — and assert each appears in
`pdftotext` output. This is what proves a `wrap={false}` did not silently clip
content, and that a long note survived a page break.

**4. Continuation-page integrity.** Grep each page's text for the column header
("DESCRIPTION"). It must appear on every page the table spans and on no page
after it. Present on the totals-only page means a `fixed` element is repeating
past its parent.

### The two things only eyes catch

Automated checks confirm text is *present and positioned*. They say nothing
about whether it is *visible*.

Render pages to PNG and look at them. Two defects found this way, both of which
passed every automated check:

- The grand total rendered navy text on a navy bar. `pdftotext` extracted it
  perfectly. On paper the row was a solid rectangle.
- `€890,00` printed with the euro sign sitting on top of the 8. The advance
  width was correct in the metrics; the drawn glyph was not.

Rule: never approve a template on measurements alone. Look at page 1, look at a
continuation page, and zoom on any money.

## Designing the payload

A stress payload is not "a big invoice". It is a set of specific pressures, each
aimed at one layout assumption.

### Pressure 1 — vertical fit, and what happens when it fails

Sweep the item count from 1 to 12 with notes, payment info, and tax all present,
and record pages plus per-page word counts. You are looking for two things: how
many items fit on one page, and whether the first overflow page carries real
content or a sliver.

Compare against the other templates on the identical payload. An outlier is a
bug, not a design choice: granite broke to a second page at 2 items where
evergreen handled 12.

### Pressure 2 — unbreakable text

Three flavours, all different:

- A long real word (`Rindfleischetikettierungsueberwachungsaufgabenuebertragungsgesetz`)
  — hyphenates, should stay in its column.
- A bare URL — breaks at punctuation, should stay in its column.
- A run with no break points at all (60 identical characters, a hash, a
  space-less IBAN) — react-pdf has no `word-break: break-all`, so this spills
  across the column boundary in every template. Known limitation; assert the
  behaviour you accept rather than assuming it wraps.

### Pressure 3 — mixed optionality

Not "all items have notes" and not "none do". Interleave them: no note, short
note, ~800-character note, ~1000-character note, no note. Alternating is what
exposes zebra-striping bugs, row-splitting bugs, and the gap left when a tall
row jumps to the next page whole.

### Pressure 4 — every field populated

One payload with nothing omitted: both images as base64 data URIs, recipient
email *and* phone, all five `paymentInfo` fields, `showBranding`, a fractional
quantity, a fractional tax rate, non-default separators, a non-ASCII currency
symbol. Optional fields are where the untested code lives.

Generate images without adding a dependency — a 25-line PNG encoder over
`zlib` + `struct` produces a wide banner logo and a QR-shaped bitmap, which is
enough to test layout (scannability is not the point).

### Pressure 5 — the symbol set

Render the same amount with `$`, `£`, `¥`, `€`, `₹`, `Rp` and zoom on each.
Non-embedded standard-14 Helvetica gets substituted by the viewer, and the
substitute's non-ASCII glyphs do not match the declared metrics: `€` collided
with the next digit, and `₹` (outside WinAnsi) rendered as nothing at all.
`lib/invoice/formatCurrency.ts` now inserts a space after any non-ASCII symbol,
which fixes the collision. A symbol outside WinAnsi still cannot render — that
needs an embedded font, which is a product decision, not a template fix.

## What "pass" means

A template passes when, across the full payload sweep:

1. No page holds fewer than ~6 body words.
2. No body word crosses x = 566, and table text stays inside its column.
3. Every input word appears in the extracted text.
4. The column header appears on exactly the pages the table spans.
5. Body content stays above y = 786, clear of the fixed footer.
6. On a rendered image: every amount is legible, the grand total included, and
   no box is cut mid-row at a page break.
7. Item capacity is within range of the sibling templates on the same payload.

## Failure signatures worth recognising

| what you see | what it means |
| --- | --- |
| Page 2 has the footer and nothing else | A `View` with a background split at the boundary; its fill painted on a page with no text. Add `wrap={false}` to that box. |
| A label on one page, its amount on the next | A row split mid-flight. `wrap={false}` on the row. |
| A large blank gap before a page break | A `wrap={false}` block too tall to fit jumped whole. Allow tall rows to split: `wrap={Boolean(item.notes)}`. |
| A solid coloured bar with no text | Child `<Text>` carries its own `color`; react-pdf does not inherit the parent's. Style the child. |
| Text sliding to the paper edge | A flex row where one side has no `flex: 1` and the other no `flexShrink`. |
| Content under the footer | `page.paddingBottom` smaller than the absolutely-positioned footer's height. |

## Reproducing

The scripts live in the session scratchpad, not the repo — they are throwaway by
design, roughly 40 lines each:

- `mkpng.py` — dependency-free PNG encoder for the logo and QR fixtures
- `full.py` — the every-field-populated payload
- `stress.py` — the five mixed-pressure cases plus the four automated checks
- `bbox.py` — per-page lowest content, for footer-clearance checks
- `audit.py` — the item-count sweep

Rewriting them from this document takes about ten minutes. Keeping them in the
repo would mean maintaining a second test suite that only runs by hand; the
method is the thing worth keeping.

## Results — 2026-08-30 sweep of all five templates

23 cases per template (item sweep 1–12, 20 and 34 to force a multi-page table,
plus `unbreakable`, `mixed`, `full` and six currency symbols). All five now pass
the seven criteria. Page-one item capacity, measured on the same payload:

| template | capacity before | after | defects fixed |
| --- | --- | --- | --- |
| evergreen | 12 | 12 | 2 |
| granite | 6 | 10 | 4 |
| default | 9 | 9 | 5 |
| stripe | 11 | 11 | 4 |
| apex | 10 | 9 | 4 |

Three defect classes accounted for most of it, and all three are worth checking
first in any new template:

**A `fixed` header repeats over its parent's page range, not the Page's.**
`splitNodes` duplicates a fixed node into every fragment its immediate parent is
split into (`@react-pdf/layout` `splitNodes`, the `isFixed` branch). Put the
header inside a wrapper View holding header + rows only, and keep the totals a
sibling *after* that wrapper: the header then lands on exactly the pages the
table spans. All five templates now do this; before the sweep only granite tried,
and it used a plain `fixed` that leaked onto the totals page.

**Trailing margin on a table wrapper costs a page.** `getEndOfMinPresenceAhead`
adds `box.marginBottom` before asking whether a node fits, so a table that filled
the page exactly was judged too tall and moved whole — printing a blank first
page. Granite (`marginBottom: 10`), default (`30`) and apex (`24`) all hit it.
Put the spacing on the block below instead.

**A nested wrapper turns a table split into a table jump.** Granite wrapped every
section in a `container` View. Splitting that nested container moved the whole
table to the next page rather than breaking it, so a five-item invoice printed an
almost empty first page. Sections belong directly on the `Page`, as the other
four templates already had them.

Also fixed: rows without a wrap guard splitting so the quantity/price/amount
stayed on one page while the description moved to the next (granite, default,
stripe, apex); notes/totals and payment clusters sliced at the boundary (default,
stripe, apex); page padding smaller than the fixed footer, letting body content
run underneath it (default, apex); evergreen's 50pt price column, which wrapped
`EUR1 480.00` onto two lines and collided with the quantity column; and the
default template never rendering `paymentInfo` at all.

Two checks were added to the harness after eyes caught what measurement missed:
a **column-collision** test (pdftotext merges two words into one token when their
boxes touch, so a token carrying two currency marks means a column overflowed
sideways) and a **footer-guard** of 10pt (a footer with its own top padding
starts above its text baseline). The dropped-content test reads body words only —
using plain `pdftotext` output makes a word hyphenated across a page break look
dropped, because the footer text sits between its halves.

Still out of scope, unchanged: `₹` and other symbols outside WinAnsi render as a
stray mark with the non-embedded standard-14 font. Confirmed again on all five.
Embedding a font is the only fix, and that is a product decision.
