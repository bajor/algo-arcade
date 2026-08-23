import { describe, expect, it } from "vitest";

import {
  generateTrace,
  parseExample,
  validateExample,
  type Example,
  type TraceSnapshot,
} from "./algorithm";

function example(
  values: readonly number[],
  start: number,
  end: number,
): Example {
  const result = validateExample(values, start, end);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function complete(
  values: readonly number[],
  start: number,
  end: number,
): Extract<TraceSnapshot, { readonly kind: "complete" }> {
  const snapshot = generateTrace(example(values, start, end)).at(-1);
  if (!snapshot || snapshot.kind !== "complete") {
    throw new Error("Trace did not complete.");
  }
  return snapshot;
}

describe("prefix sum parsing and validation", () => {
  it("parses the documented half-open range example", () => {
    expect(parseExample("[2, -1, 4, 3] | 1:4")).toMatchObject({
      ok: true,
      value: { values: [2, -1, 4, 3], start: 1, end: 4 },
    });
  });

  it.each([
    { result: parseExample("2, -1, 4"), message: "exactly one" },
    { result: parseExample("2, nope | 0:1"), message: "not an integer" },
    { result: parseExample("2, 4 | 0-2"), message: "start:end" },
    { result: parseExample("2, 4 | zero:2"), message: "query start" },
  ])("rejects invalid parser input: $message", ({ result, message }) => {
    expect(result).toMatchObject({ ok: false });
    if (result.ok) throw new Error("Invalid input was accepted.");
    expect(result.error).toContain(message);
  });

  it.each([
    { values: [], start: 0, end: 1, message: "at least one" },
    {
      values: Array.from({ length: 13 }, () => 0),
      start: 0,
      end: 1,
      message: "at most 12",
    },
    { values: [-100], start: 0, end: 1, message: "-99 to 99" },
    { values: [100], start: 0, end: 1, message: "-99 to 99" },
    { values: [1, 2], start: -1, end: 1, message: "start -1" },
    { values: [1, 2], start: 1, end: 1, message: "must be less" },
    { values: [1, 2], start: 0, end: 3, message: "end 3" },
  ])(
    "rejects an example beyond a documented bound: $message",
    ({ values, start, end, message }) => {
      const result = validateExample(values, start, end);
      expect(result).toMatchObject({ ok: false });
      if (result.ok) throw new Error("An out-of-bounds example was accepted.");
      expect(result.error).toContain(message);
    },
  );
});

describe("prefix sum trace", () => {
  it("constructs the representative prefix totals", () => {
    expect(complete([2, -1, 4, 3], 1, 4).prefix).toEqual([0, 2, 1, 5, 8]);
  });

  it("answers the representative range", () => {
    expect(complete([2, -1, 4, 3], 1, 4).rangeSum).toBe(6);
  });

  it.each([
    { label: "smallest", values: [7], start: 0, end: 1, expected: 7 },
    {
      label: "negative",
      values: [-5, -2, -3],
      start: 1,
      end: 3,
      expected: -5,
    },
    { label: "zero", values: [4, 0, -1], start: 1, end: 2, expected: 0 },
  ])("answers the $label range", ({ values, start, end, expected }) => {
    expect(complete(values, start, end).rangeSum).toBe(expected);
  });

  it("records one atomic event for each algorithm action", () => {
    expect(
      generateTrace(example([2, -1, 4, 3], 1, 4)).map(
        (snapshot) => snapshot.kind,
      ),
    ).toEqual([
      "start",
      "accumulate",
      "accumulate",
      "accumulate",
      "accumulate",
      "read-start",
      "read-end",
      "subtract",
      "complete",
    ]);
  });

  it("records the final operation counts", () => {
    expect(complete([2, -1, 4, 3], 1, 4).counts).toEqual({
      additions: 4,
      lookups: 2,
      subtractions: 1,
    });
  });

  it("returns deeply equal traces for equal validated input", () => {
    const input = example([3, -2, 0], 1, 3);
    expect(generateTrace(input)).toEqual(generateTrace(input));
  });

  it("deeply freezes trace state", () => {
    const input = example([3, -2, 0], 1, 3);
    const trace = generateTrace(input);

    expect(Object.isFrozen(trace)).toBe(true);
    expect(
      trace.every(
        (snapshot) =>
          Object.isFrozen(snapshot) &&
          Object.isFrozen(snapshot.values) &&
          Object.isFrozen(snapshot.prefix) &&
          Object.isFrozen(snapshot.counts),
      ),
    ).toBe(true);
  });

  it("keeps earlier prefix snapshots independent from later additions", () => {
    const trace = generateTrace(example([3, -2, 0], 1, 3));
    expect(trace[0]?.prefix).toEqual([0, null, null, null]);
    expect(trace.at(-1)?.prefix).toEqual([0, 3, 1, 1]);
  });
});
