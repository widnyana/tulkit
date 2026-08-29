import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateBasicInfo,
  calculateSubnets,
  calculateSupernet,
  deaggregate,
  parseCidr,
} from "./core.ts";

describe("calculateBasicInfo (IPv4 regression)", () => {
  it("handles address + dotted mask", () => {
    const r = calculateBasicInfo("192.168.1.1", "255.255.255.0");
    assert.ok(r);
    assert.equal(r.family, "ipv4");
    assert.equal(r.netmaskCIDR, 24);
    assert.equal(r.network, "192.168.1.0");
    assert.equal(r.broadcast, "192.168.1.255");
    assert.equal(r.hostMin, "192.168.1.1");
    assert.equal(r.hostMax, "192.168.1.254");
    assert.equal(r.hostsNet, 254);
    assert.equal(r.networkClass, "C");
    assert.equal(r.networkType, "Private Internet (RFC 1918)");
  });

  it("handles address + CIDR", () => {
    const r = calculateBasicInfo("10.0.0.5", "/16");
    assert.ok(r);
    assert.equal(r.netmask, "255.255.0.0");
    assert.equal(r.cidrNotation, "10.0.0.0/16");
    assert.equal(r.networkType, "Private Internet (RFC 1918)");
  });

  it("rejects non-contiguous dotted masks and bad prefixes", () => {
    assert.equal(calculateBasicInfo("10.0.0.5", "255.0.255.0"), null);
    assert.equal(calculateBasicInfo("10.0.0.5", "33"), null);
  });
});

describe("calculateBasicInfo (IPv6)", () => {
  it("full breakdown for 2001:db8::1/64", () => {
    const r = calculateBasicInfo("2001:db8::1", "64");
    assert.ok(r);
    assert.equal(r.family, "ipv6");
    assert.equal(r.address, "2001:db8::1");
    assert.equal(r.netmask, "ffff:ffff:ffff:ffff:0000:0000:0000:0000");
    assert.equal(r.netmaskCIDR, 64);
    assert.equal(r.network, "2001:db8::");
    assert.equal(r.broadcast, "2001:db8::ffff:ffff:ffff:ffff");
    assert.equal(r.hostMin, "2001:db8::1");
    assert.equal(r.hostMax, "2001:db8::ffff:ffff:ffff:fffe");
    // 2^64 - 2, beyond Number.MAX_SAFE_INTEGER is fine as a string
    assert.equal(r.hostsNet, "18446744073709551614");
    assert.equal(r.networkClass, undefined);
    assert.equal(r.networkType, "Documentation (2001:db8::/32, RFC 3849)");
    assert.equal(r.cidrNotation, "2001:db8::/64");
  });

  it("accepts an embedded IPv4 address and a /prefix mask", () => {
    const r = calculateBasicInfo("::ffff:192.168.1.1", "/128");
    assert.ok(r);
    assert.equal(r.family, "ipv6");
    assert.equal(r.cidrNotation, "::ffff:c0a8:101/128");
    assert.equal(r.hostsNet, "1");
  });

  it("/127 keeps both addresses usable (RFC 6164)", () => {
    const r = calculateBasicInfo("2001:db8::", "127");
    assert.ok(r);
    assert.equal(r.hostsNet, "2");
    assert.equal(r.hostMin, "2001:db8::");
    assert.equal(r.hostMax, "2001:db8::1");
  });

  it("rejects a mask wider than the family", () => {
    assert.equal(calculateBasicInfo("::1", "129"), null);
  });
});

describe("calculateSubnets", () => {
  it("splits an IPv6 block", () => {
    const r = calculateSubnets("2001:db8::", 32, 34);
    assert.ok(r);
    assert.equal(r.length, 4);
    assert.equal(r[0].network, "2001:db8::");
    assert.equal(r[0].cidr, 34);
    assert.equal(r[3].network, "2001:db8:c000::");
    assert.equal(r[0].family, "ipv6");
    assert.equal(r[0].hostsNet, "19807040628566084398385987582"); // 2^94 - 2
  });

  it("caps IPv6 output at MAX_SUBNET_ROWS", () => {
    const r = calculateSubnets("::", 0, 57);
    assert.ok(r);
    assert.equal(r.length, 1000);
  });

  it("still splits IPv4 (regression)", () => {
    const r = calculateSubnets("192.168.1.0", 24, 26);
    assert.ok(r);
    assert.equal(r.length, 4);
    assert.equal(r[1].network, "192.168.1.64");
    assert.equal(r[1].hostsNet, 62);
  });

  it("rejects shrinking or out-of-range prefixes", () => {
    assert.equal(calculateSubnets("2001:db8::", 48, 32), null);
    assert.equal(calculateSubnets("2001:db8::", 48, 129), null);
  });
});

describe("calculateSupernet", () => {
  it("merges an IPv4 network (regression)", () => {
    const r = calculateSupernet("192.168.1.0", 24, 22);
    assert.ok(r);
    assert.equal(r.network, "192.168.0.0");
    assert.equal(r.wildcard, "0.0.3.255");
    assert.equal(r.broadcast, "192.168.3.255");
    assert.equal(r.hostsNet, 1022);
  });

  it("merges an IPv6 block", () => {
    const r = calculateSupernet("2001:db8::", 64, 32);
    assert.ok(r);
    assert.equal(r.family, "ipv6");
    assert.equal(r.network, "2001:db8::");
    assert.equal(r.cidrNotation, "2001:db8::/32");
    assert.equal(r.hostsNet, "79228162514264337593543950334");
  });
});

describe("deaggregate", () => {
  it("matches the historical IPv4 output", () => {
    const r = deaggregate("192.168.1.10", "192.168.1.100");
    assert.ok(r);
    assert.equal(r.family, "ipv4");
    assert.deepEqual(r.cidrBlocks, [
      "192.168.1.10/31",
      "192.168.1.12/30",
      "192.168.1.16/28",
      "192.168.1.32/27",
      "192.168.1.64/27",
      "192.168.1.96/30",
      "192.168.1.100/32",
    ]);
    assert.equal(r.totalIPs, 91);
    assert.equal(r.blockCount, 7);
  });

  it("deaggregates a large IPv6 range and counts beyond 32 bits", () => {
    const r = deaggregate("::1", "::ffff:ffff:ffff");
    assert.ok(r);
    assert.equal(r.family, "ipv6");
    assert.equal(r.cidrBlocks[0], "::1/128");
    assert.equal(r.cidrBlocks[1], "::2/127");
    assert.equal(r.cidrBlocks[2], "::4/126");
    assert.equal(r.blockCount, 48);
    assert.equal(r.totalIPs, 281474976710655); // 2^48 - 1 addresses
  });

  it("returns totalIPs as a string when it exceeds Number.MAX_SAFE_INTEGER", () => {
    const r = deaggregate("::", "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff");
    assert.ok(r);
    assert.equal(r.totalIPs, "340282366920938463463374607431768211456"); // 2^128
    assert.equal(r.blockCount, 1);
  });

  it("rejects mixed families and reversed ranges", () => {
    assert.equal(deaggregate("192.168.1.10", "::1"), null);
    assert.equal(deaggregate("::1", "::"), null);
    assert.equal(deaggregate("::1", "192.168.1.1"), null);
  });
});

describe("parseCidr (family detection)", () => {
  it("tags the family and bounds the prefix", () => {
    assert.equal(parseCidr("192.168.1.0/24")?.family, "ipv4");
    assert.equal(parseCidr("2001:db8::/32")?.family, "ipv6");
    assert.equal(parseCidr("2001:db8::/129"), null);
    assert.equal(parseCidr("10.0.0.0/33"), null);
  });
});
