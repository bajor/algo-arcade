import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GameMetadata } from "../../app/registry";
import { mount } from "./view";

const metadata = {
  slug: "palindrome",
  title: "Mirror Scan",
  technique: "Two Pointers",
  description: "Scan a phrase inward from both ends.",
  difficulty: "Beginner",
  objective: "Decide whether a phrase is a palindrome.",
  complexity: {
    time: "O(n)",
    space: "O(n)",
    label: "Linear time and linear trace space",
  },
} satisfies GameMetadata;

let root: HTMLElement;
let cleanup: () => void;

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  root = document.createElement("div");
  document.body.append(root);
  cleanup = mount(root, { gameNumber: 2, metadata });
});

afterEach(() => {
  cleanup();
  root.remove();
  vi.restoreAllMocks();
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

function answerChallengeIncorrectly(): void {
  click("show-challenge");
  answer("match");
}

function correctChallengeAnswer(): void {
  answerChallengeIncorrectly();
  answer("skip-left");
}

describe("palindrome game UI", () => {
  it("shows the final verdict for a valid phrase", () => {
    submitExample("A man, a plan, a canal: Panama!");
    click("last");

    expect(element(".verdict-panel strong").textContent).toBe("PALINDROME");
  });

  it("shows why input without an alphanumeric character is rejected", () => {
    submitExample("---");

    expect(element("#input-error").textContent).toBe(
      "Include at least one ASCII letter or digit (A-Z, a-z, or 0-9).",
    );
  });

  it("preserves the accepted final verdict when input has no alphanumeric character", () => {
    submitExample("Mirror scan");
    click("last");

    submitExample("---");

    expect(element(".verdict-panel strong").textContent).toBe("NOT PALINDROME");
  });

  it("renders the snapshot selected on the timeline", () => {
    submitExample("a,a");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "2";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect({
      operation: element(".stage-header > strong").textContent,
      pairMarkers: [...root.querySelectorAll(".is-matched .cell-status")].map(
        (node) => node.textContent,
      ),
    }).toEqual({
      operation: "MATCH + MOVE IN",
      pairMarkers: ["PAIR 01", "PAIR 01"],
    });
  });

  it("explains an incorrect Challenge decision", () => {
    answerChallengeIncorrectly();

    expect(element(".challenge-feedback").textContent).toContain(
      "The left pointer is checked first, so SKIP LEFT.",
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
