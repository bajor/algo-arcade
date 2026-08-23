import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gameRegistry, type GameMountContext } from "../../app/registry";
import { mount } from "./view";

const gameIndex = gameRegistry.findIndex(
  ({ slug }) => slug === "histogram-counting",
);
const metadata = gameRegistry[gameIndex];
if (!metadata)
  throw new Error("Expected histogram counting registry metadata.");
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

function resultCounts(): string[] {
  return [...root.querySelectorAll(".histogram-result dd")].map(
    (node) => node.textContent ?? "",
  );
}

describe("histogram counting game", () => {
  it("accepts valid custom input", () => {
    submitExample("24, 25");

    expect(root.querySelectorAll(".feed-cell")).toHaveLength(2);
  });

  it("resets accepted custom input to the first timeline snapshot", () => {
    click("next");
    submitExample("24, 25");

    expect(element(".timeline-control label").textContent).toContain(
      "STEP 1 / 8",
    );
  });

  it("shows feedback for invalid input", () => {
    submitExample("0, 100");

    expect(element("#input-error").textContent).toContain("0 to 99");
  });

  it("preserves the accepted result after invalid input", () => {
    submitExample("0, 25, 50, 75");
    click("last");
    const acceptedCounts = resultCounts();

    submitExample("0, 100");

    expect(resultCounts()).toEqual(acceptedCounts);
  });

  it("renders the increment heading selected on the timeline", () => {
    submitExample("24, 25");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "6";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(element(".stage-header > strong").textContent).toBe(
      "INCREMENT // 25-49",
    );
  });

  it("renders the incremented bin count selected on the timeline", () => {
    submitExample("24, 25");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "6";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(element('[data-bin="25-49"] .tower-count strong').textContent).toBe(
      "01",
    );
  });

  it("renders the filed progress selected on the timeline", () => {
    submitExample("24, 25");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "6";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(element(".feed-heading strong").textContent).toBe("2 / 2 FILED");
  });

  it("masks the current bin during Challenge classification", () => {
    click("show-challenge");

    expect(element(".stage-header > strong").textContent).toBe(
      "CLASSIFY // BIN ???",
    );
  });

  it("keeps the current Challenge decision after a wrong answer", () => {
    click("show-challenge");
    const currentPrompt = element("#decision-prompt").textContent;

    element<HTMLButtonElement>('[data-answer="25-49"]').click();

    expect(element("#decision-prompt").textContent).toBe(currentPrompt);
  });

  it("advances after a wrong Challenge answer is corrected", () => {
    click("show-challenge");
    element<HTMLButtonElement>('[data-answer="25-49"]').click();

    element<HTMLButtonElement>('[data-answer="50-74"]').click();

    expect(element("#decision-prompt").textContent).toContain(
      "VALUE 37 // ITEM 2 OF 6",
    );
  });
});
