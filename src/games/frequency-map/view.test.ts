import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gameRegistry, type GameMountContext } from "../../app/registry";
import { mount } from "./view";

const gameIndex = gameRegistry.findIndex(
  ({ slug }) => slug === "frequency-map",
);
const metadata = gameRegistry[gameIndex];
if (!metadata) throw new Error("Expected frequency map registry metadata.");
const context = {
  gameNumber: gameIndex + 1,
  metadata,
} satisfies GameMountContext;

let root: HTMLElement;
let cleanup: () => void;

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0);
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

describe("frequency map game UI", () => {
  it("resets a valid custom example to the first snapshot", () => {
    click("last");
    submitExample("red, blue, red");

    expect(element<HTMLInputElement>('[name="timeline"]').value).toBe("0");
  });

  it("shows actionable feedback for invalid input", () => {
    submitExample("red, Blue");

    expect(element("#input-error").textContent).toContain('Character "B"');
  });

  it("preserves the accepted result when new input is invalid", () => {
    submitExample("red, blue, red");
    click("last");
    const acceptedResult = element(".tally-result").textContent;

    submitExample("red, Blue");

    expect(element(".tally-result").textContent).toBe(acceptedResult);
  });

  it("renders the lookup heading selected on the timeline", () => {
    submitExample("red, blue, red");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "8";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(element(".stage-header > strong").textContent).toBe(
      "LOOKUP // FOUND",
    );
  });

  it("renders the lookup token selected on the timeline", () => {
    submitExample("red, blue, red");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "8";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(element(".current-token strong").textContent).toBe("red");
  });

  it("renders the lookup result selected on the timeline", () => {
    submitExample("red, blue, red");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "8";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(element(".lookup-result strong").textContent).toBe(
      "FOUND // COUNT 1",
    );
  });

  it("explains a wrong Challenge answer", () => {
    click("show-challenge");
    answer("increment");

    expect(element(".challenge-feedback").textContent).toContain(
      "There is no count to increment",
    );
  });

  it("keeps the current Challenge decision after a wrong answer", () => {
    click("show-challenge");
    answer("increment");

    expect(element(".score-box small").textContent).toContain("0 /");
  });

  it("confirms a correct Challenge answer", () => {
    click("show-challenge");
    answer("insert");

    expect(element(".challenge-feedback").textContent).toContain("Correct:");
  });

  it("advances after a correct Challenge answer", () => {
    click("show-challenge");
    answer("insert");

    expect(element(".score-box small").textContent).toContain("1 /");
  });
});
