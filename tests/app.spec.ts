import { expect, test } from "@playwright/test";

test("discovers the game and completes a custom Explore trace", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "SEE EVERY ALGORITHM MOVE" }),
  ).toBeVisible();

  await page.getByRole("link", { name: /Stack Reactor/ }).click();
  await expect(
    page.getByRole("heading", { name: "Stack Reactor" }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await page.getByLabel("1-12 integers").fill("1, 2, 3");
  await page.getByRole("button", { name: "RUN TRACE" }).click();
  await page.getByRole("button", { name: "Last step" }).click();

  await expect(page.locator(".answer-cell strong")).toHaveText([
    "2",
    "3",
    "-1",
  ]);
  await expect(page.locator(".stage-header > strong")).toHaveText("COMPLETE");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("explains a wrong Challenge decision and accepts the correction", async ({
  page,
}) => {
  await page.goto("./#/games/next-greater-element");
  await page.getByRole("button", { name: /CHALLENGE/ }).click();

  await page.getByRole("button", { name: /POP TOP/ }).click();
  await expect(page.getByRole("status")).toContainText("Try again");
  await expect(page.locator(".score-box small")).toContainText("0 / 6 CLEARED");

  await page.getByRole("button", { name: /STOP & PUSH/ }).click();
  await expect(page.getByRole("status")).toContainText("Correct");
  await expect(page.locator(".score-box small")).toContainText("1 / 6 CLEARED");
});
