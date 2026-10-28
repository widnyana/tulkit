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

  test("visual mode shows canvas stub or parse-gate lock card", async ({
    page,
  }) => {
    await page.goto("/mermaid-editor");

    await page.getByRole("tab", { name: "Visual" }).click();
    await expect(page.getByTestId("flowchart-canvas")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("tab", { name: "Text" }).click();
    await page
      .getByLabel("Mermaid Code")
      .fill(
        "flowchart TD\n    subgraph One\n        subgraph Two\n        end\n    end",
      );
    await page.getByRole("tab", { name: "Visual" }).click();
    const lock = page.getByRole("status");
    await expect(lock).toContainText("line 3", { timeout: 15_000 });

    await lock.getByRole("button", { name: "Back to Text" }).click();
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(
      "flowchart TD\n    subgraph One\n        subgraph Two\n        end\n    end",
    );
  });

  test("picking a text-only template selects the Text tab", async ({
    page,
  }) => {
    await page.goto("/mermaid-editor");

    await page.getByRole("button", { name: "New diagram" }).click();
    await page.getByRole("button", { name: /Gantt/ }).click();
    await expect(page.getByRole("tab", { name: "Text" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(/gantt/);
  });

  test("palette click adds a node that serializes to the text tab", async ({
    page,
  }) => {
    await page.goto("/mermaid-editor");

    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "New diagram" }).click();
    await page.getByRole("button", { name: /Flowchart/ }).click();
    await expect(page.getByTestId("flowchart-canvas")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Box" }).click();
    await page.getByRole("tab", { name: "Text" }).click();
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(/\[Node\]/);
  });

  test("sequence canvas builds a participant that serializes to the text tab", async ({
    page,
  }) => {
    await page.goto("/mermaid-editor");

    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "New diagram" }).click();
    await page.getByRole("button", { name: /Sequence/ }).click();
    await expect(page.getByTestId("sequence-canvas")).toBeVisible({
      timeout: 15_000,
    });

    await page
      .getByTestId("palette")
      .getByRole("button", { name: "Participant" })
      .click();
    await page.getByLabel("Label").press("Enter");
    await page.getByRole("tab", { name: "Text" }).click();
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(/participant P1/);
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

  test("dragging the connect handle onto a node creates an edge", async ({
    page,
  }) => {
    await page.goto("/mermaid-editor");
    await page.getByRole("tab", { name: "Text" }).click();
    await page
      .getByLabel("Mermaid Code")
      .fill("flowchart TD\n    A[One]\n    B[Two]");
    await page.getByRole("tab", { name: "Visual" }).click();
    await expect(page.getByTestId("flowchart-canvas")).toBeVisible({
      timeout: 15_000,
    });

    const a = page.locator('[data-node-id="A"]');
    const b = page.locator('[data-node-id="B"]');
    const handle = await a.locator("[data-handle]").boundingBox();
    const target = await b.boundingBox();
    expect(handle).not.toBeNull();
    expect(target).not.toBeNull();
    await page.mouse.move(
      handle!.x + handle!.width / 2,
      handle!.y + handle!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      target!.x + target!.width / 2,
      target!.y + target!.height / 2,
      { steps: 10 },
    );
    await page.mouse.up();

    await page.getByRole("tab", { name: "Text" }).click();
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(/A --> B/);
  });

  test("dropping the connect handle on empty canvas creates a node and edge", async ({
    page,
  }) => {
    await page.goto("/mermaid-editor");
    await page.getByRole("tab", { name: "Text" }).click();
    await page
      .getByLabel("Mermaid Code")
      .fill("flowchart TD\n    A[One]\n    B[Two]\n    A --> B");
    await page.getByRole("tab", { name: "Visual" }).click();
    await expect(page.getByTestId("flowchart-canvas")).toBeVisible({
      timeout: 15_000,
    });

    const canvas = page.getByTestId("flowchart-canvas");
    const a = page.locator('[data-node-id="A"]');
    const handle = await a.locator("[data-handle]").boundingBox();
    const box = await canvas.boundingBox();
    expect(handle).not.toBeNull();
    expect(box).not.toBeNull();
    await page.mouse.move(
      handle!.x + handle!.width / 2,
      handle!.y + handle!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width - 30, box!.y + box!.height - 30, {
      steps: 10,
    });
    await page.mouse.up();

    await page.getByRole("tab", { name: "Text" }).click();
    const value = await page.getByLabel("Mermaid Code").inputValue();
    expect(value).toMatch(/C\[/);
    expect(value).toMatch(/A --> B/);
    expect(value).toMatch(/A --> C/);
  });

  test("renaming a node in text mode shows in the visual canvas", async ({
    page,
  }) => {
    await page.goto("/mermaid-editor");
    await page.getByRole("tab", { name: "Text" }).click();
    await page
      .getByLabel("Mermaid Code")
      .fill("flowchart TD\n    A[Renamed]\n    B[Two]");
    await page.getByRole("tab", { name: "Visual" }).click();
    await expect(page.getByTestId("flowchart-canvas")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('[data-node-id="A"]')).toContainText("Renamed", {
      timeout: 15_000,
    });
  });

  test("moving a node persists its layout across reloads", async ({ page }) => {
    await page.goto("/mermaid-editor");
    await page.getByRole("tab", { name: "Text" }).click();
    await page
      .getByLabel("Mermaid Code")
      .fill("flowchart TD\n    A[One]\n    B[Two]");
    await page.getByRole("tab", { name: "Visual" }).click();
    await expect(page.getByTestId("flowchart-canvas")).toBeVisible({
      timeout: 15_000,
    });

    const a = page.locator('[data-node-id="A"]');
    await expect(a).toBeVisible({ timeout: 15_000 });
    const before = await a.boundingBox();
    expect(before).not.toBeNull();
    await page.mouse.move(
      before!.x + before!.width / 2,
      before!.y + before!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      before!.x + before!.width / 2 + 80,
      before!.y + before!.height / 2,
      { steps: 10 },
    );
    await page.mouse.up();

    await page.reload();
    await expect(page.getByTestId("flowchart-canvas")).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("tab", { name: "Text" }).click();
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(
      /%% tulkit-layout/,
    );

    await page.getByRole("tab", { name: "Visual" }).click();
    const after = await page.locator('[data-node-id="A"]').boundingBox();
    expect(after).not.toBeNull();
    expect(Math.abs(after!.x - (before!.x + 80))).toBeLessThanOrEqual(10);
  });

  test("deleting a node removes its edges from the text", async ({ page }) => {
    await page.goto("/mermaid-editor");
    await page.getByRole("tab", { name: "Text" }).click();
    await page
      .getByLabel("Mermaid Code")
      .fill("flowchart TD\n    A[One]\n    B[Two]\n    A --> B");
    await page.getByRole("tab", { name: "Visual" }).click();
    await expect(page.getByTestId("flowchart-canvas")).toBeVisible({
      timeout: 15_000,
    });

    const a = page.locator('[data-node-id="A"]');
    await a.click();
    await a.press("Delete");

    await page.getByRole("tab", { name: "Text" }).click();
    const value = await page.getByLabel("Mermaid Code").inputValue();
    expect(value).not.toMatch(/A --> /);
    expect(value).not.toMatch(/A\[/);
  });

  test("undo restores the previous text and redo reapplies", async ({
    page,
  }) => {
    await page.goto("/mermaid-editor");
    await page.getByRole("tab", { name: "Text" }).click();
    await page
      .getByLabel("Mermaid Code")
      .fill("flowchart TD\n    A[One]\n    B[Two]");
    const before = await page.getByLabel("Mermaid Code").inputValue();

    await page.getByRole("tab", { name: "Visual" }).click();
    await expect(page.getByTestId("flowchart-canvas")).toBeVisible({
      timeout: 15_000,
    });
    await page
      .getByTestId("palette")
      .getByRole("button", { name: "Box" })
      .click();
    await page.getByRole("tab", { name: "Text" }).click();
    const changed = await page.getByLabel("Mermaid Code").inputValue();
    expect(changed).not.toBe(before);

    // The Undo/Redo buttons only render while the Visual tab is active.
    await page.getByRole("tab", { name: "Visual" }).click();
    await page.getByRole("button", { name: "Undo" }).click();
    await page.getByRole("tab", { name: "Text" }).click();
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(before);

    await page.getByRole("tab", { name: "Visual" }).click();
    await page.getByRole("button", { name: "Redo" }).click();
    await page.getByRole("tab", { name: "Text" }).click();
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(changed);
  });

  test("dragging a participant header reorders the participants", async ({
    page,
  }) => {
    await page.goto("/mermaid-editor");
    await page.getByRole("tab", { name: "Text" }).click();
    await page
      .getByLabel("Mermaid Code")
      .fill(
        "sequenceDiagram\n    participant A\n    participant B\n    A->>B: hi",
      );
    await page.getByRole("tab", { name: "Visual" }).click();
    await expect(page.getByTestId("sequence-canvas")).toBeVisible({
      timeout: 15_000,
    });

    const headerA = page.locator('[data-party-id="A"]');
    const headerB = page.locator('[data-party-id="B"]');
    const from = await headerA.boundingBox();
    const to = await headerB.boundingBox();
    expect(from).not.toBeNull();
    expect(to).not.toBeNull();
    await page.mouse.move(
      from!.x + from!.width / 2,
      from!.y + from!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, {
      steps: 10,
    });
    await page.mouse.up();

    await page.getByRole("tab", { name: "Text" }).click();
    const value = await page.getByLabel("Mermaid Code").inputValue();
    expect(value.indexOf("participant B")).toBeLessThan(
      value.indexOf("participant A"),
    );
  });

  test("dismissing the replace confirm keeps the current text", async ({
    page,
  }) => {
    await page.goto("/mermaid-editor");
    await page.getByRole("tab", { name: "Text" }).click();
    const custom = "flowchart TD\n    A[Keep me]";
    await page.getByLabel("Mermaid Code").fill(custom);

    await page.getByRole("button", { name: "New diagram" }).click();
    page.once("dialog", (d) => d.dismiss());
    await page.getByRole("button", { name: /Gantt/ }).click();
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(custom);
  });

  test("keyboard moves a node and deletes it", async ({ page }) => {
    await page.goto("/mermaid-editor");
    await page.getByRole("tab", { name: "Text" }).click();
    await page
      .getByLabel("Mermaid Code")
      .fill("flowchart TD\n    A[One]\n    B[Two]");
    await page.getByRole("tab", { name: "Visual" }).click();
    await expect(page.getByTestId("flowchart-canvas")).toBeVisible({
      timeout: 15_000,
    });

    const a = page.locator('[data-node-id="A"]');
    await a.click();
    await a.press("ArrowRight");

    await page.getByRole("tab", { name: "Text" }).click();
    const value = await page.getByLabel("Mermaid Code").inputValue();
    const match = /%% tulkit-layout \{.*"A":\[(\d+),/s.exec(value);
    expect(match).not.toBeNull();
    const xAfter = Number(match![1]);

    await page.getByRole("tab", { name: "Visual" }).click();
    await a.click();
    await a.press("ArrowLeft");
    await page.getByRole("tab", { name: "Text" }).click();
    const back = await page.getByLabel("Mermaid Code").inputValue();
    const backMatch = /%% tulkit-layout \{.*"A":\[(\d+),/s.exec(back);
    expect(backMatch).not.toBeNull();
    expect(xAfter - Number(backMatch![1])).toBe(10);

    await page.getByRole("tab", { name: "Visual" }).click();
    await a.click();
    await a.press("Delete");
    await page.getByRole("tab", { name: "Text" }).click();
    const finalValue = await page.getByLabel("Mermaid Code").inputValue();
    expect(finalValue).not.toMatch(/A\[/);
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

  test("architecture fixture renders groups in visual mode", async ({
    page,
  }) => {
    await page.goto("/mermaid-editor");
    const fixture = readFileSync(
      path.join(process.cwd(), "lib/mermaid-editor/fixtures/architecture.mmd"),
      "utf8",
    );
    await fillWhenHydrated(page, fixture);
    await page.getByRole("tab", { name: "Visual" }).click();
    await expect(
      page.getByTestId("flowchart-canvas"),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: "Back to Text" }),
    ).toHaveCount(0);
    await expect(page.locator("[data-group-id]")).toHaveCount(6);
  });

  test("architecture fixture shows all groups without negative scroll", async ({
    page,
  }) => {
    await page.goto("/mermaid-editor");
    const fixture = readFileSync(
      path.join(process.cwd(), "lib/mermaid-editor/fixtures/architecture.mmd"),
      "utf8",
    );
    await fillWhenHydrated(page, fixture);
    await page.getByRole("tab", { name: "Visual" }).click();
    const canvas = page.getByTestId("flowchart-canvas");
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("[data-group-id]")).toHaveCount(6);
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(384);
    await canvas.evaluate((el) => {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    });
    const groups = await page.locator("[data-group-id]").all();
    expect(groups.length).toBe(6);
    for (const g of groups) {
      const gb = await g.boundingBox();
      expect(gb).not.toBeNull();
      expect(gb!.y).toBeGreaterThanOrEqual(box!.y);
      expect(gb!.x).toBeGreaterThanOrEqual(box!.x);
    }
  });

  test("dragging the canvas background pans without changing the model", async ({
    page,
  }) => {
    await page.goto("/mermaid-editor");
    const fixture = readFileSync(
      path.join(process.cwd(), "lib/mermaid-editor/fixtures/architecture.mmd"),
      "utf8",
    );
    await fillWhenHydrated(page, fixture);
    await page.getByRole("tab", { name: "Text" }).click();
    const before = await page.getByLabel("Mermaid Code").inputValue();
    await page.getByRole("tab", { name: "Visual" }).click();
    const canvas = page.getByTestId("flowchart-canvas");
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const px = box!.x + 8;
    const py = box!.y + 8;
    const tag = await page.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x, y);
        const container = document.querySelector('[data-testid="flowchart-canvas"]');
        return el && container && (el === container || container.contains(el))
          ? el.tagName
          : null;
      },
      [px, py],
    );
    expect(tag).not.toBeNull();
    await page.mouse.move(px, py);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(px - i * 20, py);
    }
    await page.mouse.up();
    const scrollLeft = await canvas.evaluate((el) => el.scrollLeft);
    expect(scrollLeft).toBeGreaterThan(0);
    await page.getByRole("tab", { name: "Text" }).click();
    const after = await page.getByLabel("Mermaid Code").inputValue();
    expect(after).toBe(before);
  });

  test("deleting a grouped node cleans its class entry", async ({ page }) => {
    await page.goto("/mermaid-editor");
    const fixture = readFileSync(
      path.join(process.cwd(), "lib/mermaid-editor/fixtures/architecture.mmd"),
      "utf8",
    );
    await fillWhenHydrated(page, fixture);
    await page.getByRole("tab", { name: "Visual" }).click();
    const dlq = page.locator('[data-node-id="DLQ"]');
    await expect(dlq).toBeVisible({ timeout: 30_000 });
    await dlq.click();
    await dlq.press("Delete");

    await page.getByRole("tab", { name: "Text" }).click();
    const value = await page.getByLabel("Mermaid Code").inputValue();
    expect(value).toContain("class Reject bad");
    expect(value).not.toContain("DLQ");
  });

  test("dropping a node into a group adds it as a member", async ({ page }) => {
    await page.goto("/mermaid-editor");
    await page.getByRole("tab", { name: "Text" }).click();
    await page
      .getByLabel("Mermaid Code")
      .fill(
        'flowchart TD\n    subgraph G["Group"]\n        A[One]\n    end\n    B[Two]',
      );
    await page.getByRole("tab", { name: "Visual" }).click();
    const b = page.locator('[data-node-id="B"]');
    await expect(b).toBeVisible({ timeout: 15_000 });
    const box = await page.locator('[data-group-id="G"]').boundingBox();
    const from = await b.boundingBox();
    expect(box).not.toBeNull();
    expect(from).not.toBeNull();
    await page.mouse.move(
      from!.x + from!.width / 2,
      from!.y + from!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      box!.x + box!.width / 2,
      box!.y + box!.height / 2,
      { steps: 10 },
    );
    await page.mouse.up();

    await page.getByRole("tab", { name: "Text" }).click();
    const value = await page.getByLabel("Mermaid Code").inputValue();
    const subgraph = /subgraph G[^\n]*\n([\s\S]*?)\n    end/.exec(value);
    expect(subgraph).not.toBeNull();
    expect(subgraph![1]).toContain("B[Two]");
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
});
