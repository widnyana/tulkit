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
      .fill("flowchart TD\n    subgraph One\n    end");
    await page.getByRole("tab", { name: "Visual" }).click();
    const lock = page.getByRole("status");
    await expect(lock).toContainText("line 2", { timeout: 15_000 });

    await lock.getByRole("button", { name: "Back to Text" }).click();
    await expect(page.getByLabel("Mermaid Code")).toHaveValue(
      "flowchart TD\n    subgraph One\n    end",
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
});
