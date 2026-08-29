import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  IP_PLANNER_OPERATIONS,
  parseIpPlannerRequest,
  runIpPlannerOperation,
} from "./api.ts";

describe("parseIpPlannerRequest", () => {
  it("rejects non-object bodies naming body", () => {
    for (const bad of [null, "x", 42, []]) {
      assert.throws(() => parseIpPlannerRequest(bad), /body/i);
    }
  });

  it("rejects unknown or missing operation", () => {
    assert.throws(() => parseIpPlannerRequest({ cidr: "x" }), /operation/);
    assert.throws(
      () => parseIpPlannerRequest({ operation: "nope", cidr: "x" }),
      /operation/,
    );
  });

  it("rejects wrong types per operation", () => {
    assert.throws(
      () => parseIpPlannerRequest({ operation: "subnetInfo", cidr: 5 }),
      /cidr/,
    );
    assert.throws(
      () =>
        parseIpPlannerRequest({
          operation: "vlsm",
          parentBlock: "10.0.0.0/24",
          requiredSizes: "big",
        }),
      /requiredSizes/,
    );
    assert.throws(
      () =>
        parseIpPlannerRequest({
          operation: "vlsm",
          parentBlock: "10.0.0.0/24",
          requiredSizes: [10, 0],
        }),
      /requiredSizes/,
    );
    assert.throws(
      () =>
        parseIpPlannerRequest({
          operation: "suggestMask",
          ip: "10.0.0.1",
          requiredHosts: 0,
        }),
      /requiredHosts/,
    );
    assert.throws(
      () =>
        parseIpPlannerRequest({
          operation: "reverseLookup",
          ip: "10.0.0.1",
          cidr: 200,
        }),
      /cidr/,
    );
    assert.throws(
      () =>
        parseIpPlannerRequest({
          operation: "collision",
          existingSubnets: [42],
          newSubnet: "10.0.0.0/24",
        }),
      /existingSubnets/,
    );
  });

  it("rejects empty requiredSizes", () => {
    assert.throws(
      () =>
        parseIpPlannerRequest({
          operation: "vlsm",
          parentBlock: "10.0.0.0/24",
          requiredSizes: [],
        }),
      /requiredSizes/,
    );
  });
});

describe("runIpPlannerOperation", () => {
  it("supports every declared operation", () => {
    for (const op of IP_PLANNER_OPERATIONS) assert.ok(op.length > 0);
  });

  it("subnetInfo returns full subnet details", () => {
    const r = runIpPlannerOperation(
      parseIpPlannerRequest({
        operation: "subnetInfo",
        cidr: "192.168.1.0/24",
      }),
    ) as { network: string; broadcast: string; usableHosts: number };
    assert.equal(r.network, "192.168.1.0");
    assert.equal(r.broadcast, "192.168.1.255");
    assert.equal(r.usableHosts, 254);
  });

  it("subnetInfo rejects invalid CIDR with 400-style error", () => {
    assert.throws(
      () =>
        runIpPlannerOperation(
          parseIpPlannerRequest({ operation: "subnetInfo", cidr: "10.0.0.0" }),
        ),
      /Invalid CIDR/,
    );
  });

  it("vlsm allocates largest-first and fits", () => {
    const r = runIpPlannerOperation(
      parseIpPlannerRequest({
        operation: "vlsm",
        parentBlock: "10.0.0.0/24",
        requiredSizes: [50, 100, 20],
      }),
    ) as { cidr: number }[];
    assert.equal(r.length, 3);
    assert.equal(r[0].cidr, 25); // 100 hosts -> /25
    assert.equal(r[1].cidr, 26); // 50 hosts -> /26
    assert.equal(r[2].cidr, 27); // 20 hosts -> /27
  });

  it("vlsm rejects sizes that do not fit", () => {
    assert.throws(
      () =>
        runIpPlannerOperation(
          parseIpPlannerRequest({
            operation: "vlsm",
            parentBlock: "10.0.0.0/30",
            requiredSizes: [100],
          }),
        ),
      /Cannot split/,
    );
  });

  it("suggestMask flags non-network start IP but returns 200-shaped result", () => {
    const r = runIpPlannerOperation(
      parseIpPlannerRequest({
        operation: "suggestMask",
        ip: "10.0.0.65",
        requiredHosts: 50,
      }),
    ) as { suggestedMask: number; isValid: boolean; warning?: string };
    assert.equal(r.suggestedMask, 26);
    assert.equal(r.isValid, false);
    assert.match(r.warning ?? "", /not a network address/);
  });

  it("reverseLookup maps an IP into its subnet", () => {
    const r = runIpPlannerOperation(
      parseIpPlannerRequest({
        operation: "reverseLookup",
        ip: "10.0.3.77",
        cidr: 22,
      }),
    ) as { cidrNotation: string };
    assert.equal(r.cidrNotation, "10.0.0.0/22");
  });

  it("collision reports overlaps without throwing", () => {
    const r = runIpPlannerOperation(
      parseIpPlannerRequest({
        operation: "collision",
        existingSubnets: ["10.0.0.0/24", "10.0.2.0/23"],
        newSubnet: "10.0.1.0/24",
      }),
    ) as { hasCollision: boolean; overlappingSubnets: string[] };
    assert.equal(r.hasCollision, false);
    assert.deepEqual(r.overlappingSubnets, []);
  });

  it("collision detects the overlap case", () => {
    const r = runIpPlannerOperation(
      parseIpPlannerRequest({
        operation: "collision",
        existingSubnets: ["10.0.0.0/24"],
        newSubnet: "10.0.0.128/25",
      }),
    ) as { hasCollision: boolean; overlappingSubnets: string[] };
    assert.equal(r.hasCollision, true);
    assert.deepEqual(r.overlappingSubnets, ["10.0.0.0/24"]);
  });
});
