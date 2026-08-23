import { isLowercaseAsciiLetter } from "../../shared/lowercase-ascii";

const EXAMPLE_BRAND: unique symbol = Symbol("PalindromeExample");

export const EXAMPLE_LIMITS = Object.freeze({
  minCharacters: 1,
  maxCharacters: 48,
});

export type Example = string & {
  readonly [EXAMPLE_BRAND]: true;
};

export type ParseResult =
  | { readonly ok: true; readonly value: Example }
  | { readonly ok: false; readonly error: string };

export type InspectDecision = "match" | "mismatch";

export type PseudocodeLine =
  "initialize" | "compare" | "match" | "mismatch" | "center" | "complete";

export interface OperationCounts {
  readonly inspections: number;
  readonly comparisons: number;
  readonly matches: number;
}

export type MatchedIndexPair = readonly [leftIndex: number, rightIndex: number];

interface SnapshotState {
  readonly phrase: Example;
  readonly chars: readonly string[];
  readonly left: number;
  readonly right: number;
  readonly matchedIndexPairs: readonly MatchedIndexPair[];
  readonly verdict: boolean | null;
  readonly counts: OperationCounts;
  readonly line: PseudocodeLine;
  readonly explanation: string;
}

type SnapshotEvent =
  | { readonly kind: "start" }
  | {
      readonly kind: "inspect";
      readonly decision: InspectDecision;
      readonly leftIndex: number;
      readonly rightIndex: number;
    }
  | {
      readonly kind: "match";
      readonly leftIndex: number;
      readonly rightIndex: number;
    }
  | {
      readonly kind: "mismatch";
      readonly leftIndex: number;
      readonly rightIndex: number;
    }
  | { readonly kind: "center"; readonly centerIndex: number }
  | { readonly kind: "complete" };

export type TraceSnapshot = Readonly<SnapshotState & SnapshotEvent>;

interface MutableState {
  left: number;
  right: number;
  matchedIndexPairs: MatchedIndexPair[];
  verdict: boolean | null;
  counts: {
    inspections: number;
    comparisons: number;
    matches: number;
  };
}

export const DEFAULT_EXAMPLE = createExample("racecar");

export function parseExample(raw: string): ParseResult {
  return validateExample(raw);
}

export function validateExample(value: string): ParseResult {
  if (value.length < EXAMPLE_LIMITS.minCharacters) {
    return failure("Enter at least one lowercase ASCII letter.");
  }

  if (value.length > EXAMPLE_LIMITS.maxCharacters) {
    return failure(
      `Use at most ${String(EXAMPLE_LIMITS.maxCharacters)} characters so every step stays visible.`,
    );
  }

  const characters = Array.from(value);
  const invalidIndex = characters.findIndex(
    (character) => !isLowercaseAsciiLetter(character),
  );
  if (invalidIndex !== -1) {
    return failure(
      `Character ${JSON.stringify(characters[invalidIndex])} at position ${String(invalidIndex + 1)} is invalid. Use only lowercase ASCII letters (a-z).`,
    );
  }

  return { ok: true, value: createExample(value) };
}

export function generateTrace(example: Example): readonly TraceSnapshot[] {
  const chars = [...example];
  const state: MutableState = {
    left: 0,
    right: chars.length - 1,
    matchedIndexPairs: [],
    verdict: null,
    counts: { inspections: 0, comparisons: 0, matches: 0 },
  };
  const trace: TraceSnapshot[] = [
    record(
      example,
      chars,
      state,
      { kind: "start" },
      "initialize",
      "Place one pointer at each end of the string.",
    ),
  ];

  while (state.left <= state.right) {
    const leftCharacter = chars[state.left];
    const rightCharacter = chars[state.right];
    if (leftCharacter === undefined || rightCharacter === undefined) {
      throw new Error("Validated example produced an impossible trace state.");
    }

    if (state.left === state.right) {
      state.counts.inspections += 1;
      trace.push(
        record(
          example,
          chars,
          state,
          { kind: "center", centerIndex: state.left },
          "center",
          `Index ${String(state.left)} is the unmatched center, so it cannot break the palindrome.`,
        ),
      );
      state.left += 1;
      state.right -= 1;
      break;
    }

    const decision = inspect(leftCharacter, rightCharacter);
    state.counts.inspections += 1;
    state.counts.comparisons += 1;
    trace.push(
      record(
        example,
        chars,
        state,
        {
          kind: "inspect",
          decision,
          leftIndex: state.left,
          rightIndex: state.right,
        },
        "compare",
        inspectionExplanation(
          decision,
          leftCharacter,
          rightCharacter,
          state.left,
          state.right,
        ),
      ),
    );

    const leftIndex = state.left;
    const rightIndex = state.right;
    if (decision === "match") {
      state.matchedIndexPairs.push(Object.freeze([leftIndex, rightIndex]));
      state.left += 1;
      state.right -= 1;
      state.counts.matches += 1;
      trace.push(
        record(
          example,
          chars,
          state,
          { kind: "match", leftIndex, rightIndex },
          "match",
          `The characters at indices ${String(leftIndex)} and ${String(rightIndex)} match exactly, so move both pointers inward.`,
        ),
      );
      continue;
    }

    state.verdict = false;
    trace.push(
      record(
        example,
        chars,
        state,
        { kind: "mismatch", leftIndex, rightIndex },
        "mismatch",
        `The characters at indices ${String(leftIndex)} and ${String(rightIndex)} differ, so the string is not a palindrome.`,
      ),
    );
    break;
  }

  if (state.verdict === null) {
    state.verdict = true;
  }
  trace.push(
    record(
      example,
      chars,
      state,
      { kind: "complete" },
      "complete",
      state.verdict
        ? "The pointers reached the center or crossed, so the string is a palindrome."
        : "A mismatched pair proves that the string is not a palindrome.",
    ),
  );

  return Object.freeze(trace);
}

function inspect(
  leftCharacter: string,
  rightCharacter: string,
): InspectDecision {
  return leftCharacter === rightCharacter ? "match" : "mismatch";
}

function inspectionExplanation(
  decision: InspectDecision,
  leftCharacter: string,
  rightCharacter: string,
  leftIndex: number,
  rightIndex: number,
): string {
  const relationship = decision === "match" ? "match" : "do not match";
  return `Compare "${leftCharacter}" at index ${String(leftIndex)} with "${rightCharacter}" at index ${String(rightIndex)}: they ${relationship} exactly.`;
}

function record(
  phrase: Example,
  chars: readonly string[],
  state: MutableState,
  event: SnapshotEvent,
  line: PseudocodeLine,
  explanation: string,
): TraceSnapshot {
  return Object.freeze({
    ...event,
    phrase,
    chars: Object.freeze([...chars]),
    left: state.left,
    right: state.right,
    matchedIndexPairs: Object.freeze(
      state.matchedIndexPairs.map<MatchedIndexPair>(([leftIndex, rightIndex]) =>
        Object.freeze([leftIndex, rightIndex]),
      ),
    ),
    verdict: state.verdict,
    counts: Object.freeze({ ...state.counts }),
    line,
    explanation,
  });
}

function createExample(value: string): Example {
  return value as Example;
}

function failure(error: string): ParseResult {
  return { ok: false, error };
}
