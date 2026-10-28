import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

test.describe("Mermaid editor", () => {
  test("renders the diagram, reports syntax errors, and exports SVG", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err: Error) => pageErrors.push(err.message));

    await page.goto("/mermaid-editor");
    const preview = page.getByLabel("Diagram preview");

    // Sample loads on first visit and renders an SVG.
    await expect(preview.locator("svg")).toBeVisible({ timeout: 30_000 });

    await page
      .getByLabel("Mermaid Code")
      .fill("graph TD\n  X[Alpha] --> Y[Beta]");
    await expect(preview.locator("svg")).toContainText("Alpha", {
      timeout: 15_000,
    });

    const downloads: string[] = [];
    page.on("download", (d) => downloads.push(d.suggestedFilename()));
    await page.getByRole("button", { name: "Download SVG" }).click();
    await expect.poll(() => downloads).toContain("diagram.svg");
    await page.getByRole("button", { name: "Download PNG" }).click();
    await expect.poll(() => downloads).toContain("diagram.png");

    // Invalid syntax surfaces an alert.
    await page.getByLabel("Mermaid Code").fill("graph TD\n  A --> ((((");
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });

    expect(pageErrors).toEqual([]);
  });

  test("code persists across reloads", async ({ page }) => {
    await page.goto("/mermaid-editor");
    await page.getByLabel("Mermaid Code").fill("graph LR\n  P --> Q");
    await page.reload();
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(
      "graph LR\n  P --> Q",
    );
  });

  test("each picker card renders a preview without errors", async ({
    page,
  }) => {
    const cards = [
      "Flowchart",
      "Sequence",
      "Class",
      "State",
      "ER",
      "Gantt",
      "Pie",
      "Mindmap",
      "Timeline",
      "Git graph",
    ];
    for (const name of cards) {
      await page.goto("/mermaid-editor");
      page.once("dialog", (d) => d.accept());
      await page.getByRole("button", { name: "New diagram" }).click();
      // The card's accessible name includes its blurb text, so anchor at the
      // start ("ER" alone would substring-match other buttons).
      await page
        .getByRole("button", { name: new RegExp(`^${name} `) })
        .click();
      const preview = page.getByLabel("Diagram preview");
      await expect(preview.locator("svg")).toBeVisible({ timeout: 15_000 });
      // Scope to the app's own error paragraph: Next.js adds an empty
      // route-announcer element with role="alert".
      await expect(page.locator('p[role="alert"]')).toHaveCount(0);
    }
  });

  test("dismissing the replace confirm keeps the current text", async ({
    page,
  }) => {
    await page.goto("/mermaid-editor");
    const custom = "flowchart TD\n    A[Keep me]";
    await page.getByLabel("Mermaid Code").fill(custom);

    await page.getByRole("button", { name: "New diagram" }).click();
    page.once("dialog", (d) => d.dismiss());
    await page.getByRole("button", { name: /Gantt/ }).click();
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(custom);
  });

  test("preview svg exposes element ids for editing", async ({ page }) => {
    await page.goto("/mermaid-editor");
    const preview = page.getByLabel("Diagram preview");
    await fillWhenHydrated(
      page,
      "graph TD\n    A[Start] --> B[End]\n    A --> B\n    subgraph G[\"Group\"]\n        C[In]\n    end",
    );
    await expect(
      preview.locator('g.node[id$="-flowchart-A-0"]'),
    ).toHaveCount(1, { timeout: 30_000 });
    await expect(
      preview.locator('[data-et="edge"][data-id="L_A_B_2"]'),
    ).toHaveCount(1);
    await expect(
      preview.locator('g.cluster[id$="-G"]'),
    ).toHaveCount(1);
    await fillWhenHydrated(
      page,
      "sequenceDiagram\n    participant Alice\n    participant Bob\n    Alice ->> Bob: Hi",
    );
    await expect(
      preview.locator('[data-et="participant"][data-id="Alice"]').first(),
    ).toBeVisible();
    await expect(preview.locator('[data-et="message"]')).toHaveCount(1);
  });

  const node = (page: import("@playwright/test").Page, id: string) =>
    page
      .getByLabel("Diagram preview")
      .locator(`g.node[id*="-flowchart-${id}-"]`);

  test("preview edit adds a node from the palette", async ({ page }) => {
    await page.goto("/mermaid-editor");
    await fillWhenHydrated(page, "graph TD\n    A[Start] --> B[End]");
    await expect(node(page, "B")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Edit" }).click();
    await page
      .getByTestId("palette")
      .getByRole("button", { name: "Box" })
      .click();
    const label = page.getByLabel("Label");
    await expect(label).toBeVisible();
    await label.fill("Third");
    await label.press("Enter");
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(
      /C\[Third\]/,
    );
  });

  test("preview edit connects two nodes by dragging", async ({ page }) => {
    await page.goto("/mermaid-editor");
    await fillWhenHydrated(page, "graph TD\n    A[Start]\n    B[End]");
    await expect(node(page, "A")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Edit" }).click();
    const a = await node(page, "A").boundingBox();
    const b = await node(page, "B").boundingBox();
    if (!a || !b) throw new Error("nodes not rendered");
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, {
      steps: 10,
    });
    await page.mouse.up();
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(
      /A --> B/,
    );
  });

  test("preview edit renames and deletes nodes", async ({ page }) => {
    await page.goto("/mermaid-editor");
    await fillWhenHydrated(page, "graph TD\n    A[Start] --> B[End]");
    await expect(node(page, "A")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Edit" }).click();
    await node(page, "B").dblclick();
    const label = page.getByLabel("Label");
    await expect(label).toBeVisible();
    await label.fill("Done");
    await label.press("Enter");
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(
      /B\[Done\]/,
    );
    await expect(node(page, "A")).toBeVisible();
    await node(page, "A").click();
    await page.keyboard.press("Delete");
    await expect(page.getByLabel("Mermaid Code")).not.toHaveValue(
      /A\[Start\]/,
    );
  });

  test("preview edit is disabled for text-only diagrams", async ({ page }) => {
    await page.goto("/mermaid-editor");
    await fillWhenHydrated(
      page,
      'pie title Pets\n    "Dogs" : 3\n    "Cats" : 2',
    );
    await expect(page.getByRole("button", { name: "Edit" })).toBeDisabled({
      timeout: 15_000,
    });
  });

  test("edit off keeps drag to pan", async ({ page }) => {
    await page.goto("/mermaid-editor");
    await fillWhenHydrated(page, "graph TD\n    A[Start] --> B[End]");
    await expect(node(page, "A")).toBeVisible({ timeout: 30_000 });
    const before = await node(page, "A").boundingBox();
    if (!before) throw new Error("node A not rendered");
    const box = await page.getByLabel("Diagram preview").boundingBox();
    if (!box) throw new Error("preview not rendered");
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 90, box.y + 10, { steps: 5 });
    await page.mouse.up();
    const after = await node(page, "A").boundingBox();
    if (!after) throw new Error("node A not rendered");
    expect(after.x).toBeGreaterThan(before.x + 40);
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(
      /A\[Start\] --> B\[End\]/,
    );
  });

  test("preview edit adds a participant", async ({ page }) => {
    await page.goto("/mermaid-editor");
    await fillWhenHydrated(
      page,
      "sequenceDiagram\n    participant Alice\n    participant Bob\n    Alice ->> Bob: Hi",
    );
    const alice = page
      .getByLabel("Diagram preview")
      .locator('[data-et="participant"][data-id="Alice"]')
      .first();
    await expect(alice).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByTestId("palette").getByRole("button", { name: "Participant" }).click();
    const labelInput = page.getByLabel("Label");
    await expect(labelInput).toBeVisible();
    await labelInput.fill("Carol");
    await labelInput.press("Enter");
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(
      /participant P1 as Carol/,
    );
  });

  test("preview edit adds a message by dragging", async ({ page }) => {
    await page.goto("/mermaid-editor");
    await fillWhenHydrated(
      page,
      "sequenceDiagram\n    participant Alice\n    participant Bob\n    Alice ->> Bob: Hi",
    );
    const preview = page.getByLabel("Diagram preview");
    const alice = preview
      .locator('[data-et="participant"][data-id="Alice"]')
      .first();
    const bob = preview
      .locator('[data-et="participant"][data-id="Bob"]')
      .first();
    await expect(alice).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Edit" }).click();
    const a = await alice.boundingBox();
    const b = await bob.boundingBox();
    if (!a || !b) throw new Error("participants not rendered");
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
    await page.mouse.up();
    const labelInput = page.getByLabel("Label");
    await expect(labelInput).toBeVisible();
    await labelInput.fill("Ping");
    await labelInput.press("Enter");
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(
      /Alice ->> Bob: Ping/,
    );
  });

  test("preview edit renames and deletes participants", async ({ page }) => {
    await page.goto("/mermaid-editor");
    await fillWhenHydrated(
      page,
      "sequenceDiagram\n    participant Alice\n    participant Bob\n    Alice ->> Bob: Hi",
    );
    const preview = page.getByLabel("Diagram preview");
    const alice = preview
      .locator('[data-et="participant"][data-id="Alice"]')
      .first();
    const bob = preview
      .locator('[data-et="participant"][data-id="Bob"]')
      .first();
    await expect(alice).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Edit" }).click();
    await bob.dblclick();
    const labelInput = page.getByLabel("Label");
    await expect(labelInput).toBeVisible();
    await labelInput.fill("Robert");
    await labelInput.press("Enter");
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(
      /participant Bob as Robert/,
    );
    await expect(alice).toBeVisible({ timeout: 30_000 });
    await alice.click();
    await page.keyboard.press("Delete");
    await expect(page.getByLabel("Mermaid Code")).not.toHaveValue(/Alice/);
  });

  test("picking a template sets edit mode", async ({ page }) => {
    await page.goto("/mermaid-editor");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "New diagram" }).click();
    await page.getByRole("button", { name: /^Sequence / }).click();
    const edit = page.getByRole("button", { name: "Edit" });
    await expect(edit).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "New diagram" }).click();
    await page.getByRole("button", { name: /^Gantt / }).click();
    await expect(edit).toBeDisabled();
  });

  test("preview undo and redo", async ({ page }) => {
    await page.goto("/mermaid-editor");
    await fillWhenHydrated(page, "graph TD\n    A[Start]");
    await expect(node(page, "A")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Edit" }).click();
    await page
      .getByTestId("palette")
      .getByRole("button", { name: "Box" })
      .click();
    const label = page.getByLabel("Label");
    await expect(label).toBeVisible();
    await label.press("Enter");
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(/B\[Node\]/);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByLabel("Mermaid Code")).not.toHaveValue(/B\[/);
    await page.getByRole("button", { name: "Redo" }).click();
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(/B\[Node\]/);
  });

  test("architecture fixture is editable in the preview", async ({ page }) => {
    await page.goto("/mermaid-editor");
    const fixture = readFileSync(
      path.join(process.cwd(), "lib/mermaid-editor/fixtures/architecture.mmd"),
      "utf8",
    );
    const preview = page.getByLabel("Diagram preview");
    await fillWhenHydrated(page, fixture);
    await expect(preview.locator("g.cluster")).toHaveCount(6, {
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: "Edit" })).toBeEnabled();
  });

  // The page hydrates its textarea after mount (localStorage ?? SAMPLE); a
  // fill issued before that effect runs gets overwritten, so wait it out.
  async function fillWhenHydrated(
    page: import("@playwright/test").Page,
    value: string,
  ): Promise<void> {
    const ta = page.getByLabel("Mermaid Code");
    await expect(ta).toBeVisible();
    await expect(ta).not.toBeEmpty();
    await ta.fill(value);
  }
});
