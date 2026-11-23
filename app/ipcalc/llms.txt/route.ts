import { SITE_URL } from "@/lib/site";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

const DOC = `# IP Calculator (tulkit)

Canonical page: ${SITE_URL}/ipcalc
Comprehensive IPv4 & IPv6 calculator: basic address breakdown, subnet /
supernet generation, and range deaggregation. Runs entirely in the browser;
there is no programmatic API. Every operation below is deterministic (pure
function over the input address/prefix), so an agent can compute the same
result directly instead of calling the UI.

For VLSM splitting, mask suggestion, reverse lookup, or collision detection
against a list of existing subnets, see ${SITE_URL}/ip-planner/llms.txt
instead — those operations live behind a real API
(POST ${SITE_URL}/api/ip-planner) because they take list/array input. The
operations below take a single address and never leave the browser, so
there is nothing to POST to.

Both tools share the same address math (lib/ip/core.ts): one BigInt-based
parser/formatter per family, 32-bit for IPv4 and 128-bit for IPv6. An IPv6
host count that exceeds 2^53-1 is returned as a decimal **string**, not a
number; IPv4 host counts are always a number.

## Model

### Basic breakdown (address + netmask -> full record)

Input: an address (dotted-quad IPv4 or RFC 4291 IPv6, \`::\` compression and
embedded IPv4 like \`::ffff:1.2.3.4\` accepted) and a netmask, which may be a
CIDR prefix number, a \`/\`-prefixed prefix, or (IPv4 only) a dotted mask
(e.g. \`255.255.255.0\`).

    mask      = (2^prefix - 1) << (bits - prefix)      bits = 32 (v4) / 128 (v6)
    network   = address & mask
    broadcast = network | (~mask & max)                 "last address" for v6 (no broadcast concept)
    wildcard  = ~mask & max
    hostMin   = network + 1        (network itself, for /31 and /127)
    hostMax   = broadcast - 1      (broadcast itself, for /31 and /127)
    hostsNet  = 2^(bits-prefix) - 2  (2^(bits-prefix), for /31 and /127)

/31 (RFC 3021) and /127 (RFC 6164) are point-to-point exceptions: both
addresses in the pair are usable, so hostMin/hostMax collapse to
network/broadcast and hostsNet is not reduced by 2.

IPv4 extras: address class A-E from the first octet (A 1-126, B 128-191,
C 192-223, D 224-239 multicast, E 240-255 reserved), and a network-type tag
when the block overlaps a well-known range: RFC 1918 private
(10/8, 172.16/12, 192.168/16), RFC 3330 APIPA (169.254/16), RFC 1700
loopback (127/8), RFC 3171 multicast (224/4), or RFC 3021 point-to-point
(any /31).

IPv6 extras: a network-type tag when the address matches a well-known
range: unspecified (::/128), loopback (::1/128), IPv4-mapped
(::ffff:0:0/96), multicast (ff00::/8), link-local unicast (fe80::/10),
unique local (fc00::/7), or documentation (2001:db8::/32).

### Subnets (base network/CIDR + a larger new prefix -> list)

Splits a block into \`2^(newCIDR-baseCIDR)\` equal subnets of size
\`2^(bits-newCIDR)\` each, walking from the block's network address. Each row
is the same basic-breakdown shape as above. Capped at 1000 rows shown
(IPv6 counts explode fast); the full count is still computed.

### Supernet (base network/CIDR + a smaller new prefix -> one block)

The inverse: masks the base network down to the shorter (smaller-number)
prefix to find the containing block, then runs the same basic-breakdown
math at that prefix.

### Deaggregation (start address + end address, same family -> minimal CIDR list)

Greedy largest-block-first walk: at each step, take the largest CIDR block
whose size is a power of two, is aligned to the current address (trailing
zero bits of the address bound the size), and does not run past the end
address; emit it and advance. Produces the minimal set of CIDR blocks
covering the range, bounded to roughly \`2 x bits\` blocks. \`totalIPs\` is a
decimal **string** for IPv6 when it exceeds \`Number.MAX_SAFE_INTEGER\`.

## Worked examples

- Basic: \`192.168.1.10\` / \`255.255.255.0\` -> network \`192.168.1.0\`,
  broadcast \`192.168.1.255\`, hosts \`192.168.1.1\`-\`192.168.1.254\` (254),
  class C, Private Internet (RFC 1918)
- Basic IPv6: \`2001:db8::1\` / \`32\` -> network \`2001:db8::\`, last address
  \`2001:db8:ffff:ffff:ffff:ffff:ffff:ffff\`, Documentation (RFC 3849)
- Subnet: \`10.0.0.0/24\` -> \`/26\` yields 4 subnets of 62 usable hosts each:
  \`10.0.0.0/26\`, \`10.0.0.64/26\`, \`10.0.0.128/26\`, \`10.0.0.192/26\`
- Supernet: \`10.0.1.0/24\` -> \`/22\` yields \`10.0.0.0/22\` (1022 usable hosts)
- Deaggregate: \`10.0.0.0\` - \`10.0.0.9\` -> \`10.0.0.0/29\` (8 IPs) +
  \`10.0.0.8/31\` (2 IPs) = 10 total IPs in 2 blocks

## References

- Based on ipcalc by Krischan Jodies: http://jodies.de/ipcalc
- RFC 1918 (private address space), RFC 3021 (/31), RFC 6164 (/127),
  RFC 4291 (IPv6 addressing), RFC 5952 (IPv6 text representation),
  RFC 3849 (documentation prefix 2001:db8::/32)
`;

export async function GET(_request: NextRequest) {
  return new NextResponse(DOC, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
