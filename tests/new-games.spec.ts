import { expect, test, type Page } from "@playwright/test";

async function useDeterministicExamples(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
}

async function expectNoPageOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function expectChallengeRecovery(
  page: Page,
  wrongAnswer: RegExp,
  correctAnswer: RegExp,
): Promise<void> {
  await page.getByRole("button", { name: /CHALLENGE/ }).click();
  await page.getByRole("button", { name: wrongAnswer }).click();
  await expect(page.getByRole("status")).toContainText("Try again");
  await expect(page.locator(".score-box small")).toContainText("0 /");

  await page.getByRole("button", { name: correctAnswer }).click();
  await expect(page.getByRole("status")).toContainText("Correct");
  await expect(page.locator(".score-box small")).toContainText("1 /");
}

test.beforeEach(async ({ page }) => {
  await useDeterministicExamples(page);
});

test("Target Lock completes Explore and recovers in Challenge", async ({
  page,
}) => {
  await page.goto("./#/games/pair-sum");
  await expect(
    page.getByRole("heading", { level: 1, name: "Target Lock" }),
  ).toBeVisible();

  await page
    .getByLabel("2-12 sorted integers")
    .fill("-4, -1, -1, 0, 1, 2, 2, 5, 10 | 4");
  await page.getByRole("button", { name: "RUN TRACE" }).click();
  await page.getByRole("button", { name: "Last step" }).click();
  await expect(page.locator(".vault-pair strong")).toHaveText([
    "(-1, 5)",
    "(2, 2)",
  ]);
  await expectNoPageOverflow(page);

  await expectChallengeRecovery(
    page,
    /MOVE LEFT POINTER/,
    /MOVE RIGHT POINTER/,
  );
  await expectNoPageOverflow(page);
});

test("Mirror Scan completes Explore and recovers in Challenge", async ({
  page,
}) => {
  await page.goto("./#/games/palindrome");
  await expect(
    page.getByRole("heading", { level: 1, name: "Mirror Scan" }),
  ).toBeVisible();

  await page.getByLabel("1-48 lowercase ASCII letters").fill("racecar");
  await page.getByRole("button", { name: "RUN TRACE" }).click();
  await page.getByRole("button", { name: "Last step" }).click();
  await expect(page.locator(".verdict-panel strong")).toHaveText("PALINDROME");
  await expectNoPageOverflow(page);

  await expectChallengeRecovery(page, /MISMATCH/, /= MATCH/);
  await expectNoPageOverflow(page);
});

test("Window Rescue completes Explore and recovers in Challenge", async ({
  page,
}) => {
  await page.goto("./#/games/minimum-window");
  await expect(
    page.getByRole("heading", { level: 1, name: "Window Rescue" }),
  ).toBeVisible();

  await page.getByLabel("1-12 positive integers").fill("2, 3, 1, 2, 4, 3 | 7");
  await page.getByRole("button", { name: "RUN TRACE" }).click();
  await page.getByRole("button", { name: "Last step" }).click();
  await expect(page.locator('[data-result="indices"]')).toHaveText("[4, 6)");
  await expect(page.locator('[data-result="length"]')).toHaveText("2");
  await expectNoPageOverflow(page);

  await expectChallengeRecovery(page, /SHRINK LEFT/, /EXPAND RIGHT/);
  await expectNoPageOverflow(page);
});

test("Repeat Breaker completes Explore and recovers in Challenge", async ({
  page,
}) => {
  await page.goto("./#/games/unique-substring");
  await expect(
    page.getByRole("heading", { level: 1, name: "Repeat Breaker" }),
  ).toBeVisible();

  await page.getByLabel("1-16 lowercase ASCII letters").fill("abcabcbb");
  await page.getByRole("button", { name: "RUN TRACE" }).click();
  await page.getByRole("button", { name: "Last step" }).click();
  await expect(page.locator(".best-run-value")).toHaveText("abc");
  await expect(page.locator(".best-run dd")).toHaveText(["[0, 3)", "3"]);
  await expectNoPageOverflow(page);

  await expectChallengeRecovery(page, /SHRINK LEFT/, /EXPAND RIGHT/);
  await expectNoPageOverflow(page);
});

test("Range Relay completes Explore and recovers in Challenge", async ({
  page,
}) => {
  await page.goto("./#/games/prefix-sum");
  await expect(
    page.getByRole("heading", { level: 1, name: "Range Relay" }),
  ).toBeVisible();

  await page
    .getByLabel("1-12 integers | start:end (half-open range)")
    .fill("2, -1, 4, 3 | 1:4");
  await page.getByRole("button", { name: "RUN TRACE" }).click();
  await page.getByRole("button", { name: "Last step" }).click();
  await expect(page.locator('[data-result="range-sum"]')).toHaveText("6");
  await expectNoPageOverflow(page);

  await expectChallengeRecovery(page, /ADD/, /SUBTRACT/);
  await expectNoPageOverflow(page);
});

test("Anagram Assembly completes Explore and recovers in Challenge", async ({
  page,
}) => {
  await page.goto("./#/games/anagram-grouping");
  await expect(
    page.getByRole("heading", { level: 1, name: "Anagram Assembly" }),
  ).toBeVisible();

  await page
    .getByLabel("1-10 comma-delimited lowercase words; 1-10 letters each")
    .fill("eat, tea, tan, ate, nat, bat");
  await page.getByRole("button", { name: "RUN TRACE" }).click();
  await page.getByRole("button", { name: "Last step" }).click();
  await expect(page.getByText("FINAL OUTPUT").locator("..")).toContainText(
    "[[eat,tea,ate],[tan,nat],[bat]]",
  );
  await expectNoPageOverflow(page);
  await page.getByRole("tab", { name: "PYTHON CODE" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("def group_anagrams");
  await expectNoPageOverflow(page);

  await expectChallengeRecovery(page, /APPEND TO GROUP/, /CREATE NEW GROUP/);
  await expectNoPageOverflow(page);
});

test("Token Tally completes Explore and recovers in Challenge", async ({
  page,
}) => {
  await page.goto("./#/games/frequency-map");
  await expect(
    page.getByRole("heading", { level: 1, name: "Token Tally" }),
  ).toBeVisible();

  await page
    .getByLabel("1-12 comma-delimited lowercase words; 1-12 letters each")
    .fill("red, blue, red, gold, blue, red");
  await page.getByRole("button", { name: "RUN TRACE" }).click();
  await page.getByRole("button", { name: "Last step" }).click();
  await expect(page.getByText("FINAL COUNTS").locator("..")).toContainText(
    "{red: 3, blue: 2, gold: 1}",
  );
  await expectNoPageOverflow(page);

  await expectChallengeRecovery(page, /INCREMENT COUNT/, /INSERT COUNT 1/);
  await expectNoPageOverflow(page);
});

test("Histogram Forge completes Explore and recovers in Challenge", async ({
  page,
}) => {
  await page.goto("./#/games/histogram-counting");
  await expect(
    page.getByRole("heading", { level: 1, name: "Histogram Forge" }),
  ).toBeVisible();

  await page
    .getByLabel("1-16 integers from 0 to 99, separated by commas or spaces")
    .fill("4, 18, 26, 31, 51, 74, 75, 99, 26");
  await page.getByRole("button", { name: "RUN TRACE" }).click();
  await page.getByRole("button", { name: "Last step" }).click();
  await expect(
    page
      .getByLabel("Histogram result and complexity")
      .locator('[data-result-bin="25-49"] dd'),
  ).toHaveText("3");
  await expectNoPageOverflow(page);

  await expectChallengeRecovery(page, /RANGE 0-24/, /RANGE 50-74/);
  await expectNoPageOverflow(page);
});

test("shared game controls support keyboard operation", async ({ page }) => {
  await page.goto("./#/games/pair-sum");
  const input = page.getByLabel("2-12 sorted integers");
  await input.fill("1, 2, 3, 4 | 5");
  await page.getByRole("button", { name: "RUN TRACE" }).focus();
  await page.keyboard.press("Enter");

  const lastStep = page.getByRole("button", { name: "Last step" });
  await lastStep.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".vault-pair strong")).toHaveText([
    "(1, 4)",
    "(2, 3)",
  ]);

  const pseudocode = page.getByRole("tab", { name: "PSEUDOCODE" });
  await pseudocode.focus();
  await page.keyboard.press("ArrowRight");
  const pythonCode = page.getByRole("tab", { name: "PYTHON CODE" });
  await expect(pythonCode).toHaveAttribute("aria-selected", "true");
  await expect(pythonCode).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("def pair_sum");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("tabpanel")).toBeFocused();
  await expectNoPageOverflow(page);

  const challenge = page.getByRole("button", { name: /CHALLENGE/ });
  await challenge.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: /LEFT .* RIGHT/ }),
  ).toBeVisible();
});

test("code panel fills a phone row", async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 800 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("./#/games/pair-sum");
    await page.getByRole("tab", { name: "PYTHON CODE" }).click();

    const debugBox = await page.locator(".debug-grid").boundingBox();
    const codeBox = await page.locator(".code-panel").boundingBox();
    const diagnosticsBox = await page
      .locator(".diagnostics-panel")
      .boundingBox();
    if (!debugBox || !codeBox || !diagnosticsBox) {
      throw new Error("Expected code and diagnostics layout boxes.");
    }

    expect(Math.abs(codeBox.width - debugBox.width)).toBeLessThan(1);
    expect(Math.abs(diagnosticsBox.width - debugBox.width)).toBeLessThan(1);
    expect(diagnosticsBox.y).toBeGreaterThanOrEqual(codeBox.y + codeBox.height);
  }
});
