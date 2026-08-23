import { describe, expect, it } from "vitest";

import { generateTrace, parseExample, validateExample } from "./algorithm";
import {
  EXAMPLE_PRESETS,
  generateProceduralExample,
  getChallengeDecisions,
  getChallengeSnapshot,
} from "./game";

const fixedRandom = (): number => 0.5;

function randomSequence(samples: readonly number[]): () => number {
  let index = 0;
  return () => samples[index++] ?? 0;
}

describe("prefix sum game core", () => {
  it("keeps every preset valid", () => {
    expect(
      EXAMPLE_PRESETS.every((preset) => parseExample(preset.value).ok),
    ).toBe(true);
  });

  it.each([0, 0.5, 0.999_999])(
    "keeps generated sample %s inside the input domain",
    (sample) => {
      const generated = generateProceduralExample(() => sample);
      expect(
        validateExample(generated.values, generated.start, generated.end).ok,
      ).toBe(true);
    },
  );

  it.each([0, 0.5, 0.999_999])(
    "guarantees all range actions for sample %s",
    (sample) => {
      const generated = generateProceduralExample(() => sample);
      const actions = getChallengeDecisions(generateTrace(generated)).map(
        (decision) => decision.expectedAction,
      );
      expect(new Set(actions)).toEqual(new Set(["add", "subtract", "ignore"]));
    },
  );

  it("varies generated value order through shuffling", () => {
    const valueSamples = [0, 0, 0.2, 0.4, 0.6, 0.9];
    const keptOrder = generateProceduralExample(
      randomSequence([
        ...valueSamples,
        ...Array<number>(5).fill(0.999_999),
        0,
        0,
      ]),
    );
    const shuffledOrder = generateProceduralExample(
      randomSequence([...valueSamples, ...Array<number>(7).fill(0)]),
    );

    expect(shuffledOrder.values).not.toEqual(keptOrder.values);
  });

  it("guarantees a query with a nonzero start", () => {
    const generated = generateProceduralExample(fixedRandom);
    expect(generated.start).toBeGreaterThan(0);
  });

  it("guarantees a query spanning multiple values", () => {
    const generated = generateProceduralExample(fixedRandom);
    expect(generated.end - generated.start).toBeGreaterThan(1);
  });

  it("avoids an immediate generated repeat", () => {
    const previous = generateProceduralExample(fixedRandom);
    expect(generateProceduralExample(fixedRandom, previous)).not.toEqual(
      previous,
    );
  });

  it("varies range-action positions through query selection", () => {
    const actionPositions = [0, 0.5, 0.999_999].map((sample) => {
      const actions = getChallengeDecisions(
        generateTrace(generateProceduralExample(() => sample)),
      ).map((decision) => decision.expectedAction);
      return `${String(actions.indexOf("subtract"))}:${String(actions.indexOf("add"))}`;
    });

    expect(new Set(actionPositions).size).toBeGreaterThan(1);
  });
});

describe("prefix sum challenge projection", () => {
  it("derives each built prefix cell's range action", () => {
    const parsed = parseExample("2, -1, 4, 3 | 1:4");
    if (!parsed.ok) throw new Error(parsed.error);

    expect(getChallengeDecisions(generateTrace(parsed.value))).toEqual([
      { snapshotIndex: 1, prefixIndex: 1, expectedAction: "subtract" },
      { snapshotIndex: 2, prefixIndex: 2, expectedAction: "ignore" },
      { snapshotIndex: 3, prefixIndex: 3, expectedAction: "ignore" },
      { snapshotIndex: 4, prefixIndex: 4, expectedAction: "add" },
    ]);
  });

  it("returns the accumulate snapshot referenced by a decision", () => {
    const trace = generateTrace(generateProceduralExample(fixedRandom));
    const decision = getChallengeDecisions(trace)[0];
    if (!decision)
      throw new Error("Generated trace has no challenge decision.");

    expect(getChallengeSnapshot(trace, decision)).toBe(
      trace[decision.snapshotIndex],
    );
  });
});
