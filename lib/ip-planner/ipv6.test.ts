import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatIpAddress,
  parseCidr,
  parseIpAddress,
} from "../../app/ip-planner/utils.ts";
import { parseIpPlannerRequest, runIpPlannerOperation } from "./api.ts";

describe("parseIpAddress (IPv6)", () => {
  it("accepts full, compressed, and mixed forms", () => {
    const full = parseIpAddress("2001:0db8:0000:0000:0000:0000:0000:0001");
    assert.ok(full);
    assert.equal(full.family, "ipv6");
    assert.equal(formatIpAddress(full), "2001:db8::1");

    for (const text of ["2001:db8::1", "2001:db8:0:0:0:0:0:1", "2001:DB8::1"]) {
      const addr = parseIpAddress(text);
      assert.ok(addr);
      assert.equal(addr.value, full.value);
    }
  });

  it("parses embedded IPv4", () => {
    const addr = parseIpAddress("::ffff:192.168.1.1");
    assert.ok(addr);
    // = ::ffff:c0a8:101
    assert.equal(addr.value, (0xffffn << 32n) | 0xc0a80101n);
    assert.equal(formatIpAddress(addr), "::ffff:c0a8:101");

    assert.ok(parseIpAddress("::1.2.3.4"));
    assert.ok(parseIpAddress("1::ffff:1.2.3.4"));
  });

  it("parses all-zeros and loopback", () => {
    assert.equal(parseIpAddress("::")?.value, 0n);
    assert.equal(parseIpAddress("::1")?.value, 1n);
    const zero = parseIpAddress("::");
    assert.ok(zero);
    assert.equal(formatIpAddress(zero), "::");
  });

  it("rejects malformed IPv6", () => {
    for (const bad of [
      "",
      ":",
      ":::",
      "1:::2",
      "1::2::3",
      "1:2:3:4:5:6:7:8:9",
      "2001:db8::1::",
      "gggg::1",
      "12345::",
      "::ffff:1.2.3.256",
      "2001:db8::1%eth0",
    ]) {
      assert.equal(parseIpAddress(bad), null, `expected null for ${bad}`);
    }
  });

  it("parseCidr enforces per-family prefix ranges", () => {
    assert.ok(parseCidr("2001:db8::/128"));
    assert.equal(parseCidr("2001:db8::/129"), null);
    assert.ok(parseCidr("10.0.0.0/32"));
    assert.equal(parseCidr("10.0.0.0/33"), null);
  });

  it("IPv4 paths still work through the generic parser", () => {
    const addr = parseIpAddress("192.168.1.1");
    assert.ok(addr);
    assert.equal(addr.family, "ipv4");
    assert.equal(addr.value, 0xc0a80101n);
    assert.equal(formatIpAddress(addr), "192.168.1.1");
  });
});

describe("IPv6 operations", () => {
  it("subnetInfo returns v6 details with string usableHosts", () => {
    const r = runIpPlannerOperation(
      parseIpPlannerRequest({
        operation: "subnetInfo",
        cidr: "2001:db8::/64",
      }),
    ) as {
      network: string;
      broadcast: string;
      usableHosts: string;
      mask: string;
      firstIP: string;
      lastIP: string;
      cidrNotation: string;
    };
    assert.equal(r.network, "2001:db8::");
    assert.equal(r.broadcast, "2001:db8::ffff:ffff:ffff:ffff");
    assert.equal(r.usableHosts, "18446744073709551614");
    assert.equal(r.mask, "ffff:ffff:ffff:ffff:0000:0000:0000:0000");
    assert.equal(r.firstIP, "2001:db8::1");
    assert.equal(r.lastIP, "2001:db8::ffff:ffff:ffff:fffe");
    assert.equal(r.cidrNotation, "2001:db8::/64");
  });

  it("subnetInfo /128 has exactly one usable host", () => {
    const r = runIpPlannerOperation(
      parseIpPlannerRequest({ operation: "subnetInfo", cidr: "::1/128" }),
    ) as { usableHosts: string; firstIP: string; lastIP: string };
    assert.equal(r.usableHosts, "1");
    assert.equal(r.firstIP, "::1");
    assert.equal(r.lastIP, "::1");
  });

  it("subnetInfo /127 has two usable hosts covering the whole block", () => {
    const r = runIpPlannerOperation(
      parseIpPlannerRequest({ operation: "subnetInfo", cidr: "::1/127" }),
    ) as {
      usableHosts: string;
      firstIP: string;
      lastIP: string;
      network: string;
      broadcast: string;
    };
    assert.equal(r.usableHosts, "2");
    assert.equal(r.firstIP, "::");
    assert.equal(r.lastIP, "::1");
    assert.equal(r.network, "::");
    assert.equal(r.broadcast, "::1");
  });

  it("vlsm allocates v6 subnets largest-first", () => {
    const r = runIpPlannerOperation(
      parseIpPlannerRequest({
        operation: "vlsm",
        parentBlock: "2001:db8::/48",
        requiredSizes: [100, 65536],
      }),
    ) as { cidr: number; network: string }[];
    assert.equal(r.length, 2);
    assert.equal(r[0].cidr, 111); // 65536 hosts -> 17 bits -> /111
    assert.equal(r[0].network, "2001:db8::");
    assert.equal(r[1].cidr, 121); // 100 hosts -> 7 bits -> /121
    assert.equal(r[1].network, "2001:db8::2:0");
  });

  it("suggestMask works for v6 and flags non-network starts", () => {
    const r = runIpPlannerOperation(
      parseIpPlannerRequest({
        operation: "suggestMask",
        ip: "2001:db8::1",
        requiredHosts: 100,
      }),
    ) as { suggestedMask: number; isValid: boolean; network: string };
    assert.equal(r.suggestedMask, 121); // 100+2 -> 7 bits
    assert.equal(r.isValid, false);
    assert.equal(r.network, "2001:db8::");
  });

  it("reverseLookup maps a v6 address into its subnet", () => {
    const r = runIpPlannerOperation(
      parseIpPlannerRequest({
        operation: "reverseLookup",
        ip: "2001:db8:0:0:ffff::1",
        cidr: 48,
      }),
    ) as { cidrNotation: string; network: string };
    assert.equal(r.cidrNotation, "2001:db8::/48");
    assert.equal(r.network, "2001:db8::");
  });

  it("collision detects v6 overlaps", () => {
    const r = runIpPlannerOperation(
      parseIpPlannerRequest({
        operation: "collision",
        existingSubnets: ["2001:db8::/48"],
        newSubnet: "2001:db8:1::/48", // third group differs → disjoint
      }),
    ) as { hasCollision: boolean };
    assert.equal(r.hasCollision, false);

    const hit = runIpPlannerOperation(
      parseIpPlannerRequest({
        operation: "collision",
        existingSubnets: ["2001:db8::/48"],
        newSubnet: "2001:db8::/64",
      }),
    ) as { hasCollision: boolean; overlappingSubnets: string[] };
    assert.equal(hit.hasCollision, true);
    assert.deepEqual(hit.overlappingSubnets, ["2001:db8::/48"]);
  });

  it("rejects mixed-family collision queries with a 400-style throw", () => {
    assert.throws(
      () =>
        runIpPlannerOperation(
          parseIpPlannerRequest({
            operation: "collision",
            existingSubnets: ["10.0.0.0/24"],
            newSubnet: "2001:db8::/48",
          }),
        ),
      /Mixed address families/,
    );
  });

  it("rejects host counts past 2^53-1 at the boundary", () => {
    assert.throws(
      () =>
        parseIpPlannerRequest({
          operation: "suggestMask",
          ip: "2001:db8::1",
          requiredHosts: 2 ** 53,
        }),
      /requiredHosts/,
    );
  });

  it("suggestMask rejects IPv4 host counts beyond 2^32 cleanly", () => {
    assert.throws(
      () =>
        runIpPlannerOperation(
          parseIpPlannerRequest({
            operation: "suggestMask",
            ip: "10.0.0.0",
            requiredHosts: 2 ** 32,
          }),
        ),
      /exceeds the address family's capacity/,
    );
  });

  it("subnetInfo /31 has two usable hosts covering the whole block", () => {
    const r = runIpPlannerOperation(
      parseIpPlannerRequest({ operation: "subnetInfo", cidr: "10.0.0.0/31" }),
    ) as { usableHosts: number; firstIP: string; lastIP: string };
    assert.equal(r.usableHosts, 2);
    assert.equal(r.firstIP, "10.0.0.0");
    assert.equal(r.lastIP, "10.0.0.1");
  });
});
