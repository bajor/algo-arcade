import { describe, expect, it } from "vitest";

import {
  DEFAULT_EXAMPLE,
  generateTrace,
  parseExample,
  validateExample,
  type Example,
  type TraceSnapshot,
  type UniqueSubstringResult,
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

function finalResult(value: string): UniqueSubstringResult {
  return completeSnapshot(value).result;
}

describe("unique substring trace", () => {
  it.each([
    {
      label: "default",
      value: DEFAULT_EXAMPLE,
      expected: { substring: "abc", start: 0, endExclusive: 3, length: 3 },
    },
    {
      label: "all-same",
      value: "bbbbb",
      expected: { substring: "b", start: 0, endExclusive: 1, length: 1 },
    },
    {
      label: "already unique",
      value: "abc123",
      expected: {
        substring: "abc123",
        start: 0,
        endExclusive: 6,
        length: 6,
      },
    },
    {
      label: "alphanumeric",
      value: "a1b2a1c",
      expected: { substring: "b2a1c", start: 2, endExclusive: 7, length: 5 },
    },
  ])("finds the $label result", ({ value, expected }) => {
    expect(finalResult(value)).toEqual(expected);
  });

  it("tracks each operation category", () => {
    expect(completeSnapshot(DEFAULT_EXAMPLE).counts).toEqual({
      inspections: 15,
      expansions: 8,
      shrinks: 7,
      bestUpdates: 3,
    });
  });

  it.each([
    { raw: "", message: "at least one" },
    { raw: "abcdefghijklmnopq", message: "at most 16" },
    { raw: "Abc", message: 'Character "A" at position 1' },
    { raw: "ab c", message: 'Character " " at position 3' },
  ])("rejects invalid input '$raw' precisely", ({ raw, message }) => {
    const result = parseExample(raw);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Invalid input was accepted.");
    }
    expect(result.error).toContain(message);
  });

  it.each(["a", "abcdefghijklmnop", "abc123"])(
    "accepts valid input '%s' without normalization",
    (value) => {
      expect(parseExample(value)).toMatchObject({ ok: true, value });
    },
  );

  it("records repeated duplicate removal as atomic decisions", () => {
    const snapshots = generateTrace(example("abcbd"))
      .filter(
        (snapshot) =>
          (snapshot.kind === "inspect" && snapshot.inspectedIndex === 3) ||
          (snapshot.kind === "shrink" && snapshot.incomingIndex === 3) ||
          (snapshot.kind === "expand" && snapshot.addedIndex === 3),
      )
      .map((snapshot) => {
        if (snapshot.kind === "inspect") {
          return `${snapshot.kind}:${snapshot.decision}`;
        }
        if (snapshot.kind === "shrink") {
          return `${snapshot.kind}:${String(snapshot.removedIndex)}`;
        }
        return snapshot.kind;
      });

    expect(snapshots).toEqual([
      "inspect:shrink",
      "shrink:0",
      "inspect:shrink",
      "shrink:1",
      "inspect:expand",
      "expand",
    ]);
  });

  it("returns deeply equal traces for the same example", () => {
    const input = example("a1b2a1c");

    expect(generateTrace(input)).toEqual(generateTrace(input));
  });

  it("deep-freezes trace state", () => {
    const trace = generateTrace(example("abca"));
    const bestSnapshot = trace.find((snapshot) => snapshot.kind === "best");

    expect(Object.isFrozen(trace)).toBe(true);
    expect(trace.every(Object.isFrozen)).toBe(true);
    expect(trace.every((snapshot) => Object.isFrozen(snapshot.counts))).toBe(
      true,
    );
    expect(
      trace.every((snapshot) => Object.isFrozen(snapshot.activeCharacters)),
    ).toBe(true);
    expect(Object.isFrozen(bestSnapshot?.best)).toBe(true);
    expect(Object.isFrozen(bestSnapshot?.candidate)).toBe(true);
  });

  it("keeps earlier snapshot state independent from later updates", () => {
    const trace = generateTrace(example("abca"));

    expect(trace[0]?.activeCharacters).toEqual([]);
    expect(trace[0]?.best).toEqual({
      substring: "",
      start: 0,
      endExclusive: 0,
      length: 0,
    });
    expect(trace[0]?.best).not.toBe(trace.at(-1)?.best);
  });
});
