import { expect, test, type Page } from "@playwright/test";

type ChallengeAnswer = "pop" | "stop";

async function expectedChallengeAnswer(page: Page): Promise<ChallengeAnswer> {
  const values = await page.locator("#decision-prompt b").allTextContents();
  return Number(values[0]) > Number(values[1]) ? "pop" : "stop";
}

function answerName(answer: ChallengeAnswer): RegExp {
  return answer === "pop" ? /POP TOP/ : /STOP & PUSH/;
}

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

test("generates a fresh example on demand", async ({ page }) => {
  await page.goto("./#/games/next-greater-element");
  const input = page.getByLabel("1-12 integers");
  const firstExample = await input.inputValue();

  await page.getByRole("button", { name: "NEW RANDOM" }).click();

  await expect(input).not.toHaveValue(firstExample);
});

test("generated Challenge explains errors and exercises both branches", async ({
  page,
}) => {
  await page.goto("./#/games/next-greater-element");
  await page.getByRole("button", { name: /CHALLENGE/ }).click();

  const firstAnswer = await expectedChallengeAnswer(page);
  const wrongAnswer = firstAnswer === "pop" ? "stop" : "pop";
  await page.getByRole("button", { name: answerName(wrongAnswer) }).click();
  await expect(page.getByRole("status")).toContainText("Try again");
  await expect(page.locator(".score-box small")).toContainText("0 /");

  await page.getByRole("button", { name: answerName(firstAnswer) }).click();
  await expect(page.getByRole("status")).toContainText("Correct");
  await expect(page.locator(".score-box small")).toContainText("1 /");

  const secondAnswer = await expectedChallengeAnswer(page);
  expect(new Set([firstAnswer, secondAnswer])).toEqual(
    new Set<ChallengeAnswer>(["pop", "stop"]),
  );
  await page.getByRole("button", { name: answerName(secondAnswer) }).click();
  await expect(page.locator(".score-box small")).toContainText("2 /");
});
