import { describe, expect, it } from "vitest";

import type { Example, TraceSnapshot } from "./algorithm";
import {
  generateProceduralExample,
  getChallengeDecisions,
  getChallengeSnapshot,
  type ChallengeDecision,
} from "./game";

const fixedRandom = (): number => 0.5;
const fixtureExample = "a" as Example;
const inspectSnapshot = {
  kind: "inspect",
  inspectedIndex: 0,
  character: "a",
  decision: "expand",
  example: fixtureExample,
  left: 0,
  right: 0,
  incomingIndex: 0,
  activeCharacters: [],
  best: {
    substring: "",
    start: 0,
    endExclusive: 0,
    length: 0,
  },
  counts: {
    inspections: 1,
    expansions: 0,
    shrinks: 0,
    bestUpdates: 0,
  },
  line: "inspect",
  explanation: "Fixture snapshot.",
} satisfies TraceSnapshot;
const challengeDecision = {
  snapshotIndex: 0,
  incomingIndex: 0,
  character: "a",
  expectedAction: "expand",
} satisfies ChallengeDecision;

describe("unique substring game core", () => {
  it.each([
    { sample: 0, value: "abcbdef" },
    { sample: 0.5, value: "stutvwx" },
    { sample: 0.999_999, value: "9abacde" },
  ])("builds the fixed example for random sample $sample", (expected) => {
    expect(generateProceduralExample(() => expected.sample)).toBe(
      expected.value,
    );
  });

  it("changes an example when the random source immediately repeats", () => {
    const previous = generateProceduralExample(fixedRandom);

    expect(generateProceduralExample(fixedRandom, previous)).not.toBe(previous);
  });
});

describe("unique substring challenge decisions", () => {
  it("extracts challenge data from an inspect snapshot", () => {
    expect(getChallengeDecisions([inspectSnapshot])).toEqual([
      challengeDecision,
    ]);
  });

  it("returns the inspect snapshot referenced by a challenge decision", () => {
    expect(getChallengeSnapshot([inspectSnapshot], challengeDecision)).toBe(
      inspectSnapshot,
    );
  });
});
