import { describe, expect, it } from "vitest";

import {
  HISTOGRAM_BINS,
  generateTrace,
  parseExample,
  validateExample,
  type Example,
  type TraceSnapshot,
} from "./algorithm";

function example(values: readonly number[]): Example {
  const result = validateExample(values);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function complete(
  values: readonly number[],
): Extract<TraceSnapshot, { readonly kind: "complete" }> {
  const snapshot = generateTrace(example(values)).at(-1);
  if (!snapshot || snapshot.kind !== "complete") {
    throw new Error("Histogram trace did not complete.");
  }
  return snapshot;
}

describe("histogram counting parsing and validation", () => {
  it("parses the representative comma-separated input", () => {
    expect(parseExample("[4, 18, 26, 31, 51, 74, 75, 99, 26]")).toMatchObject({
      ok: true,
      value: [4, 18, 26, 31, 51, 74, 75, 99, 26],
    });
  });

  it.each([
    { result: parseExample("1, nope"), message: "not an integer" },
    { result: validateExample([]), message: "at least one" },
    {
      result: validateExample(Array.from({ length: 17 }, () => 0)),
      message: "at most 16",
    },
    { result: validateExample([-1]), message: "0 to 99" },
    { result: validateExample([100]), message: "0 to 99" },
    { result: validateExample([1.5]), message: "not an integer" },
  ])("rejects invalid syntax or bounds: $message", ({ result, message }) => {
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Invalid histogram example was accepted.");
    expect(result.error).toContain(message);
  });

  it("freezes validated input", () => {
    expect(Object.isFrozen(example([24, 25, 49, 50, 74, 75]))).toBe(true);
  });
});

describe("histogram counting trace", () => {
  it("counts each bin in the representative example", () => {
    expect(complete([4, 18, 26, 31, 51, 74, 75, 99, 26]).binCounts).toEqual([
      2, 3, 2, 2,
    ]);
  });

  it("reports the tallest bin in the representative example", () => {
    expect(complete([4, 18, 26, 31, 51, 74, 75, 99, 26]).tallestBinIds).toEqual(
      ["25-49"],
    );
  });

  it("records the processed values in the representative example", () => {
    expect(
      complete([4, 18, 26, 31, 51, 74, 75, 99, 26]).processedValues,
    ).toEqual([4, 18, 26, 31, 51, 74, 75, 99, 26]);
  });

  it("records the operation counts for the representative example", () => {
    expect(complete([4, 18, 26, 31, 51, 74, 75, 99, 26]).counts).toEqual({
      inspections: 9,
      classifications: 9,
      increments: 9,
    });
  });

  it("counts the smallest valid input", () => {
    expect(complete([0]).binCounts).toEqual([1, 0, 0, 0]);
  });

  it("classifies both sides of every exact bin boundary", () => {
    expect(complete([24, 25, 49, 50, 74, 75]).binCounts).toEqual([1, 2, 2, 1]);
  });

  it("returns all tallest bins in fixed-bin order when counts tie", () => {
    expect(complete([0, 25, 50, 75]).tallestBinIds).toEqual(
      HISTOGRAM_BINS.map(({ id }) => id),
    );
  });

  it("records the event sequence for each value", () => {
    const trace = generateTrace(example([24, 25]));

    expect(trace.map(({ kind }) => kind)).toEqual([
      "start",
      "inspect",
      "classify",
      "increment",
      "inspect",
      "classify",
      "increment",
      "complete",
    ]);
  });

  it("records an atomic increment transition", () => {
    const trace = generateTrace(example([24]));

    expect([trace[2], trace[3]]).toMatchObject([
      { kind: "classify", binCounts: [0, 0, 0, 0] },
      {
        kind: "increment",
        previousCount: 0,
        nextCount: 1,
        binCounts: [1, 0, 0, 0],
      },
    ]);
  });

  it("returns a deterministic trace", () => {
    const input = example([24, 25, 49, 50, 74, 75]);

    expect(generateTrace(input)).toEqual(generateTrace(input));
  });

  it("recursively freezes the generated trace", () => {
    const trace = generateTrace(example([24, 25, 49, 50, 74, 75]));

    expect(
      Object.isFrozen(trace) &&
        trace.every(
          (snapshot) =>
            Object.isFrozen(snapshot) &&
            Object.isFrozen(snapshot.values) &&
            Object.isFrozen(snapshot.bins) &&
            snapshot.bins.every((bin) => Object.isFrozen(bin)) &&
            Object.isFrozen(snapshot.binCounts) &&
            Object.isFrozen(snapshot.processedValues) &&
            Object.isFrozen(snapshot.tallestBinIds) &&
            Object.isFrozen(snapshot.counts),
        ),
    ).toBe(true);
  });

  it("keeps earlier snapshots independent from later increments", () => {
    const trace = generateTrace(example([0, 1]));

    expect(
      trace.flatMap((snapshot) =>
        snapshot.kind === "increment" ? [snapshot.binCounts] : [],
      ),
    ).toEqual([
      [1, 0, 0, 0],
      [2, 0, 0, 0],
    ]);
  });
});
