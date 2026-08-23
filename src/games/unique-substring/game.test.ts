import { describe, expect, it } from "vitest";

import { validateExample, type Example, type TraceSnapshot } from "./algorithm";
import {
  EXAMPLE_PRESETS,
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
    { sample: 0.5, value: "nopoqrs" },
    { sample: 0.999_999, value: "zabacde" },
  ])("builds the fixed example for random sample $sample", (expected) => {
    const generated = generateProceduralExample(() => expected.sample);

    expect(generated).toBe(expected.value);
  });

  it("keeps every preset inside the lowercase input domain", () => {
    expect(
      EXAMPLE_PRESETS.every(({ value }) => validateExample(value).ok),
    ).toBe(true);
  });

  it("changes an example when the random source immediately repeats", () => {
    const previous = generateProceduralExample(fixedRandom);

    const generated = generateProceduralExample(fixedRandom, previous);

    expect(generated).not.toBe(previous);
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
