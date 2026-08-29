import { IP_PLANNER_OPERATIONS } from "@/lib/ip-planner/api";
import { SITE_URL } from "@/lib/site";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

const DOC = `# IP Planner (tulkit)

Canonical page: ${SITE_URL}/ip-planner
IPv4 and IPv6 subnet planning: subnet details, VLSM splitting, mask
suggestion, reverse lookup, and collision detection.
The web UI runs entirely in your browser. The API below is stateless and
stores nothing.

## Web UI

- **Subnet info**: network, broadcast, mask, usable hosts, first/last IP from CIDR.
- **VLSM splitter**: divide a parent block into subnets sized to a list of host requirements (largest first).
- **Boundary check**: suggest the optimal mask for a required host count and verify the start IP is a network address.
- **Reverse lookup**: find subnet details for any IP within a prefix.
- **Collision detector**: check a new subnet against a list of existing subnets.

## API

Endpoint: \`POST ${SITE_URL}/api/ip-planner\`
Content-Type: application/json

### Request

\`\`\`json
{ "operation": "subnetInfo", "cidr": "192.168.1.0/24" }
\`\`\`

- **operation**: (required): one of ${IP_PLANNER_OPERATIONS.join(", ")}
- op-specific fields:

| Operation | Fields |
| --------- | ------ |
| subnetInfo | \`cidr\` (string, e.g. "10.0.0.0/16" or "2001:db8::/32") |
| vlsm | \`parentBlock\` (string CIDR), \`requiredSizes\` (array of integers 1-2^53-1, max 1000) |
| suggestMask | \`ip\` (string), \`requiredHosts\` (integer 1-2^53-1) |
| reverseLookup | \`ip\` (string), \`cidr\` (integer 0-32 for IPv4, 0-128 for IPv6) |
| collision | \`existingSubnets\` (array of CIDR strings, max 1000), \`newSubnet\` (string CIDR); all must be the same family |

Response: \`200 {"result": {...}}\`

Both IPv4 (dotted-quad) and IPv6 (RFC 4291 \`::\` compressed input; embedded
IPv4 such as \`::ffff:1.2.3.4\` accepted) addresses work with every operation.
IPv6 serialization: \`usableHosts\` is a decimal **string** (counts exceed
2^53); address fields use RFC 5952 compressed text; \`mask\` is the expanded
128-bit mask (IPv6 has no dotted mask); \`broadcast\` carries the block's
last address (IPv6 has no broadcast). For IPv4, \`usableHosts\` is a number
and \`mask\` is dotted-quad, as before.
- \`subnetInfo\`/\`reverseLookup\`: \`{network, broadcast, mask, cidr, usableHosts, firstIP, lastIP, cidrNotation}\`
- \`vlsm\`: array of \`{network, cidr, mask, usableHosts, firstIP, lastIP, cidrNotation}\`, allocated largest-first
- \`suggestMask\`: \`{suggestedMask, network, broadcast, isValid, warning?}\`; \`isValid\` is false (with \`warning\`) when the start IP is not the network address; still a 200
- \`collision\`: \`{hasCollision, overlappingSubnets, message}\`; invalid CIDRs in the input are reported in \`message\`, not rejected; still a 200

### Errors

All errors return \`{"error": "<message>"}\`.

| Status | Meaning |
| ------ | ------- |
| 400    | Invalid JSON body, unknown operation, wrong field types/ranges, invalid CIDR/IP, mixed address families, or sizes that do not fit the parent block |
| 405    | Method not allowed (only POST and OPTIONS are supported) |
| 413    | Request body exceeds 1 MB |
| 500    | Unexpected server error |

### Examples

\`\`\`sh
# subnet details
curl -s -X POST ${SITE_URL}/api/ip-planner \\
  -H 'Content-Type: application/json' \\
  -d '{"operation":"subnetInfo","cidr":"192.168.1.0/24"}'

# VLSM: split 10.0.0.0/24 into subnets for 100, 50, and 20 hosts
curl -s -X POST ${SITE_URL}/api/ip-planner \\
  -H 'Content-Type: application/json' \\
  -d '{"operation":"vlsm","parentBlock":"10.0.0.0/24","requiredSizes":[100,50,20]}'

# suggest a mask for 50 hosts starting at 10.0.0.64
curl -s -X POST ${SITE_URL}/api/ip-planner \\
  -H 'Content-Type: application/json' \\
  -d '{"operation":"suggestMask","ip":"10.0.0.64","requiredHosts":50}'

# reverse lookup
curl -s -X POST ${SITE_URL}/api/ip-planner \\
  -H 'Content-Type: application/json' \\
  -d '{"operation":"reverseLookup","ip":"10.0.3.77","cidr":22}'

# collision check
curl -s -X POST ${SITE_URL}/api/ip-planner \\
  -H 'Content-Type: application/json' \\
  -d '{"operation":"collision","existingSubnets":["10.0.0.0/24","10.0.2.0/23"],"newSubnet":"10.0.1.0/24"}'

# IPv6 subnet details
curl -s -X POST ${SITE_URL}/api/ip-planner \\
  -H 'Content-Type: application/json' \\
  -d '{"operation":"subnetInfo","cidr":"2001:db8::/48"}'

# IPv6 VLSM
curl -s -X POST ${SITE_URL}/api/ip-planner \\
  -H 'Content-Type: application/json' \\
  -d '{"operation":"vlsm","parentBlock":"2001:db8::/48","requiredSizes":[65536,100]}'
\`\`\`

CORS: fully open; any origin may call this endpoint.
`;

export async function GET(_request: NextRequest) {
  return new NextResponse(DOC, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
