import { describe, expect, it } from "vitest";

import { HISTOGRAM_BINS, generateTrace, validateExample } from "./algorithm";
import {
  EXAMPLE_PRESETS,
  generateProceduralExample,
  getChallengeDecisions,
  getChallengeSnapshot,
} from "./game";

const fixedRandom = (): number => 0.5;
const PRE_SHUFFLE_RANDOM_SAMPLE_COUNT = 7;

function randomWithShuffleSample(shuffleSample: number): () => number {
  let sampleIndex = 0;
  return () =>
    sampleIndex++ < PRE_SHUFFLE_RANDOM_SAMPLE_COUNT ? 0.5 : shuffleSample;
}

function generatedActions(random: () => number): readonly string[] {
  return getChallengeDecisions(
    generateTrace(generateProceduralExample(random)),
  ).map(({ expectedAction }) => expectedAction);
}

describe("histogram counting game core", () => {
  it("keeps every preset valid", () => {
    expect(
      EXAMPLE_PRESETS.every(({ value }) => {
        const values = value.split(",").map(Number);
        return validateExample(values).ok;
      }),
    ).toBe(true);
  });

  it("is deterministic for a fixed random source", () => {
    expect(generateProceduralExample(fixedRandom)).toEqual(
      generateProceduralExample(fixedRandom),
    );
  });

  it("avoids repeating the immediately previous generated example", () => {
    const previous = generateProceduralExample(fixedRandom);

    expect(generateProceduralExample(fixedRandom, previous)).not.toEqual(
      previous,
    );
  });

  it("derives one challenge decision per classify snapshot", () => {
    const trace = generateTrace(generateProceduralExample(fixedRandom));
    const decisions = getChallengeDecisions(trace);

    expect(decisions.map(({ snapshotIndex }) => snapshotIndex)).toEqual(
      trace.flatMap((snapshot, index) =>
        snapshot.kind === "classify" ? [index] : [],
      ),
    );
  });

  it("generates all four bins with one uniquely tallest bin", () => {
    const generated = generateProceduralExample(fixedRandom);
    const counts = HISTOGRAM_BINS.map(
      ({ minimum, maximum }) =>
        generated.filter((value) => value >= minimum && value <= maximum)
          .length,
    );

    expect(counts.sort((left, right) => left - right)).toEqual([1, 1, 1, 3]);
  });

  it("varies classify action order for controlled shuffle sources", () => {
    expect(generatedActions(randomWithShuffleSample(0))).not.toEqual(
      generatedActions(randomWithShuffleSample(0.999_999)),
    );
  });

  it("projects value data from classify snapshots", () => {
    const trace = generateTrace(generateProceduralExample(fixedRandom));
    const decision = getChallengeDecisions(trace)[0];
    if (!decision) throw new Error("Generated trace has no classification.");

    const snapshot = trace[decision.snapshotIndex];
    if (!snapshot || snapshot.kind !== "classify") {
      throw new Error("Challenge decision does not reference classification.");
    }

    expect(decision).toMatchObject({
      valueIndex: snapshot.classifiedIndex,
      value: snapshot.value,
      expectedAction: snapshot.binId,
    });
  });

  it("returns the classify snapshot referenced by a decision", () => {
    const trace = generateTrace(generateProceduralExample(fixedRandom));
    const decision = getChallengeDecisions(trace)[0];
    if (!decision) throw new Error("Generated trace has no classification.");

    expect(getChallengeSnapshot(trace, decision)).toBe(
      trace[decision.snapshotIndex],
    );
  });
});
