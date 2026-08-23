import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GameMountContext } from "../../app/registry";
import { mount } from "./view";

const context = {
  gameNumber: 2,
  metadata: {
    slug: "pair-sum",
    title: "Target Lock",
    technique: "Two Pointers",
    description: "Find unique value pairs in a sorted sequence.",
    difficulty: "Beginner",
    objective: "Record every unique value pair that reaches the target sum.",
    complexity: {
      time: "O(n)",
      space: "O(k)",
      label: "Linear time and output space",
    },
  },
} satisfies GameMountContext;

let root: HTMLElement;
let cleanup: () => void;

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  root = document.createElement("div");
  document.body.append(root);
  cleanup = mount(root, context);
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

function answer(action: string): void {
  element<HTMLButtonElement>(`[data-answer="${action}"]`).click();
}

function submitExample(value: string): void {
  const input = element<HTMLInputElement>("#example-input");
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  element<HTMLFormElement>('form[data-form="example"]').dispatchEvent(
    new SubmitEvent("submit", { bubbles: true, cancelable: true }),
  );
}

function displayedPairs(): string[] {
  return [...root.querySelectorAll(".vault-pair > strong")].map(
    (pair) => pair.textContent ?? "",
  );
}

function answerChallengeIncorrectly(): void {
  click("show-challenge");
  answer("move-left");
}

function correctChallengeAnswer(): void {
  answerChallengeIncorrectly();
  answer("move-right");
}

describe("pair sum game", () => {
  it("resets the trace for valid custom input", () => {
    click("next");
    submitExample("1, 2, 3, 4, 5 | 6");

    expect(element(".timeline-control label").textContent).toContain(
      "STEP 1 /",
    );
  });

  it("renders the expected final pairs", () => {
    submitExample("1, 2, 3, 4, 5 | 6");
    click("last");

    expect(displayedPairs()).toEqual(["(1, 5)", "(2, 4)"]);
  });

  it("shows why unsorted input is rejected", () => {
    submitExample("1, 3, 2, 4 | 5");

    expect(element("#input-error").textContent).toBe(
      "Values must be in nondecreasing order. Position 3 has 2 after 3.",
    );
  });

  it("preserves the accepted final result when unsorted input is rejected", () => {
    submitExample("1, 2, 3, 4 | 5");
    click("last");
    const acceptedPairs = displayedPairs();

    submitExample("1, 3, 2, 4 | 5");

    expect(displayedPairs()).toEqual(acceptedPairs);
  });

  it("renders the expected snapshot selected on the timeline", () => {
    submitExample("1, 2, 3, 4 | 5");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "2";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(element(".stage-header > strong").textContent).toContain(
      "PAIR RECORDED",
    );
    expect(displayedPairs()).toEqual(["(1, 4)"]);
    expect(element(".vault-pair > small").textContent).toContain(
      "DISCOVERY IDX 0 + IDX 3",
    );
  });

  it("separates the trigger sum from the post-move candidate", () => {
    submitExample("1, 2, 10 | 5");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "2";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(element(".stage-header > strong").textContent).toContain(
      "AFTER SUM HIGH",
    );
    expect(element(".sum-lock span").textContent).toBe("NEXT SUM EQUATION");
    expect(element(".sum-lock p").textContent).toContain(
      "Previous sum 11 was above target 5",
    );
  });

  it("renders the Challenge decision prompt", () => {
    click("show-challenge");

    expect(element("#decision-prompt").textContent).toContain(
      "LEFT -11 + RIGHT 17 = SUM 6",
    );
  });

  it("explains an incorrect Challenge decision", () => {
    answerChallengeIncorrectly();

    expect(element(".challenge-feedback").textContent).toContain(
      "Only moving RIGHT toward smaller values can decrease the sum.",
    );
  });

  it("does not advance after an incorrect Challenge decision", () => {
    answerChallengeIncorrectly();

    expect(element(".score-box small").textContent).toContain("0 /");
  });

  it("shows corrected Challenge feedback", () => {
    correctChallengeAnswer();

    expect(element(".challenge-feedback").textContent).toContain("Correct");
  });

  it("advances after a corrected Challenge decision", () => {
    correctChallengeAnswer();

    expect(element(".score-box small").textContent).toContain("1 /");
  });
});
