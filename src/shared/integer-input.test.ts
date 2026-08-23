import { describe, expect, it } from "vitest";

import { parseIntegerList } from "./integer-input";

describe("parseIntegerList", () => {
  it.each(["1,,2", ",1,2", "1,2,", "[1,2,]"])(
    "rejects a missing comma-delimited value in %s",
    (raw) => {
      expect(parseIntegerList(raw, "1, 2")).toEqual({
        ok: false,
        error: "Enter an integer between every pair of commas.",
      });
    },
  );
});
