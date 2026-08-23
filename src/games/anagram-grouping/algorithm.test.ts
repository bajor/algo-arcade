import { describe, expect, it } from "vitest";

import {
  DEFAULT_EXAMPLE,
  formatGroups,
  generateTrace,
  parseExample,
  validateExample,
  type Example,
  type TraceSnapshot,
} from "./algorithm";

function example(words: readonly string[]): Example {
  const result = validateExample(words);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function completeSnapshot(
  words: readonly string[],
): Extract<TraceSnapshot, { readonly kind: "complete" }> {
  const snapshot = generateTrace(example(words)).at(-1);
  if (!snapshot || snapshot.kind !== "complete") {
    throw new Error("Trace did not complete.");
  }
  return snapshot;
}

describe("anagram grouping validation", () => {
  it.each([
    {
      input: "a,b,c,d,e,f,g,h,i,j,k",
      detail: "at most 10 words",
    },
    { input: "abcdefghijk", detail: "at most 10 lowercase letters" },
  ])("rejects '$input' with a precise error", ({ input, detail }) => {
    const result = parseExample(input);

    expect(result.ok ? "accepted" : result.error).toContain(detail);
  });

  it("accepts the maximum word count", () => {
    const input = Array.from({ length: 10 }, () => "a").join(",");

    expect(parseExample(input).ok).toBe(true);
  });

  it("accepts the maximum word length", () => {
    expect(parseExample("abcdefghij").ok).toBe(true);
  });
});

describe("anagram grouping trace", () => {
  it("groups the representative sample", () => {
    const complete = generateTrace(DEFAULT_EXAMPLE).at(-1);

    expect(
      complete?.kind === "complete" ? formatGroups(complete.result) : null,
    ).toBe("[[eat,tea,ate],[tan,nat],[bat]]");
  });

  it("groups a single word", () => {
    expect(completeSnapshot(["solo"]).result).toEqual([["solo"]]);
  });

  it("preserves duplicate words", () => {
    expect(completeSnapshot(["arc", "car", "arc"]).result).toEqual([
      ["arc", "car", "arc"],
    ]);
  });

  it("records a create transition atomically", () => {
    expect(
      generateTrace(example(["ab"])).map((snapshot) => snapshot.kind),
    ).toEqual([
      "start",
      "inspect",
      "build-signature",
      "lookup",
      "create-group",
      "complete",
    ]);
  });

  it("records an append transition atomically", () => {
    expect(
      generateTrace(example(["ab", "ba"]))
        .map((snapshot) => snapshot.kind)
        .slice(5),
    ).toEqual([
      "inspect",
      "build-signature",
      "lookup",
      "append-word",
      "complete",
    ]);
  });

  it("tracks operation counts", () => {
    expect(completeSnapshot(["ab", "ba", "cd"]).counts).toEqual({
      inspections: 3,
      signatures: 3,
      lookups: 3,
      groupsCreated: 2,
      appends: 1,
    });
  });

  it("returns deeply equal traces for the same example", () => {
    const input = example(["rat", "art", "tea"]);

    expect(generateTrace(input)).toEqual(generateTrace(input));
  });

  it("deep-freezes every trace snapshot", () => {
    expectDeeplyFrozen(generateTrace(example(["ab", "ba", "cd"])));
  });
});

function expectDeeplyFrozen(value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeeplyFrozen(nested);
}
