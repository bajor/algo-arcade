import { expect, test, type Page } from "@playwright/test";

type ChallengeAnswer = "pop" | "stop";

const APP_ROUTES = [
  { path: "./", heading: "SEE EVERY ALGORITHM MOVE" },
  { path: "./#/games/next-greater-element", heading: "Stack Reactor" },
  { path: "./#/games/pair-sum", heading: "Target Lock" },
  { path: "./#/games/palindrome", heading: "Mirror Scan" },
  { path: "./#/games/minimum-window", heading: "Window Rescue" },
  { path: "./#/games/unique-substring", heading: "Repeat Breaker" },
  { path: "./#/games/prefix-sum", heading: "Range Relay" },
  { path: "./#/games/anagram-grouping", heading: "Anagram Assembly" },
  { path: "./#/games/frequency-map", heading: "Token Tally" },
  { path: "./#/games/histogram-counting", heading: "Histogram Forge" },
] as const;

const ALLOWED_FONT_SIZES: readonly string[] = ["12px", "16px", "32px"];

async function expectedChallengeAnswer(page: Page): Promise<ChallengeAnswer> {
  const prompt = (await page.locator("#decision-prompt").textContent()) ?? "";
  const values = /CURRENT (-?\d+) VS STACK TOP (-?\d+)/.exec(prompt);
  if (!values)
    throw new Error("Challenge prompt is missing comparison values.");
  return Number(values[1]) > Number(values[2]) ? "pop" : "stop";
}

function answerName(answer: ChallengeAnswer): RegExp {
  return answer === "pop" ? /POP TOP/ : /STOP & PUSH/;
}

test("sorts games by technique and title", async ({ page }) => {
  await page.goto("./");

  await expect(page.locator(".game-card h2")).toHaveText([
    "Histogram Forge",
    "Token Tally",
    "Anagram Assembly",
    "Stack Reactor",
    "Range Relay",
    "Repeat Breaker",
    "Window Rescue",
    "Mirror Scan",
    "Target Lock",
  ]);
});

test("uses only the three shared text sizes", async ({ page }) => {
  for (const route of APP_ROUTES) {
    await page.goto(route.path);
    await page
      .getByRole("heading", { level: 1, name: route.heading })
      .waitFor();

    const unexpectedSizes = await unexpectedFontSizes(page);
    expect(unexpectedSizes, `${route.path} Explore`).toEqual([]);

    if (route.path !== "./") {
      await page.getByRole("button", { name: /CHALLENGE/ }).click();
      await page.locator(".challenge-brief, .challenge-complete").waitFor();
      expect(
        await unexpectedFontSizes(page),
        `${route.path} Challenge`,
      ).toEqual([]);
    }
  }
});

async function unexpectedFontSizes(page: Page): Promise<string[]> {
  return page
    .locator("body *")
    .evaluateAll(
      (elements, allowedSizes) =>
        [
          ...new Set(
            elements.flatMap((element) => [
              getComputedStyle(element).fontSize,
              getComputedStyle(element, "::before").fontSize,
              getComputedStyle(element, "::after").fontSize,
            ]),
          ),
        ].filter((fontSize) => fontSize && !allowedSizes.includes(fontSize)),
      ALLOWED_FONT_SIZES,
    );
}

test("renders code listings smaller than body text", async ({ page }) => {
  await page.goto("./#/games/pair-sum");
  await page.locator(".game-screen").waitFor();
  await page.getByRole("tab", { name: "PYTHON CODE" }).click();

  const codeSize = await page
    .locator(".code-panel code")
    .first()
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
  const bodySize = await page
    .locator(".operation-readout p")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );

  expect(codeSize).toBeLessThan(bodySize);
});

test("uses shared text sizes in Challenge completion", async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto("./#/games/next-greater-element");
  await page.getByRole("button", { name: /CHALLENGE/ }).click();

  for (let answerCount = 0; answerCount < 50; answerCount += 1) {
    if (await page.locator(".challenge-complete").isVisible()) break;
    const answer = await expectedChallengeAnswer(page);
    await page.getByRole("button", { name: answerName(answer) }).click();
  }

  await expect(page.locator(".challenge-complete")).toBeVisible();
  expect(await unexpectedFontSizes(page)).toEqual([]);
});

test("discovers the game and completes a custom Explore trace", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "SEE EVERY ALGORITHM MOVE" }),
  ).toBeVisible();
  await expect(page.getByText("9 LOADED")).toBeVisible();
  for (const game of [
    "Target Lock",
    "Mirror Scan",
    "Window Rescue",
    "Repeat Breaker",
    "Range Relay",
    "Anagram Assembly",
    "Token Tally",
    "Histogram Forge",
  ]) {
    await expect(
      page.getByRole("link", { name: new RegExp(game) }),
    ).toBeVisible();
  }

  await page.getByRole("link", { name: /Stack Reactor/ }).click();
  await expect(page).toHaveURL(/#\/games\/next-greater-element$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Stack Reactor" }),
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

test("shows an error for a malformed game route", async ({ page }) => {
  await page.goto("./#/games/palindrome/");

  await expect(
    page.getByRole("heading", { name: "CARTRIDGE NOT FOUND" }),
  ).toBeVisible();
});
