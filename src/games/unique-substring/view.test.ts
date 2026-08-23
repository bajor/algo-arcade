import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { GameMetadata } from "../../app/registry";
import { mount } from "./view";

const metadata: GameMetadata = {
  slug: "unique-substring",
  title: "Repeat Breaker",
  technique: "Sliding Window",
  description: "Maintain a unique-character window.",
  difficulty: "Beginner",
  objective: "Find the earliest longest substring without repeated characters.",
  complexity: {
    time: "O(n)",
    space: "O(k)",
    label: "Linear time and alphabet-sized space",
  },
};

let root: HTMLElement;
let cleanup: () => void;

beforeEach(() => {
  root = document.createElement("div");
  document.body.append(root);
  cleanup = mount(root, { gameNumber: 2, metadata });
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

describe("unique substring game", () => {
  it("shows the final best run for custom abcabcbb input", () => {
    submitExample("abcabcbb");
    click("last");

    expect(element(".best-run-value").textContent).toBe("abc");
    expect(element(".best-run").textContent).toContain("[0, 3)");
    expect(element(".best-run").textContent).toContain("LENGTH3");
  });

  it("rejects a digit without replacing the accepted result", () => {
    submitExample("abcdef");
    click("last");
    submitExample("abc1");

    expect(element("#input-error").textContent).toContain(
      'Character "1" at position 4',
    );
    expect(element(".best-run-value").textContent).toBe("abcdef");
  });

  it("renders the selected shrink snapshot from the timeline", () => {
    submitExample("abcabcbb");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "11";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(element(".stage-header > strong").textContent).toContain(
      "SHRINK: REMOVE",
    );
    expect(
      element('.tape-cell[data-index="0"]').classList.contains(
        "is-just-removed",
      ),
    ).toBe(true);
    expect(element(".window-bracket > span").textContent).toBe(
      "ACTIVE HALF-OPEN WINDOW [1, 3)",
    );
  });

  it("renders the initial Challenge prompt", () => {
    click("show-challenge");

    expect(element("#decision-prompt").textContent).toContain(
      "ACTIVE CACHE {}",
    );
  });

  it("explains a wrong Challenge shrink without advancing", () => {
    click("show-challenge");
    element<HTMLButtonElement>('[data-answer="shrink"]').click();

    expect(element(".challenge-feedback").textContent).toContain(
      "is not in the active cache {}",
    );
    expect(element(".score-box small").textContent).toContain("0 /");
  });

  it("accepts expand after a wrong Challenge answer", () => {
    click("show-challenge");
    element<HTMLButtonElement>('[data-answer="shrink"]').click();

    element<HTMLButtonElement>('[data-answer="expand"]').click();
    expect(element(".challenge-feedback").textContent).toContain("Correct:");
    expect(element(".score-box small").textContent).toContain("1 /");
  });
});
