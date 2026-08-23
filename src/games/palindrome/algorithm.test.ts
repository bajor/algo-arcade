import { describe, expect, it } from "vitest";

import {
  generateTrace,
  parseExample,
  validateExample,
  type Example,
  type TraceSnapshot,
} from "./algorithm";

function example(value: string): Example {
  const result = validateExample(value);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

function completeSnapshot(
  value: string,
): Extract<TraceSnapshot, { readonly kind: "complete" }> {
  const snapshot = generateTrace(example(value)).at(-1);
  if (!snapshot || snapshot.kind !== "complete") {
    throw new Error("Trace did not complete.");
  }
  return snapshot;
}

describe("palindrome validation and trace", () => {
  it.each([
    { value: "racecar", expected: true },
    { value: "abca", expected: false },
    { value: "a", expected: true },
    { value: "aa", expected: true },
    { value: "ab", expected: false },
  ])("evaluates '$value'", ({ value, expected }) => {
    expect(completeSnapshot(value).verdict).toBe(expected);
  });

  it.each(["a", "z", "a".repeat(48)])(
    "accepts lowercase boundary input '%s' without normalization",
    (value) => {
      expect(parseExample(value)).toMatchObject({ ok: true, value });
    },
  );

  it.each([
    { value: "", message: "at least one" },
    { value: "a".repeat(49), message: "at most 48" },
    { value: "Racecar", message: 'Character "R" at position 1' },
    { value: "abc1", message: 'Character "1" at position 4' },
    { value: "ab c", message: 'Character " " at position 3' },
    { value: "valid\n", message: 'Character "\\n" at position 6' },
    { value: "é", message: 'Character "é" at position 1' },
  ])("rejects invalid input '$value' precisely", ({ value, message }) => {
    const result = validateExample(value);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Invalid string was accepted.");
    }
    expect(result.error).toContain(message);
  });

  it("records each comparison before its match or mismatch", () => {
    const trace = generateTrace(example("abca"));

    expect(trace.map(({ kind }) => kind)).toEqual([
      "start",
      "inspect",
      "match",
      "inspect",
      "mismatch",
      "complete",
    ]);
  });

  it("counts each comparison operation", () => {
    expect(completeSnapshot("abca").counts).toEqual({
      inspections: 2,
      comparisons: 2,
      matches: 1,
    });
  });

  it("records a single lowercase character as the center", () => {
    expect(generateTrace(example("a")).map(({ kind }) => kind)).toEqual([
      "start",
      "center",
      "complete",
    ]);
  });

  it("returns the same trace for the same example", () => {
    const input = example("racecar");

    expect(generateTrace(input)).toEqual(generateTrace(input));
  });

  it("deeply freezes every snapshot", () => {
    const trace = generateTrace(example("racecar"));

    expect(Object.isFrozen(trace)).toBe(true);
    expect(
      trace.every(
        (snapshot) =>
          Object.isFrozen(snapshot) &&
          Object.isFrozen(snapshot.chars) &&
          Object.isFrozen(snapshot.matchedIndexPairs) &&
          snapshot.matchedIndexPairs.every((pair) => Object.isFrozen(pair)) &&
          Object.isFrozen(snapshot.counts),
      ),
    ).toBe(true);
  });

  it("keeps earlier matched pairs independent from later updates", () => {
    const trace = generateTrace(example("racecar"));

    expect(trace[0]?.matchedIndexPairs).toEqual([]);
    expect(trace.at(-1)?.matchedIndexPairs).toEqual([
      [0, 6],
      [1, 5],
      [2, 4],
    ]);
  });
});
