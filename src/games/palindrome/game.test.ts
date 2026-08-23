import { describe, expect, it } from "vitest";

import { generateTrace, validateExample } from "./algorithm";
import {
  EXAMPLE_PRESETS,
  generateProceduralExample,
  getChallengeDecisions,
  getChallengeSnapshot,
} from "./game";

function verdict(value: string): boolean | null | undefined {
  const validated = validateExample(value);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  return generateTrace(validated.value).at(-1)?.verdict;
}

describe("palindrome game core", () => {
  it("defines one palindrome and one non-palindrome preset", () => {
    expect(EXAMPLE_PRESETS).toEqual([
      { label: "Palindrome", value: "racecar" },
      { label: "Not Palindrome", value: "algorithm" },
    ]);
    expect(EXAMPLE_PRESETS.map(({ value }) => verdict(value))).toEqual([
      true,
      false,
    ]);
  });

  it.each([
    { sample: 0, expected: "aaaaaa" },
    { sample: 0.5, expected: "nnnnonnn" },
    { sample: 0.999_999, expected: "zzzzzazzzz" },
  ])("builds the fixed procedural sample $sample", ({ sample, expected }) => {
    expect(generateProceduralExample(() => sample)).toBe(expected);
  });

  it("selects one palindrome outcome across the three random buckets", () => {
    const outcomes = [0, 1 / 3, 2 / 3].map((sample) =>
      verdict(generateProceduralExample(() => sample)),
    );

    expect(outcomes).toEqual([true, false, false]);
  });

  it("avoids an immediate repeat", () => {
    const previous = generateProceduralExample(() => 0);
    const generated = generateProceduralExample(() => 0, previous);

    expect(generated).not.toBe(previous);
  });

  it("preserves the verdict when avoiding an immediate repeat", () => {
    const previous = generateProceduralExample(() => 0);
    const generated = generateProceduralExample(() => 0, previous);

    expect(verdict(generated)).toBe(true);
  });

  it("introduces a generated non-palindrome's mismatch after a match", () => {
    const trace = generateTrace(generateProceduralExample(() => 0.5));
    const eventKinds = trace.map(({ kind }) => kind);

    expect(eventKinds.indexOf("mismatch")).toBeGreaterThan(
      eventKinds.indexOf("match"),
    );
  });

  it("derives challenge decisions from inspect snapshots", () => {
    const trace = generateTrace(generateProceduralExample(() => 0.5));
    const decisions = getChallengeDecisions(trace);

    expect(decisions).toEqual(
      trace.flatMap((snapshot, snapshotIndex) =>
        snapshot.kind === "inspect"
          ? [
              {
                snapshotIndex,
                leftIndex: snapshot.leftIndex,
                rightIndex: snapshot.rightIndex,
                expectedAction: snapshot.decision,
              },
            ]
          : [],
      ),
    );
  });

  it("resolves each challenge decision to its inspect snapshot", () => {
    const trace = generateTrace(generateProceduralExample(() => 0.5));
    const decisions = getChallengeDecisions(trace);

    expect(
      decisions.map((decision) => getChallengeSnapshot(trace, decision).kind),
    ).toEqual(decisions.map(() => "inspect"));
  });
});
