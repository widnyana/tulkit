# lib/ip

Family-generic IPv4/IPv6 subnet math shared by **both** network tools,
`/ipcalc` (`app/ipcalc/`) and `/ip-planner` (`lib/ip-planner/api.ts` + its
components).

Internal representation: a 32-bit or 128-bit **BigInt** plus an address-family
tag. All addresses parse at the boundary (`parseIpAddress` / `parseCidr`) and
format on the way out (`formatIpAddress`); everything downstream is trusted
bigint arithmetic.

## Files

| File | Role |
| --- | --- |
| `types.ts` | `IpFamily`, `IpAddress`, and all result shapes (`SubnetInfo`, `BasicCalcResult`, …) |
| `ipv4.ts` | IPv4 parse/format, dotted-mask ↔ CIDR, class A-E + RFC 1918/3330/3171/3021 classification |
| `ipv6.ts` | IPv6 parse (RFC 4291, compression + embedded IPv4) / format (RFC 5952), expanded masks, RFC 4291/4193/3849 range classification |
| `core.ts` | Family dispatch + all operations (below); the only file consumers need to import from |
| `core.test.ts` | Unit tests (`node --test --experimental-strip-types`) |

## Public API (core.ts)

- **Parse/format:** `parseIpAddress`, `parseCidr`, `formatIpAddress`, `formatMask` (internal), `validateIPAddress`, `validateCIDR`
- **ipcalc ops:** `calculateBasicInfo`, `calculateSubnets` (capped at `MAX_SUBNET_ROWS = 1000`), `calculateSupernet`, `deaggregate`
- **ip-planner ops:** `calculateSubnetInfo`, `splitVLSM`, `suggestSubnetMask`, `reverseLookup`, `detectCollisions`
- **Shared constants/helpers:** `MAX_SAFE_HOST_COUNT`, `formatHosts`

## Conventions

- **Parse at the boundary.** `parseIpAddress` / `parseCidr` are the only
  untrusted→trusted crossings; they return `null` for invalid input. Never
  reimplement octet/hex validation elsewhere; `ipv6.ts` itself reuses
  `ipv4.ts`'s `parseV4Value` for embedded IPv4.
- **Host counts** are `number` for IPv4, decimal **string** for IPv6 (they can
  exceed `Number.MAX_SAFE_INTEGER`). Use `formatHosts` for display. VLSM and
  suggest-mask host counts stay Number-safe integers; larger allocations are
  prefix math.
- **IPv6 has no broadcast.** Fields named `broadcast` carry the *last address*
  of the block; UIs label it "Last Address".
- **`/31` (RFC 3021) and `/127` (RFC 6164)** treat network + broadcast as both
  usable.
- **Imports inside `lib/ip` use explicit `.ts` extensions.** Unit tests run via
  `node --test --experimental-strip-types`, which resolves neither extensionless
  relative imports nor the `@/` alias. App-side consumers may import via
  `@/lib/ip/core`.

## Tests

```sh
pnpm test                       # all suites
node --test --experimental-strip-types lib/ip/core.test.ts   # this module
```
