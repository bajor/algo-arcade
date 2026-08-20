import { describe, expect, it } from "vitest";

import {
  generateTrace,
  parseExample,
  validateExample,
  type Example,
} from "./algorithm";

function example(values: readonly number[]): Example {
  const result = validateExample(values);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

function finalResult(values: readonly number[]): readonly (number | null)[] {
  const trace = generateTrace(example(values));
  const finalSnapshot = trace.at(-1);
  if (!finalSnapshot || finalSnapshot.kind !== "complete") {
    throw new Error("Trace did not complete.");
  }
  return finalSnapshot.result;
}

describe("next greater element trace", () => {
  it("records each resolution as a separate pop", () => {
    const trace = generateTrace(example([2, 1, 2, 4, 3]));
    const resolutions = trace
      .filter((snapshot) => snapshot.kind === "resolve")
      .map((snapshot) => [snapshot.resolvedIndex, snapshot.currentIndex]);

    expect(resolutions).toEqual([
      [1, 2],
      [2, 3],
      [0, 3],
    ]);
  });

  it.each([
    { values: [2, 1, 2, 4, 3], expected: [4, 2, 4, -1, -1] },
    { values: [5], expected: [-1] },
    { values: [-2, 0, -1], expected: [0, -1, -1] },
    { values: [1, 2, 3], expected: [2, 3, -1] },
    { values: [3, 2, 1], expected: [-1, -1, -1] },
    { values: [2, 2], expected: [-1, -1] },
  ])("computes the final result for $values", ({ values, expected }) => {
    expect(finalResult(values)).toEqual(expected);
  });

  it("stops instead of popping when values are equal", () => {
    const trace = generateTrace(example([2, 2]));
    const comparison = trace.find((snapshot) => snapshot.kind === "compare");

    expect(comparison).toMatchObject({
      decision: "stop",
      topIndex: 0,
      currentIndex: 1,
    });
  });

  it("parses bracketed, comma-separated integers", () => {
    expect(parseExample("[2, -1, 4]")).toMatchObject({
      ok: true,
      value: [2, -1, 4],
    });
  });

  it.each([
    { raw: "", message: "at least" },
    { raw: "1, 2.5", message: "not an integer" },
    { raw: "1, 2]", message: "both square brackets" },
  ])("rejects invalid syntax in '$raw'", ({ raw, message }) => {
    const result = parseExample(raw);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Invalid syntax was accepted.");
    }
    expect(result.error).toContain(message);
  });

  it.each([
    {
      values: Array.from({ length: 13 }, (_, index) => index),
      message: "at most 12",
    },
    { values: [100], message: "-99 to 99" },
  ])("rejects examples outside the visual bounds", ({ values, message }) => {
    const result = validateExample(values);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("An out-of-bounds example was accepted.");
    }
    expect(result.error).toContain(message);
  });

  it("returns the same trace for the same example", () => {
    const input = example([1, 3, 2]);
    const firstTrace = generateTrace(input);
    const secondTrace = generateTrace(input);

    expect(firstTrace).toEqual(secondTrace);
  });

  it("freezes the trace", () => {
    const trace = generateTrace(example([1, 3, 2]));

    expect(Object.isFrozen(trace)).toBe(true);
  });

  it("freezes state arrays inside each snapshot", () => {
    const trace = generateTrace(example([1, 3, 2]));

    expect(Object.isFrozen(trace[0]?.stack)).toBe(true);
  });

  it("does not let later result updates rewrite the starting snapshot", () => {
    const trace = generateTrace(example([1, 3, 2]));

    expect(trace[0]?.result).toEqual([null, null, null]);
    expect(trace.at(-1)?.result).toEqual([3, -1, -1]);
  });
});
