# lib/ip-planner

Agent-facing **programmatic contract** for the `/ip-planner` tool: pure
parsing + dispatch over the shared subnet core in [`lib/ip`](../ip/README.md).
No DOM, no network — safe to unit test directly and to call from a route
handler (`app/ip-planner/llms.txt/route.ts` re-exports the operation list).

## Files

| File | Role |
| --- | --- |
| `api.ts` | `IP_PLANNER_OPERATIONS`, `parseIpPlannerRequest` (validate unknown JSON → trusted `IpPlannerRequest`), `runIpPlannerOperation` (dispatch into `lib/ip/core`) |
| `api.test.ts` | Request parsing + dispatch tests |
| `ipv6.test.ts` | IPv6 parse/format/subnet tests. **Historical location:** it exercises `lib/ip/core.ts` (this core used to live at `app/ip-planner/utils.ts`); kept here so `pnpm test` coverage moved with the file |

## Operations

`subnetInfo` · `vlsm` · `suggestMask` · `reverseLookup` · `collision`

Request/response shapes are defined in `api.ts` (`IpPlannerApiRequest`).
Notable rules:

- `requiredSizes` / `existingSubnets` are capped at `IP_PLANNER_ARRAY_LIMIT = 1000` entries.
- Host counts must be integers in `[1, MAX_SAFE_HOST_COUNT]` (re-exported from
  `lib/ip/core.ts` — the single definition lives there).
- `collision` rejects mixed address families: IPv4 and IPv6 are disjoint
  spaces, so a mixed query is caller error.
- `detectCollisions` reports invalid CIDRs in its `message` instead of failing,
  so the route returns it as a structured 200.

## Conventions

- **Parse at the boundary, twice.** `parseIpPlannerRequest` validates the
  request shape; the `lib/ip` core then re-parses every address/CIDR string at
  its own boundary. Neither layer trusts the other's input.
- Request-layer validators (`asString`, `asPositiveInt`, …) throw descriptive
  `Error`s; the calling route maps them to a 400. Core-layer parse failures
  return `null` and are mapped to domain errors by `runIpPlannerOperation`.

## Tests

```sh
pnpm test                       # all suites
node --test --experimental-strip-types lib/ip-planner/api.test.ts lib/ip-planner/ipv6.test.ts
```
