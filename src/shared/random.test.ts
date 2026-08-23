import { describe, expect, it } from "vitest";

import { shuffleCopy } from "./random";

describe("shuffleCopy", () => {
  it("returns an immutable copy", () => {
    const values = [1, 2, 3, 4];
    const shuffled = shuffleCopy(values, () => 0);

    expect(shuffled).not.toBe(values);
    expect(Object.isFrozen(shuffled)).toBe(true);
  });

  it("does not mutate the input", () => {
    const values = [1, 2, 3, 4];

    shuffleCopy(values, () => 0);

    expect(values).toEqual([1, 2, 3, 4]);
  });

  it("preserves every input value", () => {
    const values = [1, 2, 3, 4];

    expect([...shuffleCopy(values, () => 0)].sort()).toEqual(values);
  });

  it("uses the injected source to vary order", () => {
    const values = [1, 2, 3, 4];

    expect(shuffleCopy(values, () => 0)).not.toEqual(
      shuffleCopy(values, () => 0.999_999),
    );
  });
});
