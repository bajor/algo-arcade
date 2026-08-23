import { describe, expect, it } from "vitest";

import { parseLowercaseWordList } from "./lowercase-word-list";

describe("parseLowercaseWordList", () => {
  it("trims whitespace around comma-delimited lowercase words", () => {
    expect(parseLowercaseWordList("  eat, tea ,tan  ")).toEqual({
      ok: true,
      words: ["eat", "tea", "tan"],
    });
  });

  it("returns an immutable word list", () => {
    const result = parseLowercaseWordList("eat, tea");

    expect(result.ok && Object.isFrozen(result.words)).toBe(true);
  });

  it("rejects empty input", () => {
    expect(parseLowercaseWordList("   ")).toEqual({
      ok: false,
      error: "Enter at least one lowercase word.",
    });
  });

  it.each([
    { input: ",eat", entry: 1 },
    { input: "eat,,tea", entry: 2 },
    { input: "eat, ", entry: 2 },
  ])("identifies empty entry $entry in '$input'", ({ input, entry }) => {
    expect(parseLowercaseWordList(input)).toEqual({
      ok: false,
      error: `Entry ${String(entry)} is empty. Enter a lowercase word between every pair of commas.`,
    });
  });

  it.each([
    {
      input: "eat, Tea",
      detail: 'Character "T" at position 1 in token "Tea"',
    },
    {
      input: "eat, t3a",
      detail: 'Character "3" at position 2 in token "t3a"',
    },
    {
      input: "eat tea",
      detail: 'Character " " at position 4 in token "eat tea"',
    },
  ])("identifies an invalid character in '$input'", ({ input, detail }) => {
    const result = parseLowercaseWordList(input);

    expect(result.ok ? "accepted" : result.error).toContain(detail);
  });
});
