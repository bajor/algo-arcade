import { describe, expect, it } from "vitest";

import { generateTrace, parseExample } from "./algorithm";
import {
  EXAMPLE_PRESETS,
  generateProceduralExample,
  getChallengeDecisions,
  getChallengeSnapshot,
} from "./game";

const fixedRandom = (): number => 0;
const PRE_SHUFFLE_RANDOM_SAMPLE_COUNT = 1;

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

describe("frequency map game core", () => {
  it("keeps every preset inside the game input domain", () => {
    expect(
      EXAMPLE_PRESETS.every((preset) => parseExample(preset.value).ok),
    ).toBe(true);
  });

  it("is deterministic for a fixed random source", () => {
    expect(generateProceduralExample(fixedRandom)).toEqual(
      generateProceduralExample(fixedRandom),
    );
  });

  it("avoids an immediate generated repeat", () => {
    const previous = generateProceduralExample(fixedRandom);

    expect(generateProceduralExample(fixedRandom, previous)).not.toEqual(
      previous,
    );
  });
});

describe("frequency map challenge", () => {
  it("generates four inserts", () => {
    const actions = generatedActions(fixedRandom);

    expect(actions.filter((action) => action === "insert")).toHaveLength(4);
  });

  it("generates three increments", () => {
    const actions = generatedActions(fixedRandom);

    expect(actions.filter((action) => action === "increment")).toHaveLength(3);
  });

  it("varies lookup action order for controlled shuffle sources", () => {
    expect(generatedActions(randomWithShuffleSample(0))).not.toEqual(
      generatedActions(randomWithShuffleSample(0.999_999)),
    );
  });

  it("returns the lookup snapshot referenced by a challenge decision", () => {
    const trace = generateTrace(generateProceduralExample(fixedRandom));
    const decision = getChallengeDecisions(trace)[3];
    if (!decision) throw new Error("Expected an increment challenge decision.");

    expect(getChallengeSnapshot(trace, decision)).toBe(
      trace[decision.snapshotIndex],
    );
  });
});
