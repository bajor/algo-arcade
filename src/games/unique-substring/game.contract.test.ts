import { describe, expect, it } from "vitest";

import { generateTrace } from "./algorithm";
import { generateProceduralExample, getChallengeDecisions } from "./game";

const fixedRandom = (): number => 0.5;

describe("unique substring cross-module contracts", () => {
  it("generates repeated shrink decisions for one incoming character", () => {
    const decisions = getChallengeDecisions(
      generateTrace(generateProceduralExample(fixedRandom)),
    );
    const repeatedIncomingActions = decisions
      .filter((decision) => decision.incomingIndex === 3)
      .map((decision) => decision.expectedAction);

    expect(repeatedIncomingActions).toEqual(["shrink", "shrink", "expand"]);
  });
});
