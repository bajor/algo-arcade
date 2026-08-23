import { describe, expect, it } from "vitest";

import {
  generateTrace,
  parseExample,
  validateExample,
  type Example,
  type Pair,
} from "./algorithm";

function example(values: readonly number[], target: number): Example {
  const result = validateExample(values, target);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

function finalPairs(
  values: readonly number[],
  target: number,
): readonly Pair[] {
  const complete = generateTrace(example(values, target)).at(-1);
  if (!complete || complete.kind !== "complete") {
    throw new Error("Trace did not complete.");
  }
  return complete.pairs;
}

describe("pair sum parsing and validation", () => {
  it("parses the documented values-target syntax", () => {
    expect(parseExample("[-4, -1, -1, 0, 1, 2, 2, 5, 10] | 4")).toMatchObject({
      ok: true,
      value: { values: [-4, -1, -1, 0, 1, 2, 2, 5, 10], target: 4 },
    });
  });

  it("reports the first value that breaks nondecreasing order", () => {
    const result = validateExample([-2, 1, 0, 3], 1);

    expect(result).toMatchObject({ ok: false });
    if (result.ok) {
      throw new Error("An unsorted example was accepted.");
    }
    expect(result.error).toContain("Position 3");
  });

  it.each([
    { result: parseExample("1, 2"), message: "exactly one" },
    { result: parseExample("1, nope | 3"), message: "not an integer" },
    { result: parseExample("1, 2 | 1.5"), message: "integer target" },
    { result: validateExample([1], 1), message: "at least 2" },
    {
      result: validateExample(
        Array.from({ length: 13 }, (_, index) => index),
        1,
      ),
      message: "at most 12",
    },
    { result: validateExample([-100, 0], 0), message: "-99 to 99" },
    { result: validateExample([0, 100], 0), message: "-99 to 99" },
    { result: validateExample([0, 1], -199), message: "-198 to 198" },
    { result: validateExample([0, 1], 199), message: "-198 to 198" },
  ])("rejects invalid syntax or bounds: $message", ({ result, message }) => {
    expect(result).toMatchObject({ ok: false });
    if (result.ok) {
      throw new Error("An invalid example was accepted.");
    }
    expect(result.error).toContain(message);
  });
});

describe("pair sum trace", () => {
  it.each([
    {
      name: "the documented example",
      values: [-4, -1, -1, 0, 1, 2, 2, 5, 10],
      target: 4,
      expected: [
        { leftValue: -1, rightValue: 5, leftIndex: 1, rightIndex: 7 },
        { leftValue: 2, rightValue: 2, leftIndex: 5, rightIndex: 6 },
      ],
    },
    {
      name: "no match",
      values: [-3, 0, 4],
      target: 9,
      expected: [],
    },
    {
      name: "a same-value pair at distinct indices",
      values: [2, 2, 2],
      target: 4,
      expected: [{ leftValue: 2, rightValue: 2, leftIndex: 0, rightIndex: 2 }],
    },
    {
      name: "the smallest valid input",
      values: [-99, 99],
      target: 0,
      expected: [
        { leftValue: -99, rightValue: 99, leftIndex: 0, rightIndex: 1 },
      ],
    },
  ])("returns canonical pairs for $name", ({ values, target, expected }) => {
    expect(finalPairs(values, target)).toEqual(expected);
  });

  it("records the exact decision for each comparison", () => {
    const trace = generateTrace(example([-4, -1, -1, 0, 1, 2, 2, 5, 10], 4));

    expect(
      trace
        .filter((snapshot) => snapshot.kind === "compare")
        .map((snapshot) => snapshot.decision),
    ).toEqual([
      "move-right",
      "move-left",
      "record-pair",
      "move-left",
      "move-left",
      "record-pair",
    ]);
  });

  it("records one atomic snapshot per pointer move", () => {
    const trace = generateTrace(example([-4, -1, -1, 0, 1, 2, 2, 5, 10], 4));

    expect(
      trace.flatMap((snapshot) =>
        snapshot.kind === "move-left" || snapshot.kind === "move-right"
          ? [
              {
                kind: snapshot.kind,
                from: snapshot.fromIndex,
                to: snapshot.toIndex,
                reason: snapshot.reason,
              },
            ]
          : [],
      ),
    ).toEqual([
      { kind: "move-right", from: 8, to: 7, reason: "sum-too-large" },
      { kind: "move-left", from: 0, to: 1, reason: "sum-too-small" },
      { kind: "move-left", from: 1, to: 2, reason: "matched-value" },
      { kind: "move-left", from: 2, to: 3, reason: "duplicate-skip" },
      { kind: "move-right", from: 7, to: 6, reason: "matched-value" },
      { kind: "move-left", from: 3, to: 4, reason: "sum-too-small" },
      { kind: "move-left", from: 4, to: 5, reason: "sum-too-small" },
      { kind: "move-left", from: 5, to: 6, reason: "matched-value" },
    ]);
  });

  it("keeps cumulative operation counts", () => {
    const trace = generateTrace(example([-4, -1, -1, 0, 1, 2, 2, 5, 10], 4));

    expect(trace.at(-1)?.counts).toEqual({
      comparisons: 6,
      leftMoves: 6,
      rightMoves: 2,
      pairs: 2,
    });
  });

  it("returns deeply equal traces for the same example", () => {
    const input = example([-2, -1, -1, 3, 4], 2);
    const first = generateTrace(input);
    const second = generateTrace(input);

    expect(first).toEqual(second);
  });

  it("deeply freezes the validated example", () => {
    const input = example([-2, -1, -1, 3, 4], 2);

    expect(Object.isFrozen(input)).toBe(true);
    expect(Object.isFrozen(input.values)).toBe(true);
  });

  it("deeply freezes the generated trace", () => {
    const trace = generateTrace(example([-2, -1, -1, 3, 4], 2));

    expect(Object.isFrozen(trace)).toBe(true);
    expect(trace.every((snapshot) => Object.isFrozen(snapshot))).toBe(true);
    expect(trace.every((snapshot) => Object.isFrozen(snapshot.values))).toBe(
      true,
    );
    expect(trace.every((snapshot) => Object.isFrozen(snapshot.pairs))).toBe(
      true,
    );
    expect(trace.every((snapshot) => Object.isFrozen(snapshot.counts))).toBe(
      true,
    );
    expect(Object.isFrozen(trace.at(-1)?.pairs[0])).toBe(true);
  });

  it("keeps earlier pair snapshots independent from later updates", () => {
    const trace = generateTrace(example([-2, -1, -1, 3, 4], 2));
    const firstRecord = trace.find(
      (snapshot) => snapshot.kind === "record-pair",
    );

    expect(firstRecord?.pairs).toHaveLength(1);
    expect(trace.at(-1)?.pairs).toHaveLength(2);
  });
});
