import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { mount } from "./view";

let root: HTMLElement;
let cleanup: () => void;

beforeEach(() => {
  root = document.createElement("div");
  document.body.append(root);
  cleanup = mount(root);
});

afterEach(() => {
  cleanup();
  root.remove();
});

function element<TElement extends Element>(selector: string): TElement {
  const match = root.querySelector<TElement>(selector);
  if (!match) throw new Error(`Expected element matching ${selector}.`);
  return match;
}

function click(action: string): void {
  element<HTMLButtonElement>(`[data-action="${action}"]`).click();
}

function submitExample(value: string): void {
  const input = element<HTMLInputElement>("#example-input");
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  element<HTMLFormElement>('form[data-form="example"]').dispatchEvent(
    new SubmitEvent("submit", { bubbles: true, cancelable: true }),
  );
}

function displayedExample(): string {
  return [...root.querySelectorAll(".signal-cell strong")]
    .map((cell) => cell.textContent)
    .join(",");
}

function expectedChallengeAnswer(): "pop" | "stop" {
  const values = [...root.querySelectorAll("#decision-prompt b")].map((node) =>
    Number(node.textContent),
  );
  const currentValue = values[0];
  const topValue = values[1];
  if (currentValue === undefined || topValue === undefined) {
    throw new Error("Challenge prompt is missing comparison values.");
  }
  return currentValue > topValue ? "pop" : "stop";
}

function answerChallenge(correctly: boolean): void {
  const expected = expectedChallengeAnswer();
  const answer = correctly ? expected : expected === "pop" ? "stop" : "pop";
  element<HTMLButtonElement>(`[data-answer="${answer}"]`).click();
}

function completeChallenge(): void {
  while (root.querySelector('[data-action="challenge-answer"]')) {
    answerChallenge(true);
  }
}

describe("next greater element game", () => {
  it("regenerates the trace at its first snapshot for valid custom input", () => {
    click("next");
    submitExample("1, 2, 3");

    expect(element(".timeline-control label").textContent).toContain(
      "STEP 1 /",
    );
    expect(root.querySelectorAll(".signal-cell")).toHaveLength(3);
  });

  it("shows a useful error for invalid custom input", () => {
    submitExample("1, nope, 3");

    expect(element("#input-error").textContent).toContain("not an integer");
  });

  it("keeps the playback position when custom input is invalid", () => {
    click("next");
    submitExample("1, nope, 3");

    expect(element(".timeline-control label").textContent).toContain(
      "STEP 2 /",
    );
  });

  it("keeps the accepted trace when custom input is invalid", () => {
    const acceptedCellCount = root.querySelectorAll(".signal-cell").length;
    submitExample("1, nope, 3");

    expect(root.querySelectorAll(".signal-cell")).toHaveLength(
      acceptedCellCount,
    );
  });

  it("renders the selected snapshot when the timeline moves", () => {
    submitExample("2, 1, 2, 4, 3");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "8";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(element(".stage-header > strong").textContent).toContain(
      "POP + RESOLVE",
    );
    expect(element(".answer-cell:nth-child(2) strong").textContent).toBe("2");
  });

  it("loads a different example from the random generator control", () => {
    const initialInput = element<HTMLInputElement>("#example-input").value;

    click("randomize");

    expect(element<HTMLInputElement>("#example-input").value).not.toBe(
      initialInput,
    );
  });

  it("loads a fresh generated example when Challenge mode starts", () => {
    const exploredInput = displayedExample();

    click("show-challenge");

    expect(displayedExample()).not.toBe(exploredInput);
  });

  it("does not reset progress when the active Challenge tab is clicked", () => {
    click("show-challenge");
    answerChallenge(true);
    const challengeProgress = element(".score-box small").textContent;

    click("show-challenge");

    expect(element(".score-box small").textContent).toBe(challengeProgress);
  });

  it("explains an incorrect challenge answer", () => {
    click("show-challenge");
    answerChallenge(false);

    expect(element(".challenge-feedback").textContent).toContain("Try again");
  });

  it("does not advance after an incorrect challenge answer", () => {
    click("show-challenge");
    answerChallenge(false);

    expect(element(".score-box small").textContent).toContain("0 /");
  });

  it("advances after an incorrect challenge answer is corrected", () => {
    click("show-challenge");
    answerChallenge(false);

    answerChallenge(true);

    expect(element(".score-box small").textContent).toContain("1 /");
  });

  it("restarts a completed Challenge with a fresh generated example", () => {
    click("show-challenge");
    const completedInput = displayedExample();

    completeChallenge();
    click("restart-challenge");

    expect(displayedExample()).not.toBe(completedInput);
  });

  it("resets progress when a completed Challenge restarts", () => {
    click("show-challenge");
    completeChallenge();

    click("restart-challenge");

    expect(element(".score-box small").textContent).toContain("0 /");
  });
});
