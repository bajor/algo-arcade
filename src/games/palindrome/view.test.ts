import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GameMetadata } from "../../app/registry";
import { mount } from "./view";

const metadata = {
  slug: "palindrome",
  title: "Mirror Scan",
  technique: "Two Pointers",
  description: "Scan a lowercase string inward from both ends.",
  difficulty: "Beginner",
  objective: "Decide whether a lowercase string is a palindrome.",
  complexity: {
    time: "O(n)",
    space: "O(1)",
    label: "Linear time and constant auxiliary space",
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

describe("palindrome game UI", () => {
  it("shows the final verdict for a valid lowercase string", () => {
    submitExample("racecar");
    click("last");

    expect(element(".verdict-panel strong").textContent).toBe("PALINDROME");
  });

  it("rejects a digit without replacing the accepted trace", () => {
    submitExample("algorithm");
    click("last");
    submitExample("abc1");

    expect(element("#input-error").textContent).toContain(
      'Character "1" at position 4',
    );
    expect(element(".verdict-panel strong").textContent).toBe("NOT PALINDROME");
  });

  it("renders the snapshot selected on the timeline", () => {
    submitExample("aa");
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

  it("explains a wrong Challenge answer without advancing", () => {
    click("show-challenge");
    answer("mismatch");

    expect(element(".challenge-feedback").textContent).toContain(
      "are exactly equal, so MATCH",
    );
    expect(element(".score-box small").textContent).toContain("0 /");
  });

  it("accepts a correction after a wrong Challenge answer", () => {
    click("show-challenge");
    answer("mismatch");

    answer("match");
    expect(element(".challenge-feedback").textContent).toContain("Correct:");
    expect(element(".score-box small").textContent).toContain("1 /");
  });
});
