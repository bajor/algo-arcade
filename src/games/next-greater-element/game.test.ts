import { describe, expect, it } from "vitest";

import { validateExample } from "./algorithm";
import { generateProceduralExample } from "./game";

const fixedRandom = (): number => 0.5;

describe("next greater element procedural examples", () => {
  it("uses the supplied random source to build an example", () => {
    expect(generateProceduralExample(fixedRandom)).toEqual([
      0, -2, 2, 0, 0, 0, 0,
    ]);
  });

  it.each([0, 0.999_999])(
    "keeps a generated example valid for random sample %s",
    (sample) => {
      const generated = generateProceduralExample(() => sample);

      expect(validateExample(generated).ok).toBe(true);
    },
  );

  it("changes an example when the random source immediately repeats", () => {
    const previous = generateProceduralExample(fixedRandom);

    expect(generateProceduralExample(fixedRandom, previous)).not.toEqual(
      previous,
    );
  });
});
