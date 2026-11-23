import assert from "node:assert/strict";
import { test } from "node:test";
import { isPrivateHostname, pinnedUrl, validateOutbound } from "./outbound.ts";

const ALLOWED = ["example.com", "maps.app.goo.gl"];

const rejects = (raw: string): boolean =>
  "error" in validateOutbound(raw, ALLOWED);

test("validateOutbound rejects non-http protocols", () => {
  assert.equal(rejects("ftp://example.com/file"), true);
  assert.equal(rejects("file:///etc/passwd"), true);
});

test("validateOutbound rejects hosts outside the allowlist", () => {
  assert.equal(rejects("https://unknown.example.net/path"), true);
  assert.equal(rejects("https://example.com.attacker.net/path"), true);
});

test("validateOutbound rejects private network hosts", () => {
  for (const host of [
    "127.0.0.1",
    "10.1.2.3",
    "192.168.1.1",
    "172.20.0.1",
    "169.254.1.1",
    "foo.local",
  ]) {
    assert.equal(isPrivateHostname(host), true, host);
    assert.equal(
      rejects(`https://${host}/path`),
      true,
      "allowlisted private host must still be rejected",
    );
  }
  assert.equal(
    "error" in validateOutbound("http://127.0.0.1/", ["127.0.0.1"]),
    true,
  );
});

test("validateOutbound accepts allowlisted hosts", () => {
  const result = validateOutbound("https://example.com/a?b=1", ALLOWED);
  assert.equal("error" in result, false);
  if ("error" in result) return;
  assert.equal(result.url.href, "https://example.com/a?b=1");
});

test("validateOutbound keeps the route-specific host error wording", () => {
  const result = validateOutbound(
    "https://nope.test/",
    ALLOWED,
    "Host is not an allowed Google Maps host",
  );
  assert.deepEqual(result, {
    error: "Host is not an allowed Google Maps host",
  });
});

test("pinnedUrl keeps path and query and forces https", () => {
  const pinned = pinnedUrl(new URL("http://example.com/a/b?c=1&d=2"), ALLOWED);
  assert.ok(pinned);
  assert.equal(pinned.href, "https://example.com/a/b?c=1&d=2");
});

test("pinnedUrl returns null for unknown hosts", () => {
  assert.equal(pinnedUrl(new URL("https://unknown.test/a"), ALLOWED), null);
});
