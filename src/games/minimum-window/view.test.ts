import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GameMountContext } from "../../app/registry";
import { mount } from "./view";

const context: GameMountContext = {
  gameNumber: 2,
  metadata: {
    slug: "minimum-window",
    title: "Window Rescue",
    technique: "Sliding Window",
    description: "Find the shortest qualifying contiguous window.",
    difficulty: "Beginner",
    objective: "Find the shortest contiguous window whose sum reaches target.",
    complexity: {
      time: "O(n)",
      space: "O(1)",
      label: "Linear time and constant extra space",
    },
  },
};

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

function submitExample(value: string): void {
  const input = element<HTMLInputElement>("#example-input");
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  element<HTMLFormElement>('form[data-form="example"]').dispatchEvent(
    new SubmitEvent("submit", { bubbles: true, cancelable: true }),
  );
}

function tapeValues(): string {
  return [...root.querySelectorAll(".tape-cell strong")]
    .map((node) => node.textContent)
    .join(",");
}

describe("minimum window game", () => {
  it("shows the classic final best rescue", () => {
    submitExample("2, 3, 1, 2, 4, 3 | 7");
    click("last");

    expect(element('[data-result="indices"]').textContent).toBe("[4, 6)");
    expect(element('[data-result="length"]').textContent).toBe("2");
  });

  it("rejects zero without replacing the accepted trace or result", () => {
    submitExample("2, 3, 1, 2, 4, 3 | 7");
    click("last");
    const acceptedTape = tapeValues();
    const acceptedResult = element(".rescue-archive").textContent;

    submitExample("2, 0, 3 | 4");

    expect(element("#input-error").textContent).toContain(
      "Use positive integers",
    );
    expect(tapeValues()).toBe(acceptedTape);
    expect(element(".rescue-archive").textContent).toBe(acceptedResult);
  });

  it("renders the qualifying snapshot selected on the timeline", () => {
    submitExample("2, 3, 1, 2, 4, 3 | 7");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "10";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(element(".stage-header > strong").textContent).toBe(
      "BEST RESCUE UPDATED",
    );
    expect(element(".window-coordinate strong").textContent).toBe("[0, 4)");
    expect(element(".sum-meter > strong").textContent).toBe("8 / 7");
  });

  it("requires a wrong Challenge action to be corrected", () => {
    click("show-challenge");

    expect(element("#decision-prompt").textContent).toContain(
      "ACTIVE [0, 0) // SUM 0 / 19",
    );
    expect(element(".stage-header > strong").textContent).toBe(
      "NEXT ACTION ???",
    );

    element<HTMLButtonElement>('[data-answer="shrink"]').click();
    expect(element(".challenge-feedback").textContent).toContain("Try again");
    expect(element(".score-box small").textContent).toContain("0 /");

    element<HTMLButtonElement>('[data-answer="expand"]').click();
    expect(element(".challenge-feedback").textContent).toContain("Correct");
    expect(element(".score-box small").textContent).toContain("1 /");
  });

  it("hides the sum comparison result during Challenge", () => {
    click("show-challenge");

    expect(element(".sum-meter small").textContent).toBe(
      "COMPARE SUM TO TARGET",
    );
  });
});
