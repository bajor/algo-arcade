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

export type InspectDecision = "skip-left" | "skip-right" | "match" | "mismatch";

export type PseudocodeLine =
  | "initialize"
  | "inspect-left"
  | "inspect-right"
  | "compare"
  | "skip-left"
  | "skip-right"
  | "match"
  | "mismatch"
  | "center"
  | "complete";

export interface OperationCounts {
  readonly inspections: number;
  readonly comparisons: number;
  readonly skips: number;
  readonly matches: number;
}

export type MatchedIndexPair = readonly [leftIndex: number, rightIndex: number];

interface SnapshotState {
  readonly phrase: Example;
  readonly chars: readonly string[];
  readonly left: number;
  readonly right: number;
  readonly ignoredIndices: readonly number[];
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
  | { readonly kind: "skip-left"; readonly skippedIndex: number }
  | { readonly kind: "skip-right"; readonly skippedIndex: number }
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
  ignoredIndices: number[];
  matchedIndexPairs: MatchedIndexPair[];
  verdict: boolean | null;
  counts: {
    inspections: number;
    comparisons: number;
    skips: number;
    matches: number;
  };
}

export const DEFAULT_EXAMPLE = createExample("Never odd or even");

export function parseExample(raw: string): ParseResult {
  return validateExample(raw);
}

export function validateExample(phrase: string): ParseResult {
  if (phrase.length < EXAMPLE_LIMITS.minCharacters) {
    return failure("Enter a phrase with at least 1 character.");
  }

  if (phrase.length > EXAMPLE_LIMITS.maxCharacters) {
    return failure(
      `Use at most ${String(EXAMPLE_LIMITS.maxCharacters)} characters so every step stays visible.`,
    );
  }

  for (let index = 0; index < phrase.length; index += 1) {
    const codeUnit = phrase.charCodeAt(index);
    if (codeUnit < 32 || codeUnit > 126) {
      return failure(
        `Character ${String(index + 1)} is not printable ASCII. Use only characters from space (32) through ~ (126).`,
      );
    }
  }

  if (![...phrase].some(isAsciiAlphanumeric)) {
    return failure(
      "Include at least one ASCII letter or digit (A-Z, a-z, or 0-9).",
    );
  }

  return { ok: true, value: createExample(phrase) };
}

export function generateTrace(example: Example): readonly TraceSnapshot[] {
  const chars = [...example];
  const state: MutableState = {
    left: 0,
    right: chars.length - 1,
    ignoredIndices: [],
    matchedIndexPairs: [],
    verdict: null,
    counts: { inspections: 0, comparisons: 0, skips: 0, matches: 0 },
  };
  const trace: TraceSnapshot[] = [
    record(
      example,
      chars,
      state,
      { kind: "start" },
      "initialize",
      "Place one pointer at each end of the original phrase.",
    ),
  ];

  while (state.left <= state.right) {
    const leftCharacter = chars[state.left];
    const rightCharacter = chars[state.right];
    if (leftCharacter === undefined || rightCharacter === undefined) {
      throw new Error("Validated example produced an impossible trace state.");
    }

    if (state.left === state.right && isAsciiAlphanumeric(leftCharacter)) {
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
    if (decision === "match" || decision === "mismatch") {
      state.counts.comparisons += 1;
    }
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
        inspectionLine(decision),
        inspectionExplanation(
          decision,
          leftCharacter,
          rightCharacter,
          state.left,
          state.right,
        ),
      ),
    );

    if (decision === "skip-left") {
      const skippedIndex = state.left;
      state.ignoredIndices.push(skippedIndex);
      state.left += 1;
      state.counts.skips += 1;
      trace.push(
        record(
          example,
          chars,
          state,
          { kind: "skip-left", skippedIndex },
          "skip-left",
          `Ignore the non-alphanumeric character at index ${String(skippedIndex)} and move the left pointer right.`,
        ),
      );
      continue;
    }

    if (decision === "skip-right") {
      const skippedIndex = state.right;
      state.ignoredIndices.push(skippedIndex);
      state.right -= 1;
      state.counts.skips += 1;
      trace.push(
        record(
          example,
          chars,
          state,
          { kind: "skip-right", skippedIndex },
          "skip-right",
          `Ignore the non-alphanumeric character at index ${String(skippedIndex)} and move the right pointer left.`,
        ),
      );
      continue;
    }

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
          `The characters at indices ${String(leftIndex)} and ${String(rightIndex)} match without ASCII case, so move both pointers inward.`,
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
        `The characters at indices ${String(leftIndex)} and ${String(rightIndex)} differ without ASCII case, so the phrase is not a palindrome.`,
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
        ? "The pointers reached the center or crossed, so the phrase is a palindrome."
        : "A mismatched pair proves that the phrase is not a palindrome.",
    ),
  );

  return Object.freeze(trace);
}

function inspect(
  leftCharacter: string,
  rightCharacter: string,
): InspectDecision {
  if (!isAsciiAlphanumeric(leftCharacter)) {
    return "skip-left";
  }
  if (!isAsciiAlphanumeric(rightCharacter)) {
    return "skip-right";
  }
  return normalizeAscii(leftCharacter) === normalizeAscii(rightCharacter)
    ? "match"
    : "mismatch";
}

function inspectionLine(decision: InspectDecision): PseudocodeLine {
  if (decision === "skip-left") {
    return "inspect-left";
  }
  if (decision === "skip-right") {
    return "inspect-right";
  }
  return "compare";
}

function inspectionExplanation(
  decision: InspectDecision,
  leftCharacter: string,
  rightCharacter: string,
  leftIndex: number,
  rightIndex: number,
): string {
  if (decision === "skip-left") {
    return `"${leftCharacter}" at index ${String(leftIndex)} is not a letter or digit, so inspect the left side first.`;
  }
  if (decision === "skip-right") {
    return `"${rightCharacter}" at index ${String(rightIndex)} is not a letter or digit, so skip it next.`;
  }
  const relationship = decision === "match" ? "match" : "do not match";
  return `Compare "${leftCharacter}" at index ${String(leftIndex)} with "${rightCharacter}" at index ${String(rightIndex)}: they ${relationship} without ASCII case.`;
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
    ignoredIndices: Object.freeze([...state.ignoredIndices]),
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

function isAsciiAlphanumeric(character: string): boolean {
  return /^[A-Za-z0-9]$/.test(character);
}

function normalizeAscii(character: string): string {
  return character.toLowerCase();
}

function createExample(phrase: string): Example {
  return phrase as Example;
}

function failure(error: string): ParseResult {
  return { ok: false, error };
}
