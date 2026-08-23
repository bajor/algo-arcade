import { describe, expect, it } from "vitest";

import type { TraceSnapshot } from "./algorithm";
import {
  EXAMPLE_PRESETS,
  generateProceduralExample,
  getChallengeDecisions,
  getChallengeSnapshot,
  type ChallengeDecision,
} from "./game";

const fixedRandom = (): number => 0.5;
const snapshotState = {
  values: [2],
  target: 1,
  left: 0,
  right: 1,
  sum: 2,
  best: null,
  counts: {
    thresholdChecks: 1,
    expansions: 1,
    shrinks: 0,
    bestUpdates: 0,
  },
  explanation: "Fixture snapshot.",
};
const decideSnapshot = {
  ...snapshotState,
  kind: "decide",
  decision: "shrink",
  line: "decide",
} satisfies TraceSnapshot;
const startSnapshot = {
  ...snapshotState,
  kind: "start",
  line: "initialize",
} satisfies TraceSnapshot;
const challengeDecision = {
  snapshotIndex: 0,
  left: 0,
  right: 1,
  sum: 2,
  expectedAction: "shrink",
} satisfies ChallengeDecision;

describe("minimum window procedural examples", () => {
  it.each([
    { sample: 0, values: [1, 1, 8, 1, 1], target: 8 },
    {
      sample: 0.5,
      values: [5, 5, 29, 10, 10, 10, 10],
      target: 19,
    },
    {
      sample: 0.999_999,
      values: [14, 14, 50, 29, 29, 29, 29, 29],
      target: 30,
    },
  ])("builds the fixed example for random sample $sample", (expected) => {
    expect(generateProceduralExample(() => expected.sample)).toEqual({
      values: expected.values,
      target: expected.target,
    });
  });

  it("avoids an immediate repeat without drawing another sample", () => {
    const previous = generateProceduralExample(fixedRandom);

    expect(generateProceduralExample(fixedRandom, previous)).toEqual({
      values: [5, 5, 29, 10, 10, 10, 11],
      target: 19,
    });
  });

  it("provides the four requested presets", () => {
    expect(EXAMPLE_PRESETS).toEqual([
      { label: "Classic", value: "2, 3, 1, 2, 4, 3 | 7" },
      { label: "One item", value: "8 | 7" },
      { label: "Repeated shrink", value: "1, 2, 3, 4 | 6" },
      { label: "No solution", value: "1, 2, 3 | 10" },
    ]);
  });
});

describe("minimum window challenge decisions", () => {
  it("extracts challenge data from a decide snapshot", () => {
    expect(getChallengeDecisions([decideSnapshot])).toEqual([
      challengeDecision,
    ]);
  });

  it("returns the decide snapshot referenced by a challenge decision", () => {
    expect(getChallengeSnapshot([decideSnapshot], challengeDecision)).toBe(
      decideSnapshot,
    );
  });

  it("rejects a challenge decision that does not reference a decide snapshot", () => {
    expect(() =>
      getChallengeSnapshot([startSnapshot], challengeDecision),
    ).toThrow("does not reference a decide snapshot");
  });
});
