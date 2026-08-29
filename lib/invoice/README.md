# lib/invoice

Domain logic for the invoice generator. `app/invoice/` owns the UI and the PDF
templates; everything here is framework-free and testable with `node --test`.

This module is the one exception to the repo's route-local convention (see the
root `CLAUDE.md`): the invoice tool's types and logic live in `lib/` rather than
beside the route, because three consumers need them — the form, the PDF
templates, and the public API.

## Files

| file | what it is |
| --- | --- |
| `types.ts` | `InvoiceData` and its parts (`InvoiceItem`, `InvoiceSender`, `InvoiceRecipient`, `PaymentInformation`, `TemplateKey`). Types only, no runtime code. |
| `validation.ts` | `invoiceDataSchema` — the zod schema. The single boundary definition for the invoice shape. |
| `formatNumber.ts` | Number to string with caller-supplied decimal/thousand separators. |
| `formatCurrency.ts` | Currency symbol + amount, with the spacing rule below. |
| `defaults.ts` | `createDefaultInvoiceData()` (empty form state, dates regenerated per call) and `mergeInvoiceWithDefaults()`. |
| `sample-data.ts` | The realistic invoice behind the "Load sample" button. Static dates so the test stays deterministic. |
| `storage.ts` | localStorage load/save/clear under `tulkit_invoice_data`, plus `exportInvoiceJson()`. |
| `invoice-template-stress-testing.md` | How to verify a PDF template renders correctly. Read it before changing a template. |

Tests sit next to their subject: `validation.test.ts`, `sample-data.test.ts`,
`formatCurrency.test.ts`. Run them with `pnpm test`.

## The schema is the only boundary

`invoiceDataSchema` validates every entry point into the invoice shape:

- `app/api/invoice-pdf/route.ts` — untrusted request bodies
- `app/invoice/page.tsx` — file import from disk
- `storage.ts` — whatever localStorage hands back
- `app/invoice/schema.json/route.ts` — publishes it as JSON Schema 2020-12 via
  `z.toJSONSchema(..., { io: "input" })`, which is what `/invoice/llms.txt`
  points agents at

Add a field here and all four follow. Never hand-write a second definition of
the shape — the published JSON Schema would then be able to disagree with what
the endpoint accepts, and agents trust it.

The caps in the schema (names 500, addresses 1000, descriptions 2000, notes
5000, 500 items, images ~2.8M characters) are not cosmetic: `/api/invoice-pdf`
is unauthenticated, and every string becomes unbounded PDF layout work.
`logo`/`paymentQRCode` accept base64 data URIs only — react-pdf fetches http(s)
URLs server-side, so allowing them would turn the endpoint into an SSRF proxy.

## Formatting

`formatNumber(value, decimalPlaces, decimalSeparator, thousandSeparator)`
formats the digits. `formatCurrency(value, currency, decimalSeparator,
thousandSeparator)` prepends the symbol, and inserts a space when the symbol is
non-ASCII.

That space is not stylistic. The templates render with Helvetica, a standard-14
font that is never embedded in a PDF, so viewers substitute their own. The
substitute draws `€` wider than the advance width Helvetica declares, and
`€890,00` prints with the sign on top of the 8. The space absorbs the mismatch;
`$` and `Rp` measure correctly and stay tight.

Known limit: symbols outside WinAnsi (`₹`, `₩`, `₺`) cannot render at all with a
non-embedded font — they drop silently. Fixing that means embedding a font,
which changes typography in all five templates.

Every template goes through `formatCurrency`. If you find a `${currency}${...}`
concatenation, it is a bug — that is how the euro collision reached production.

## Changing a template

The templates in `app/invoice/templates/<key>/` consume these types and
helpers. They are the part of the system no unit test can verify: `pnpm test`,
`pnpm test:e2e`, and `pnpm typecheck` all stay green while a PDF renders a
navy total on a navy bar, drops the column header on page 2, or emits a blank
overflow page.

Before shipping a template change, work through
[`invoice-template-stress-testing.md`](./invoice-template-stress-testing.md) —
it has the exact commands, the measurements that constitute a pass, and a table
mapping failure signatures to their causes.

## Gotchas

- `node --test` does not resolve the `@/` alias and needs explicit extensions.
  Test files import `./validation.ts`, and `formatCurrency.ts` imports
  `./formatNumber.ts` for the same reason (`allowImportingTsExtensions` is on).
- `--experimental-strip-types` only strips types. A file using `namespace` or
  `enum` cannot be imported by `node:test` at all.
- `storage.ts` is browser-only by design: every function no-ops when `window` is
  undefined rather than throwing during SSR.
