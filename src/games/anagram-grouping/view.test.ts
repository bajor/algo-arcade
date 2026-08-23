import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gameRegistry, type GameMountContext } from "../../app/registry";
import { mount } from "./view";

const gameIndex = gameRegistry.findIndex(
  ({ slug }) => slug === "anagram-grouping",
);
const metadata = gameRegistry[gameIndex];
if (!metadata) throw new Error("Expected anagram grouping registry metadata.");
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

function submitExample(value: string): void {
  const input = element<HTMLInputElement>("#example-input");
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  element<HTMLFormElement>('form[data-form="example"]').dispatchEvent(
    new SubmitEvent("submit", { bubbles: true, cancelable: true }),
  );
}

describe("anagram grouping game UI", () => {
  it("resets a valid custom example to the first snapshot", () => {
    click("last");
    submitExample("ab, ba");

    expect(element<HTMLInputElement>('[name="timeline"]').value).toBe("0");
  });

  it("shows feedback when new input is invalid", () => {
    submitExample("eat, Tea");

    expect(element("#input-error").textContent).toContain('Character "T"');
  });

  it("preserves the accepted result when new input is invalid", () => {
    submitExample("eat, tea, tan, ate, nat, bat");
    click("last");
    const acceptedResult = element(".assembly-result").textContent;

    submitExample("eat, Tea");

    expect(element(".assembly-result").textContent).toBe(acceptedResult);
  });

  it("renders the lookup heading selected on the timeline", () => {
    submitExample("ab, ba");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "7";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(element(".stage-header > strong").textContent).toBe(
      "LOOKUP // FOUND",
    );
  });

  it("renders the lookup signature selected on the timeline", () => {
    submitExample("ab, ba");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "7";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(element(".scanner-signature strong").textContent).toBe("ab");
  });

  it("renders the lookup group selected on the timeline", () => {
    submitExample("ab, ba");
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "7";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(
      element('.group-bay[data-group-index="0"] .group-words').textContent,
    ).toBe("ab");
  });

  it("does not advance after a wrong Challenge lookup decision", () => {
    click("show-challenge");
    element<HTMLButtonElement>('[data-answer="append"]').click();

    expect(element(".score-box small").textContent).toContain("0 /");
  });

  it("shows feedback after a wrong Challenge decision is corrected", () => {
    click("show-challenge");
    element<HTMLButtonElement>('[data-answer="append"]').click();
    element<HTMLButtonElement>('[data-answer="create"]').click();

    expect(element(".challenge-feedback").textContent).toContain("Correct:");
  });

  it("advances after a wrong Challenge decision is corrected", () => {
    click("show-challenge");
    element<HTMLButtonElement>('[data-answer="append"]').click();
    element<HTMLButtonElement>('[data-answer="create"]').click();

    expect(element(".score-box small").textContent).toContain("1 /");
  });
});
