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

  const challenge = page.getByRole("button", { name: /CHALLENGE/ });
  await challenge.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: /LEFT .* RIGHT/ }),
  ).toBeVisible();
});
