import { describe, expect, it } from "vitest";

import { generateTrace, validateExample } from "./algorithm";
import {
  generateProceduralExample,
  getChallengeDecisions,
  getChallengeSnapshot,
} from "./game";

const fixedRandom = (): number => 0.5;

describe("pair sum procedural examples", () => {
  it("uses the supplied random source to build a fixed example", () => {
    expect(generateProceduralExample(fixedRandom)).toEqual({
      values: [-12, -10, -10, -10, -8, -6, -2, 2, 6, 10, 12, 16],
      target: 0,
    });
  });

  it.each([0, 0.999_999])(
    "keeps the generated boundary sample %s valid",
    (sample) => {
      const generated = generateProceduralExample(() => sample);

      expect(validateExample(generated.values, generated.target).ok).toBe(true);
    },
  );

  it("changes a complete example when the random source repeats", () => {
    const previous = generateProceduralExample(fixedRandom);

    expect(generateProceduralExample(fixedRandom, previous)).not.toEqual(
      previous,
    );
  });

  it.each([0, 0.5, 0.999_999])(
    "guarantees every challenge action for sample %s",
    (sample) => {
      const trace = generateTrace(generateProceduralExample(() => sample));
      const decisions = getChallengeDecisions(trace);

      expect(decisions.map((decision) => decision.expectedAction)).toEqual([
        "move-right",
        "record-pair",
        "record-pair",
        "move-left",
        "record-pair",
        "record-pair",
      ]);
    },
  );

  it.each([0, 0.5, 0.999_999])(
    "guarantees multiple unique pairs for sample %s",
    (sample) => {
      const trace = generateTrace(generateProceduralExample(() => sample));

      expect(trace.at(-1)?.pairs.length).toBeGreaterThanOrEqual(2);
    },
  );

  it.each([0, 0.5, 0.999_999])(
    "guarantees duplicate skipping for sample %s",
    (sample) => {
      const trace = generateTrace(generateProceduralExample(() => sample));

      expect(
        trace.some(
          (snapshot) =>
            (snapshot.kind === "move-left" || snapshot.kind === "move-right") &&
            snapshot.reason === "duplicate-skip",
        ),
      ).toBe(true);
    },
  );

  it("derives challenge decisions only from comparison snapshots", () => {
    const trace = generateTrace(generateProceduralExample(fixedRandom));
    const decisions = getChallengeDecisions(trace);

    expect(decisions.map((decision) => decision.snapshotIndex)).toEqual(
      trace.flatMap((snapshot, index) =>
        snapshot.kind === "compare" ? [index] : [],
      ),
    );
  });

  it("projects pointer data from comparison snapshots", () => {
    const trace = generateTrace(generateProceduralExample(fixedRandom));
    const decisions = getChallengeDecisions(trace);

    expect(decisions[0]).toMatchObject({
      leftIndex: 0,
      rightIndex: 11,
      leftValue: -12,
      rightValue: 16,
      currentSum: 4,
      target: 0,
    });
  });

  it("returns the comparison referenced by a challenge decision", () => {
    const trace = generateTrace(generateProceduralExample(fixedRandom));
    const decision = getChallengeDecisions(trace)[0];
    if (!decision) {
      throw new Error("Generated trace has no challenge decision.");
    }

    expect(getChallengeSnapshot(trace, decision)).toBe(
      trace[decision.snapshotIndex],
    );
  });
});
