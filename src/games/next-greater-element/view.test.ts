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
    submitExample("1, nope, 3");

    expect(root.querySelectorAll(".signal-cell")).toHaveLength(5);
  });

  it("renders the selected snapshot when the timeline moves", () => {
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "8";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(element(".stage-header > strong").textContent).toContain(
      "POP + RESOLVE",
    );
    expect(element(".answer-cell:nth-child(2) strong").textContent).toBe("2");
  });

  it("explains an incorrect challenge answer", () => {
    click("show-challenge");
    element<HTMLButtonElement>('[data-answer="pop"]').click();

    expect(element(".challenge-feedback").textContent).toContain("Try again");
  });

  it("does not advance after an incorrect challenge answer", () => {
    click("show-challenge");
    element<HTMLButtonElement>('[data-answer="pop"]').click();

    expect(element(".score-box small").textContent).toContain("0 / 6 CLEARED");
  });

  it("advances after an incorrect challenge answer is corrected", () => {
    click("show-challenge");
    element<HTMLButtonElement>('[data-answer="pop"]').click();

    element<HTMLButtonElement>('[data-answer="stop"]').click();

    expect(element(".score-box small").textContent).toContain("1 / 6 CLEARED");
  });
});
