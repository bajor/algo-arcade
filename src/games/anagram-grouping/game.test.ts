import { describe, expect, it } from "vitest";

import { generateTrace, parseExample } from "./algorithm";
import {
  EXAMPLE_PRESETS,
  generateProceduralExample,
  getChallengeDecisions,
  getChallengeSnapshot,
} from "./game";

const fixedRandom = (): number => 0.5;
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

describe("anagram grouping game core", () => {
  it("is deterministic for a fixed random source", () => {
    expect(generateProceduralExample(fixedRandom)).toEqual(
      generateProceduralExample(fixedRandom),
    );
  });

  it("keeps every preset inside the game input domain", () => {
    expect(
      EXAMPLE_PRESETS.every((preset) => parseExample(preset.value).ok),
    ).toBe(true);
  });

  it("avoids an immediate generated repeat", () => {
    const previous = generateProceduralExample(fixedRandom);

    expect(generateProceduralExample(fixedRandom, previous)).not.toEqual(
      previous,
    );
  });
});

describe("anagram grouping challenge", () => {
  it("generates three creates", () => {
    const actions = generatedActions(fixedRandom);

    expect(actions.filter((action) => action === "create")).toHaveLength(3);
  });

  it("generates two appends", () => {
    const actions = generatedActions(fixedRandom);

    expect(actions.filter((action) => action === "append")).toHaveLength(2);
  });

  it("varies lookup action order for controlled shuffle sources", () => {
    expect(generatedActions(randomWithShuffleSample(0))).not.toEqual(
      generatedActions(randomWithShuffleSample(0.999_999)),
    );
  });

  it("returns the lookup snapshot referenced by a challenge decision", () => {
    const trace = generateTrace(generateProceduralExample(fixedRandom));
    const decision = getChallengeDecisions(trace)[2];
    if (!decision) throw new Error("Expected an append challenge decision.");

    expect(getChallengeSnapshot(trace, decision)).toBe(
      trace[decision.snapshotIndex],
    );
  });
});
