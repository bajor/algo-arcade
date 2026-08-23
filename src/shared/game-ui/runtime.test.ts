import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GameMountContext } from "../../app/registry";
import { mountGameUi } from "./runtime";
import type { GameUiConfig } from "./types";

type TestAction = "advance" | "wait";

interface TestSnapshot {
  readonly label: string;
}

interface TestDecision {
  readonly snapshotIndex: number;
  readonly expectedAction: TestAction;
}

const context: GameMountContext = {
  gameNumber: 7,
  metadata: {
    slug: "test-game",
    title: "Test Game",
    technique: "Testing",
    description: "Exercises the shared runtime.",
    difficulty: "Beginner",
    objective: "Verify shared behavior.",
    complexity: {
      time: "O(1)",
      space: "O(1)",
      label: "Constant time and space",
    },
  },
};

let root: HTMLElement;
let cleanup: () => void;

beforeEach(() => {
  root = document.createElement("div");
  document.body.append(root);
  cleanup = mountGameUi(root, context, createConfig());
});

afterEach(() => {
  cleanup();
  root.remove();
  vi.useRealTimers();
});

function createConfig(): GameUiConfig<
  number,
  TestSnapshot,
  TestDecision,
  TestAction
> {
  let generatedExample = 0;
  return {
    input: {
      formatLabel: "One integer",
      presets: [{ label: "One", value: "1" }],
      parse: (rawInput) => {
        const value = Number(rawInput);
        return Number.isInteger(value)
          ? { ok: true, value }
          : { ok: false, error: "Enter one integer." };
      },
      format: String,
      generate: () => {
        generatedExample += 1;
        return generatedExample;
      },
    },
    trace: {
      generate: () => [{ label: "READY" }, { label: "COMPLETE" }],
    },
    stage: {
      className: "test-stage",
      title: "TEST STAGE",
      operationLabel: (snapshot) => snapshot.label,
      renderBody: () => '<div class="test-stage-body"></div>',
      explanation: (snapshot) => snapshot.label,
      legend: [],
    },
    pseudocode: {
      entries: [{ id: "test", code: "test" }],
      activeEntryId: () => "test",
    },
    diagnostics: {
      entries: () => [],
      ruleLabel: "RULE",
      rule: "Test the runtime.",
    },
    challenge: {
      briefTitle: "MAKE A CHOICE",
      brief: "Choose the expected action.",
      pointsPerCorrect: 100,
      decisions: () => [
        { snapshotIndex: 0, expectedAction: "advance" },
        { snapshotIndex: 1, expectedAction: "wait" },
      ],
      snapshot: (trace, decision) => {
        const snapshot = trace[decision.snapshotIndex];
        if (!snapshot) throw new Error("Missing test snapshot.");
        return snapshot;
      },
      expectedAction: (decision) => decision.expectedAction,
      prompt: (_snapshot, _decision, decisionNumber) => ({
        label: `DECISION ${String(decisionNumber)}`,
        heading: "CHOOSE",
        question: "Advance?",
      }),
      actions: [
        { action: "advance", cue: "YES", label: "ADVANCE" },
        { action: "wait", cue: "NO", label: "WAIT" },
      ],
      explainAnswer: (_snapshot, _decision, _answer, isCorrect) =>
        isCorrect ? "Correct answer." : "Try again.",
      isComplete: (progress) => progress.cursor >= progress.decisions.length,
      completionTitle: "COMPLETE",
      completionRule: "choose correctly.",
    },
  };
}

function element<TElement extends Element>(selector: string): TElement {
  const match = root.querySelector<TElement>(selector);
  if (!match) throw new Error(`Expected element matching ${selector}.`);
  return match;
}

describe("shared game UI runtime", () => {
  it("pauses before rendering the final autoplay snapshot", () => {
    vi.useFakeTimers();
    element<HTMLButtonElement>('[data-action="toggle-play"]').click();

    vi.advanceTimersByTime(700);

    expect(element(".timeline-control label").textContent).toContain(
      "STEP 2 / 2",
    );
    expect(element('[data-action="toggle-play"]').textContent).toContain(
      "PLAY",
    );
  });

  it("restores timeline focus after moving to a snapshot", () => {
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.focus();
    timeline.value = "1";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(document.activeElement).toBe(
      element<HTMLInputElement>('[name="timeline"]'),
    );
  });

  it("describes the current timeline snapshot", () => {
    const timeline = element<HTMLInputElement>('[name="timeline"]');
    timeline.value = "1";
    timeline.dispatchEvent(new Event("input", { bubbles: true }));

    expect(
      element<HTMLInputElement>('[name="timeline"]').getAttribute(
        "aria-valuetext",
      ),
    ).toBe("Step 2 of 2: COMPLETE");
  });

  it("restores speed focus after changing playback speed", () => {
    const speed = element<HTMLSelectElement>('[name="speed"]');
    speed.focus();
    speed.value = "350";
    speed.dispatchEvent(new Event("change", { bubbles: true }));

    expect(document.activeElement).toBe(
      element<HTMLSelectElement>('[name="speed"]'),
    );
  });

  it("preserves the focused control during autoplay", () => {
    vi.useFakeTimers();
    element<HTMLButtonElement>('[data-action="toggle-play"]').click();
    element<HTMLSelectElement>('[name="speed"]').focus();

    vi.advanceTimersByTime(700);

    expect(document.activeElement).toBe(
      element<HTMLSelectElement>('[name="speed"]'),
    );
  });

  it("moves focus to Play when endpoint navigation becomes disabled", () => {
    element<HTMLButtonElement>('[data-action="last"]').click();

    expect(document.activeElement).toBe(
      element<HTMLButtonElement>('[data-action="toggle-play"]'),
    );
  });

  it("labels correct feedback as the previous decision after advancing", () => {
    element<HTMLButtonElement>('[data-action="show-challenge"]').click();
    element<HTMLButtonElement>('[data-answer="advance"]').click();

    expect(element(".challenge-feedback strong").textContent).toBe(
      "PREVIOUS DECISION 01 // CORRECT",
    );
  });

  it("focuses restart after the final Challenge decision", () => {
    element<HTMLButtonElement>('[data-action="show-challenge"]').click();
    element<HTMLButtonElement>('[data-answer="advance"]').click();
    element<HTMLButtonElement>('[data-answer="wait"]').click();

    expect(document.activeElement).toBe(
      element<HTMLButtonElement>('[data-action="restart-challenge"]'),
    );
  });

  it("keeps one live region while announcing Challenge feedback", () => {
    vi.useFakeTimers();
    const announcer = element<HTMLElement>(".game-announcer");
    element<HTMLButtonElement>('[data-action="show-challenge"]').click();
    element<HTMLButtonElement>('[data-answer="advance"]').click();
    vi.runOnlyPendingTimers();

    expect(element(".game-announcer")).toBe(announcer);
    expect(announcer.textContent).toBe("Correct answer.");
  });
});
