import { describe, expect, it } from "vitest";

import { generateTrace, validateExample } from "./algorithm";
import {
  EXAMPLE_PRESETS,
  generateProceduralExample,
  getChallengeDecisions,
  getChallengeSnapshot,
} from "./game";

describe("palindrome game core", () => {
  it("defines the four requested presets", () => {
    expect(EXAMPLE_PRESETS).toEqual([
      { label: "Phrase", value: "Never odd or even" },
      {
        label: "Punctuation",
        value: "A man, a plan, a canal: Panama!",
      },
      { label: "Mismatch", value: "Mirror scan" },
      { label: "Digits", value: "12 3 21" },
    ]);
  });

  it.each([
    { sample: 0, expected: "! aaa:AAA ?" },
    { sample: 0.5, expected: "?.nnnn:ONNN-!" },
  ])("builds the fixed procedural sample $sample", ({ sample, expected }) => {
    expect(generateProceduralExample(() => sample)).toBe(expected);
  });

  it.each([0, 0.25, 0.5, 0.999_999])(
    "validates generated sample %s through the normal input path",
    (sample) => {
      const generated = generateProceduralExample(() => sample);
      expect(validateExample(generated)).toMatchObject({
        ok: true,
        value: generated,
      });
    },
  );

  it.each([
    { sample: 0, verdict: true },
    { sample: 0.5, verdict: false },
  ])(
    "generates verdict branch $verdict for sample $sample",
    ({ sample, verdict }) => {
      const trace = generateTrace(generateProceduralExample(() => sample));

      expect(trace.at(-1)?.verdict).toBe(verdict);
    },
  );

  it.each([
    { sample: 0, branch: "skip-left" },
    { sample: 0, branch: "skip-right" },
    { sample: 0, branch: "match" },
    { sample: 0.5, branch: "skip-left" },
    { sample: 0.5, branch: "skip-right" },
  ] as const)(
    "guarantees the $branch branch for sample $sample",
    ({ sample, branch }) => {
      const eventKinds = generateTrace(
        generateProceduralExample(() => sample),
      ).map(({ kind }) => kind);

      expect(eventKinds).toContain(branch);
    },
  );

  it("introduces the false variant's mismatch after an outer match", () => {
    const eventKinds = generateTrace(generateProceduralExample(() => 0.5)).map(
      ({ kind }) => kind,
    );

    expect(eventKinds.indexOf("mismatch")).toBeGreaterThan(
      eventKinds.indexOf("match"),
    );
  });

  it("avoids an immediate repeat without requesting another random sample", () => {
    const previous = generateProceduralExample(() => 0.5);
    const generated = generateProceduralExample(() => 0.5, previous);

    expect(generated).not.toBe(previous);
  });

  it("derives challenge decisions from inspect snapshots", () => {
    const trace = generateTrace(generateProceduralExample(() => 0));
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
    const trace = generateTrace(generateProceduralExample(() => 0));

    expect(
      getChallengeDecisions(trace).map(
        (decision) => getChallengeSnapshot(trace, decision).kind,
      ),
    ).toEqual(getChallengeDecisions(trace).map(() => "inspect"));
  });
});
