# IP Planner — IPv6 addition & llms.txt audit fixes

Date: 2026-08-29

## Findings

1. `suggestSubnetMask` (app/ip-planner/utils.ts) crashed with a BigInt
   negative-shift RangeError for IPv4 when `requiredHosts > 2^32 - 2`
   (API/UI allow up to 2^53 - 1). The API surfaced a cryptic engine
   message as 400; the BoundaryCheck UI threw unhandled.
2. `/31` (RFC 3021) and `/127` (RFC 6164) subnets reported
   `usableHosts = 2` but `firstIP = broadcast`, `lastIP = network`
   (first > last). Affected both `subnetInfoFrom` and `splitVLSM`.
3. Dead `fill` variable in `parseV6Value`.
4. llms.txt integration (app/llms.txt, app/ip-planner/llms.txt,
   app/api/ip-planner/route.ts): audited against the API contract —
   operations, field names, limits (1000 entries, 2^53-1, 0-128 prefix,
   1 MB body, 400/405/413 semantics). No defects.

## Fixes (approved via design-graph review)

- `utils.ts` `suggestSubnetMask`: guard `prefix < 0` → return null;
  API maps to 400 "Invalid IP address, or requiredHosts exceeds the
  address family's capacity" (user-approved semantics).
- `utils.ts` `subnetInfoFrom` + `splitVLSM`: `prefix >= bits - 1` →
  firstIP = network, lastIP = broadcast; `usableHosts` unified for
  the /31-//127 and /32-//128 cases.
- `utils.ts` `parseV6Value`: removed unused `fill`.
- `BoundaryCheck.tsx`: try/catch around `suggestSubnetMask` → inline
  error message instead of unhandled throw.

## Verification

- 3 regression tests added in lib/ip-planner/ipv6.test.ts
  (/127, /31, IPv4 suggestMask overflow → clean 400-shaped throw).
- Full unit suite: 80/80 pass. `tsc --noEmit` clean.
