import { describe, expect, it } from "vitest";

import {
  DEFAULT_EXAMPLE,
  generateTrace,
  parseExample,
  validateExample,
  type Example,
  type TraceSnapshot,
} from "./algorithm";

function example(tokens: readonly string[]): Example {
  const result = validateExample(tokens);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function completeSnapshot(
  tokens: readonly string[],
): Extract<TraceSnapshot, { readonly kind: "complete" }> {
  const snapshot = generateTrace(example(tokens)).at(-1);
  if (!snapshot || snapshot.kind !== "complete") {
    throw new Error("Trace did not complete.");
  }
  return snapshot;
}

describe("frequency map validation", () => {
  it("rejects more than twelve words", () => {
    const result = parseExample("a,b,c,d,e,f,g,h,i,j,k,l,m");

    expect(result.ok ? "accepted" : result.error).toContain("at most 12 words");
  });

  it("accepts twelve words", () => {
    const input = Array.from({ length: 12 }, () => "a").join(",");

    expect(parseExample(input).ok).toBe(true);
  });

  it("rejects a word longer than twelve letters", () => {
    const result = parseExample("abcdefghijklm");

    expect(result.ok ? "accepted" : result.error).toContain(
      "at most 12 lowercase letters",
    );
  });

  it("accepts a twelve-letter word", () => {
    expect(parseExample("abcdefghijkl").ok).toBe(true);
  });
});

describe("frequency map trace", () => {
  it("counts the representative sample", () => {
    const complete = generateTrace(DEFAULT_EXAMPLE).at(-1);

    expect(complete?.kind === "complete" ? complete.result : null).toEqual([
      { key: "red", count: 3 },
      { key: "blue", count: 2 },
      { key: "gold", count: 1 },
    ]);
  });

  it("counts a single token", () => {
    expect(completeSnapshot(["solo"]).result).toEqual([
      { key: "solo", count: 1 },
    ]);
  });

  it("records atomic transitions", () => {
    expect(
      generateTrace(example(["red", "red"])).map((snapshot) => snapshot.kind),
    ).toEqual([
      "start",
      "inspect",
      "lookup",
      "insert",
      "inspect",
      "lookup",
      "increment",
      "complete",
    ]);
  });

  it("tracks operation counts", () => {
    expect(completeSnapshot(["red", "blue", "red"]).counts).toEqual({
      lookups: 3,
      inserts: 2,
      increments: 1,
    });
  });

  it("returns deeply equal traces for the same example", () => {
    const input = example(["red", "blue", "red"]);

    expect(generateTrace(input)).toEqual(generateTrace(input));
  });

  it("deep-freezes the generated trace", () => {
    expectDeeplyFrozen(generateTrace(example(["red", "blue", "red"])));
  });
});

function expectDeeplyFrozen(value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeeplyFrozen(nested);
}
