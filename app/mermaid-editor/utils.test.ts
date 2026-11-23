import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { highlightMermaid } from "./utils.ts";

describe("highlightMermaid arrows", () => {
  it("tokenizes a plain arrow", () => {
    const arrows = highlightMermaid("A --> B").filter(
      (token) => token.kind === "arrow",
    );
    assert.equal(arrows.length, 1);
    assert.equal(arrows[0]?.text, "-->");
  });

  it("tokenizes a comment-ending arrow", () => {
    const arrows = highlightMermaid("A --!> B").filter(
      (token) => token.kind === "arrow",
    );
    assert.equal(arrows.length, 1);
    assert.equal(arrows[0]?.text, "--!>");
  });

  it("reproduces the input from the token texts", () => {
    const mermaidSource = ["A --> B", "A --!> B"];
    for (const source of mermaidSource) {
      assert.equal(
        highlightMermaid(source)
          .map((token) => token.text)
          .join(""),
        source,
      );
    }
  });
});
