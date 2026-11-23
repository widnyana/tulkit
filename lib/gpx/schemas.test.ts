import assert from "node:assert/strict";
import { test } from "node:test";
import { Effect } from "effect";
import { InvalidPayload } from "./errors.ts";
import {
  decodeElevations,
  decodePlaceEntry,
  decodePlaceList,
  decodeRouting,
  decodeSnap,
  decodeStoredEntry,
} from "./schemas.ts";

async function expectInvalidPayload<A>(
  effect: Effect.Effect<A, InvalidPayload>,
): Promise<void> {
  const error = await Effect.runPromise(Effect.flip(effect));
  assert.ok(error instanceof InvalidPayload);
  assert.ok(error.message.length > 0, "message must not be empty");
  assert.ok(
    error.message.length < 200,
    `message must stay short: ${error.message}`,
  );
  assert.ok(!error.message.includes("Expected"), error.message);
  assert.ok(!error.message.includes("\n"), error.message);
}

test("decodeRouting decodes coordinate pairs", async () => {
  const decoded = await Effect.runPromise(
    decodeRouting({ coordinates: [[20.5, 10.5]] }),
  );
  assert.deepEqual(decoded, { coordinates: [[20.5, 10.5]] });
});

test("decodeRouting rejects a malformed coordinate pair", async () => {
  await expectInvalidPayload(decodeRouting({ coordinates: [[20.5, "10.5"]] }));
});

test("decodeSnap decodes a snapped point", async () => {
  const decoded = await Effect.runPromise(
    decodeSnap({
      point: { lat: -7.782, lon: 110.369 },
      distance: 29,
      reason: "ok",
    }),
  );
  assert.deepEqual(decoded, {
    point: { lat: -7.782, lon: 110.369 },
    distance: 29,
    reason: "ok",
  });
});

test("decodeSnap rejects a malformed point", async () => {
  await expectInvalidPayload(decodeSnap({ point: { lat: "north" } }));
});

test("decodeElevations decodes numbers and gaps", async () => {
  const decoded = await Effect.runPromise(
    decodeElevations({ elevations: [127, null] }),
  );
  assert.deepEqual(decoded, { elevations: [127, null] });
});

test("decodeElevations rejects a malformed height", async () => {
  await expectInvalidPayload(decodeElevations({ elevations: [127, "high"] }));
});

test("decodePlaceList decodes a tolerant entry array", async () => {
  const entries = [{ lat: "1" }, 42, null];
  const decoded = await Effect.runPromise(decodePlaceList(entries));
  assert.deepEqual(decoded, entries);
});

test("decodePlaceList rejects a non-array body", async () => {
  await expectInvalidPayload(decodePlaceList({ lat: 1 }));
});

test("decodePlaceEntry keeps unknown field values and skips non-objects", () => {
  assert.deepEqual(decodePlaceEntry({ lat: "1", display_name: "Jakarta" }), {
    lat: "1",
    display_name: "Jakarta",
  });
  assert.equal(decodePlaceEntry("not an entry"), null);
});

test("decodeStoredEntry returns the raw text only for a well-formed entry", () => {
  assert.deepEqual(decodeStoredEntry({ rawText: "<gpx/>", savedAt: 7 }), {
    rawText: "<gpx/>",
    savedAt: 7,
  });
  assert.equal(decodeStoredEntry({ rawText: 1 }), null);
  assert.equal(decodeStoredEntry("a string"), null);
});
