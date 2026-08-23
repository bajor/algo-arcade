import { describe, expect, it } from "vitest";

import {
  DEFAULT_EXAMPLE,
  generateTrace,
  parseExample,
  validateExample,
  type Example,
  type TraceSnapshot,
} from "./algorithm";

function example(values: readonly number[], target: number): Example {
  const result = validateExample(values, target);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

function complete(
  values: readonly number[],
  target: number,
): Extract<TraceSnapshot, { readonly kind: "complete" }> {
  const snapshot = generateTrace(example(values, target)).at(-1);
  if (!snapshot || snapshot.kind !== "complete") {
    throw new Error("Trace did not complete.");
  }
  return snapshot;
}

describe("minimum window trace", () => {
  it("finds the default shortest window", () => {
    expect(generateTrace(DEFAULT_EXAMPLE).at(-1)?.best).toEqual({
      start: 4,
      endExclusive: 6,
      values: [4, 3],
      sum: 7,
      length: 2,
    });
  });

  it("follows the canonical default event flow", () => {
    const trace = generateTrace(DEFAULT_EXAMPLE);

    expect(trace.map((snapshot) => snapshot.kind)).toEqual([
      "start",
      "decide",
      "expand",
      "decide",
      "expand",
      "decide",
      "expand",
      "decide",
      "expand",
      "decide",
      "qualify",
      "shrink",
      "decide",
      "expand",
      "decide",
      "qualify",
      "shrink",
      "decide",
      "qualify",
      "shrink",
      "decide",
      "expand",
      "decide",
      "qualify",
      "shrink",
      "decide",
      "qualify",
      "shrink",
      "complete",
    ]);
  });

  it("counts every default operation", () => {
    const finalSnapshot = generateTrace(DEFAULT_EXAMPLE).at(-1);

    expect(finalSnapshot?.counts).toEqual({
      thresholdChecks: 12,
      expansions: 6,
      shrinks: 5,
      bestUpdates: 3,
    });
  });

  it("returns null when no window reaches the target", () => {
    expect(complete([1, 2, 3], 10).best).toBeNull();
  });

  it("handles the smallest valid example", () => {
    expect(complete([1], 1).best).toEqual({
      start: 0,
      endExclusive: 1,
      values: [1],
      sum: 1,
      length: 1,
    });
  });

  it("keeps the earliest window when shortest lengths tie", () => {
    expect(complete([2, 2, 2], 4).best).toMatchObject({
      start: 0,
      endExclusive: 2,
      length: 2,
    });
  });

  it("records repeated shrinks as separate atomic events", () => {
    const shrinks = generateTrace(example([1, 2, 7], 7))
      .filter((snapshot) => snapshot.kind === "shrink")
      .map((snapshot) => ({
        removedIndex: snapshot.removedIndex,
        left: snapshot.left,
        sum: snapshot.sum,
      }));

    expect(shrinks).toEqual([
      { removedIndex: 0, left: 1, sum: 9 },
      { removedIndex: 1, left: 2, sum: 7 },
      { removedIndex: 2, left: 3, sum: 0 },
    ]);
  });

  it("parses a values list and target into a structured example", () => {
    expect(parseExample("[2, 3, 1] | 6")).toMatchObject({
      ok: true,
      value: { values: [2, 3, 1], target: 6 },
    });
  });

  it("accepts the maximum item count", () => {
    expect(
      validateExample(
        Array.from({ length: 12 }, () => 1),
        1,
      ),
    ).toMatchObject({ ok: true });
  });

  it("accepts the maximum value", () => {
    expect(validateExample([99], 1)).toMatchObject({ ok: true });
  });

  it("accepts the maximum target", () => {
    expect(validateExample([1], 1188)).toMatchObject({ ok: true });
  });

  it("requires a separator", () => {
    const result = parseExample("1, 2");

    expect(result).toMatchObject({ ok: false });
    if (result.ok) {
      throw new Error("Invalid input was accepted.");
    }
    expect(result.error).toContain("exactly one");
  });

  it("rejects zero as a value precisely", () => {
    const result = parseExample("0, 2 | 3");

    expect(result).toMatchObject({ ok: false });
    if (result.ok) {
      throw new Error("A non-positive value was accepted.");
    }
    expect(result.error).toContain("Value 0");
    expect(result.error).toContain("positive integers");
  });

  it("rejects zero as a target precisely", () => {
    const result = parseExample("1, 2 | 0");

    expect(result).toMatchObject({ ok: false });
    if (result.ok) {
      throw new Error("A non-positive target was accepted.");
    }
    expect(result.error).toContain("Target 0");
    expect(result.error).toContain("positive integer");
  });

  it.each([
    { raw: "1, nope | 2", message: "not an integer" },
    { raw: "1, 2 | 2.5", message: "not an integer target" },
    { raw: "1, 2] | 3", message: "both square brackets" },
  ])("rejects invalid syntax in '$raw'", ({ raw, message }) => {
    const result = parseExample(raw);

    expect(result).toMatchObject({ ok: false });
    if (result.ok) {
      throw new Error("Invalid syntax was accepted.");
    }
    expect(result.error).toContain(message);
  });

  it.each([
    {
      values: Array.from({ length: 13 }, () => 1),
      target: 1,
      message: "at most 12",
    },
    { values: [100], target: 1, message: "1 to 99" },
    { values: [1], target: 1189, message: "1 to 1188" },
  ])(
    "rejects values or targets beyond the documented bounds",
    ({ values, target, message }) => {
      const result = validateExample(values, target);

      expect(result).toMatchObject({ ok: false });
      if (result.ok) {
        throw new Error("An out-of-bounds example was accepted.");
      }
      expect(result.error).toContain(message);
    },
  );

  it("returns deeply equal traces for the same example", () => {
    const input = example([1, 2, 7, 3], 7);

    expect(generateTrace(input)).toEqual(generateTrace(input));
  });

  it("freezes nested trace state", () => {
    const trace = generateTrace(example([1, 2, 7], 7));
    const qualifying = trace.find((snapshot) => snapshot.kind === "qualify");

    expect(Object.isFrozen(trace)).toBe(true);
    expect(trace.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(trace[0]?.values)).toBe(true);
    expect(Object.isFrozen(trace[0]?.counts)).toBe(true);
    expect(Object.isFrozen(qualifying?.candidate)).toBe(true);
    expect(Object.isFrozen(qualifying?.candidate.values)).toBe(true);
    expect(Object.isFrozen(trace.at(-1)?.best?.values)).toBe(true);
  });

  it("keeps earlier snapshots independent from later updates", () => {
    const trace = generateTrace(example([1, 2, 7], 7));

    expect(trace[0]).toMatchObject({
      left: 0,
      right: 0,
      sum: 0,
      best: null,
      counts: {
        thresholdChecks: 0,
        expansions: 0,
        shrinks: 0,
        bestUpdates: 0,
      },
    });
    expect(trace.at(-1)?.best).toMatchObject({ start: 2, endExclusive: 3 });
  });
});
