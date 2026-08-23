import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gameRegistry, type GameMountContext } from "../../app/registry";
import { mount } from "./view";

const gameIndex = gameRegistry.findIndex(({ slug }) => slug === "prefix-sum");
const metadata = gameRegistry[gameIndex];
if (!metadata) throw new Error("Expected prefix sum registry metadata.");
const context = {
  gameNumber: gameIndex + 1,
  metadata,
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

describe("prefix sum game UI", () => {
  it("replaces the trace for valid custom input", () => {
    submitExample("1, 2, 3 | 1:3");

    expect(root.querySelectorAll(".relay-input-cell")).toHaveLength(3);
  });

  it("resets the timeline for valid custom input", () => {
    click("next");
    submitExample("1, 2, 3 | 1:3");

    expect(element(".timeline-control label").textContent).toContain(
      "STEP 1 /",
    );
  });

  it("shows feedback for invalid replacement input", () => {
    submitExample("2, nope | 0:2");

    expect(element("#input-error").textContent).toContain("not an integer");
  });

  it("preserves the accepted trace after invalid replacement input", () => {
    submitExample("1, 2, 3 | 1:3");
    click("last");
    submitExample("2, nope | 0:2");

    expect(element('[data-result="range-sum"]').textContent).toBe("5");
  });

  it("preserves the timeline position after invalid replacement input", () => {
    submitExample("2, -1, 4, 3 | 1:4");
    click("last");
    submitExample("2, nope | 0:2");

    expect(element(".timeline-control label").textContent).toContain(
      "STEP 9 / 9",
    );
  });

  it("renders the subtraction heading selected on the timeline", () => {
    submitExample("2, -1, 4, 3 | 1:4");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "7";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(element(".stage-header > strong").textContent).toBe(
      "SUBTRACT // ISOLATE RANGE",
    );
  });

  it("renders the subtraction equation selected on the timeline", () => {
    submitExample("2, -1, 4, 3 | 1:4");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "7";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(
      element(".range-equation > strong").textContent?.replaceAll(/\s/g, ""),
    ).toBe("8-2=6");
  });

  it("shows the current built prefix total in Challenge mode", () => {
    click("show-challenge");

    expect(element(".prefix-cell.is-decision > strong").textContent).toMatch(
      /^-?\d+$/,
    );
  });

  it("shows the completed accumulation arithmetic in Challenge mode", () => {
    click("show-challenge");

    expect(element(".incoming-port small").textContent).toBe("P[0] 0 + 0 = 0");
  });

  it("frames the hidden decision as a range role", () => {
    click("show-challenge");

    expect(element(".stage-header > strong").textContent).toBe(
      "RANGE ROLE // CHOOSE ACTION",
    );
  });

  it("explains the hidden decision with the built prefix value", () => {
    click("show-challenge");
    const builtValue = element(".prefix-cell.is-decision > strong").textContent;

    expect(element(".operation-readout p").textContent).toBe(
      `P[1] = ${builtValue} is built. For query [4, 7), decide whether to add, subtract, or ignore this prefix cell.`,
    );
  });

  it("shows complete range-role context in the prompt", () => {
    click("show-challenge");
    const builtValue = element(".prefix-cell.is-decision > strong").textContent;

    expect(element("#decision-prompt").textContent).toBe(
      `P[1] = ${builtValue} // QUERY [4, 7)`,
    );
  });

  it("asks for the prefix cell's range action", () => {
    click("show-challenge");

    expect(element("#decision-prompt + p").textContent).toBe(
      "Should this built prefix value be added, subtracted, or ignored?",
    );
  });

  it("renders the three static range actions", () => {
    click("show-challenge");

    expect(
      [...root.querySelectorAll<HTMLButtonElement>("[data-answer]")].map(
        (button) => button.dataset.answer,
      ),
    ).toEqual(["add", "subtract", "ignore"]);
  });

  it("explains an incorrect range action with the query equation", () => {
    click("show-challenge");
    const builtValue = element(".prefix-cell.is-decision > strong").textContent;
    element<HTMLButtonElement>('[data-answer="add"]').click();

    expect(element(".challenge-feedback span").textContent).toBe(
      `Try again: prefix[7] - prefix[4] = P[7] - P[4]. P[1] is neither boundary, so ignore its built value ${builtValue}. Do not add it.`,
    );
  });

  it("accepts the correct range action after a wrong answer", () => {
    click("show-challenge");
    const builtValue = element(".prefix-cell.is-decision > strong").textContent;
    element<HTMLButtonElement>('[data-answer="add"]').click();
    element<HTMLButtonElement>('[data-answer="ignore"]').click();

    expect(element(".challenge-feedback span").textContent).toBe(
      `Correct: prefix[7] - prefix[4] = P[7] - P[4]. P[1] is neither boundary, so ignore its built value ${builtValue}.`,
    );
  });
});
