import { describe, expect, it } from "vitest";

import {
  generateTrace,
  parseExample,
  validateExample,
  type Example,
  type TraceSnapshot,
} from "./algorithm";

function example(phrase: string): Example {
  const result = validateExample(phrase);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

function completeSnapshot(
  phrase: string,
): Extract<TraceSnapshot, { readonly kind: "complete" }> {
  const snapshot = generateTrace(example(phrase)).at(-1);
  if (!snapshot || snapshot.kind !== "complete") {
    throw new Error("Trace did not complete.");
  }
  return snapshot;
}

describe("palindrome validation and trace", () => {
  it.each([
    { phrase: "Never odd or even", expected: true },
    { phrase: "A man, a plan, a canal: Panama!", expected: true },
    { phrase: "Mirror scan", expected: false },
    { phrase: "Z", expected: true },
    { phrase: "12-3-21", expected: true },
  ])("evaluates '$phrase'", ({ phrase, expected }) => {
    expect(completeSnapshot(phrase).verdict).toBe(expected);
  });

  it("preserves the raw printable phrase", () => {
    const phrase = "  A,b A!  ";

    expect(parseExample(phrase)).toMatchObject({ ok: true, value: phrase });
  });

  it.each([
    { phrase: "---", message: "letter or digit" },
    { phrase: "", message: "at least 1" },
    { phrase: "a".repeat(49), message: "at most 48" },
    { phrase: "valid\n", message: "printable ASCII" },
  ])("rejects invalid phrase input", ({ phrase, message }) => {
    const result = validateExample(phrase);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Invalid phrase was accepted.");
    }
    expect(result.error).toContain(message);
  });

  it("skips the left character first when both pointers hold punctuation", () => {
    const firstInspection = generateTrace(example("!a?")).find(
      (snapshot) => snapshot.kind === "inspect",
    );

    expect(firstInspection).toMatchObject({
      decision: "skip-left",
      leftIndex: 0,
      rightIndex: 2,
    });
  });

  it("records an outer match before a late inner mismatch", () => {
    const trace = generateTrace(example("abx,a"));

    expect(trace.map(({ kind }) => kind)).toEqual([
      "start",
      "inspect",
      "match",
      "inspect",
      "skip-right",
      "inspect",
      "mismatch",
      "complete",
    ]);
  });

  it("counts each recorded operation", () => {
    expect(completeSnapshot("abx,a").counts).toEqual({
      inspections: 3,
      comparisons: 2,
      skips: 1,
      matches: 1,
    });
  });

  it("returns the same trace for the same example", () => {
    const input = example("!Aa?");
    const firstTrace = generateTrace(input);
    const secondTrace = generateTrace(input);

    expect(firstTrace).toEqual(secondTrace);
  });

  it("deeply freezes every snapshot", () => {
    const trace = generateTrace(example("!Aa?"));

    expect(Object.isFrozen(trace)).toBe(true);
    expect(
      trace.every(
        (snapshot) =>
          Object.isFrozen(snapshot) &&
          Object.isFrozen(snapshot.chars) &&
          Object.isFrozen(snapshot.ignoredIndices) &&
          Object.isFrozen(snapshot.matchedIndexPairs) &&
          snapshot.matchedIndexPairs.every((pair) => Object.isFrozen(pair)) &&
          Object.isFrozen(snapshot.counts),
      ),
    ).toBe(true);
  });

  it("keeps earlier ignored indices independent from later updates", () => {
    const trace = generateTrace(example("!Aa?"));
    const start = trace[0];
    const complete = trace.at(-1);

    expect(start?.ignoredIndices).toEqual([]);
    expect(complete?.ignoredIndices).toEqual([0, 3]);
  });

  it("keeps earlier matched pairs independent from later updates", () => {
    const trace = generateTrace(example("!Aa?"));
    const start = trace[0];
    const complete = trace.at(-1);

    expect(start?.matchedIndexPairs).toEqual([]);
    expect(complete?.matchedIndexPairs).toEqual([[1, 2]]);
  });
});
