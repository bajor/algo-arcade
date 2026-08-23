import { describe, expect, it } from "vitest";

import { generateTrace, parseExample } from "./algorithm";
import {
  EXAMPLE_PRESETS,
  generateProceduralExample,
  getChallengeDecisions,
} from "./game";

const fixedRandom = (): number => 0.5;

describe("minimum window cross-module contracts", () => {
  it("keeps every preset valid", () => {
    expect(
      EXAMPLE_PRESETS.every((preset) => parseExample(preset.value).ok),
    ).toBe(true);
  });

  it("generates both challenge branches", () => {
    const decisions = getChallengeDecisions(
      generateTrace(generateProceduralExample(fixedRandom)),
    );

    expect(
      new Set(decisions.map((decision) => decision.expectedAction)),
    ).toEqual(new Set(["expand", "shrink"]));
  });

  it("generates consecutive shrink decisions", () => {
    const decisions = getChallengeDecisions(
      generateTrace(generateProceduralExample(fixedRandom)),
    );
    const actions = decisions.map((decision) => decision.expectedAction);

    expect(
      actions.some(
        (action, index) =>
          action === "shrink" && actions[index + 1] === "shrink",
      ),
    ).toBe(true);
  });
});
