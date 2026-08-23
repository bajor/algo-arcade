const EXAMPLE_BRAND: unique symbol = Symbol("UniqueSubstringExample");

export const EXAMPLE_LIMITS = Object.freeze({
  minLength: 1,
  maxLength: 16,
});

export type Example = string & {
  readonly [EXAMPLE_BRAND]: true;
};

export type ParseResult =
  | { readonly ok: true; readonly value: Example }
  | { readonly ok: false; readonly error: string };

export type PseudocodeLine =
  "initialize" | "inspect" | "shrink" | "expand" | "evaluate-best" | "complete";

export interface UniqueSubstringResult {
  readonly substring: string;
  readonly start: number;
  readonly endExclusive: number;
  readonly length: number;
}

export interface OperationCounts {
  readonly inspections: number;
  readonly expansions: number;
  readonly shrinks: number;
  readonly bestUpdates: number;
}

interface SnapshotState {
  readonly example: Example;
  readonly left: number;
  readonly right: number;
  readonly incomingIndex: number | null;
  readonly activeCharacters: readonly string[];
  readonly best: UniqueSubstringResult;
  readonly counts: OperationCounts;
  readonly line: PseudocodeLine;
  readonly explanation: string;
}

type SnapshotEvent =
  | { readonly kind: "start" }
  | {
      readonly kind: "inspect";
      readonly inspectedIndex: number;
      readonly character: string;
      readonly decision: "expand" | "shrink";
    }
  | {
      readonly kind: "expand";
      readonly addedIndex: number;
      readonly character: string;
    }
  | {
      readonly kind: "shrink";
      readonly removedIndex: number;
      readonly character: string;
    }
  | {
      readonly kind: "best";
      readonly candidate: UniqueSubstringResult;
      readonly updated: boolean;
    }
  | { readonly kind: "complete"; readonly result: UniqueSubstringResult };

export type TraceSnapshot = Readonly<SnapshotState & SnapshotEvent>;

interface MutableState {
  left: number;
  right: number;
  activeCharacters: Set<string>;
  best: UniqueSubstringResult;
  counts: {
    inspections: number;
    expansions: number;
    shrinks: number;
    bestUpdates: number;
  };
}

export const DEFAULT_EXAMPLE = createExample("abcabcbb");

export function parseExample(raw: string): ParseResult {
  return validateExample(raw);
}

export function validateExample(value: string): ParseResult {
  if (value.length < EXAMPLE_LIMITS.minLength) {
    return failure("Enter at least one lowercase ASCII letter or digit.");
  }

  if (value.length > EXAMPLE_LIMITS.maxLength) {
    return failure(
      `Use at most ${String(EXAMPLE_LIMITS.maxLength)} characters so every step stays visible.`,
    );
  }

  const characters = Array.from(value);
  const invalidIndex = characters.findIndex(
    (character) => !/[a-z0-9]/.test(character),
  );
  if (invalidIndex !== -1) {
    const invalidCharacter = characters[invalidIndex];
    return failure(
      `Character ${JSON.stringify(invalidCharacter)} at position ${String(invalidIndex + 1)} is invalid. Use only lowercase ASCII letters (a-z) and digits (0-9).`,
    );
  }

  return { ok: true, value: createExample(value) };
}

export function generateTrace(example: Example): readonly TraceSnapshot[] {
  const state: MutableState = {
    left: 0,
    right: 0,
    activeCharacters: new Set(),
    best: createResult(example, 0, 0),
    counts: {
      inspections: 0,
      expansions: 0,
      shrinks: 0,
      bestUpdates: 0,
    },
  };
  const trace: TraceSnapshot[] = [
    record(
      example,
      state,
      { kind: "start" },
      "initialize",
      "Start with an empty half-open window [0, 0) and no best substring.",
    ),
  ];

  while (state.right < example.length) {
    const incomingIndex = state.right;
    const incomingCharacter = characterAt(example, incomingIndex);
    const decision = state.activeCharacters.has(incomingCharacter)
      ? "shrink"
      : "expand";

    state.counts.inspections += 1;
    trace.push(
      record(
        example,
        state,
        {
          kind: "inspect",
          inspectedIndex: incomingIndex,
          character: incomingCharacter,
          decision,
        },
        "inspect",
        decision === "shrink"
          ? `${JSON.stringify(incomingCharacter)} is already in [${String(state.left)}, ${String(state.right)}), so remove one character from the left.`
          : `${JSON.stringify(incomingCharacter)} is not in [${String(state.left)}, ${String(state.right)}), so expand the window.`,
      ),
    );

    if (decision === "shrink") {
      const removedIndex = state.left;
      const removedCharacter = characterAt(example, removedIndex);
      state.activeCharacters.delete(removedCharacter);
      state.left += 1;
      state.counts.shrinks += 1;
      trace.push(
        record(
          example,
          state,
          {
            kind: "shrink",
            removedIndex,
            character: removedCharacter,
          },
          "shrink",
          `Remove ${JSON.stringify(removedCharacter)} at index ${String(removedIndex)}. The window is now [${String(state.left)}, ${String(state.right)}).`,
        ),
      );
      continue;
    }

    state.activeCharacters.add(incomingCharacter);
    state.right += 1;
    state.counts.expansions += 1;
    trace.push(
      record(
        example,
        state,
        {
          kind: "expand",
          addedIndex: incomingIndex,
          character: incomingCharacter,
        },
        "expand",
        `Add ${JSON.stringify(incomingCharacter)} at index ${String(incomingIndex)}. The window expands to [${String(state.left)}, ${String(state.right)}).`,
      ),
    );

    const candidate = createResult(example, state.left, state.right);
    const updated = candidate.length > state.best.length;
    if (updated) {
      state.best = candidate;
      state.counts.bestUpdates += 1;
    }
    trace.push(
      record(
        example,
        state,
        { kind: "best", candidate, updated },
        "evaluate-best",
        updated
          ? `${JSON.stringify(candidate.substring)} has length ${String(candidate.length)}, so it becomes the new best substring.`
          : `${JSON.stringify(candidate.substring)} does not beat the earliest best length ${String(state.best.length)}, so the best substring stays ${JSON.stringify(state.best.substring)}.`,
      ),
    );
  }

  const result = cloneResult(state.best);
  trace.push(
    record(
      example,
      state,
      { kind: "complete", result },
      "complete",
      `The earliest longest substring is ${JSON.stringify(result.substring)} at [${String(result.start)}, ${String(result.endExclusive)}), with length ${String(result.length)}.`,
    ),
  );

  return Object.freeze(trace);
}

function record(
  example: Example,
  state: MutableState,
  event: SnapshotEvent,
  line: PseudocodeLine,
  explanation: string,
): TraceSnapshot {
  return Object.freeze({
    ...event,
    example,
    left: state.left,
    right: state.right,
    incomingIndex: state.right < example.length ? state.right : null,
    activeCharacters: Object.freeze(
      Array.from(example.slice(state.left, state.right)),
    ),
    best: cloneResult(state.best),
    counts: Object.freeze({ ...state.counts }),
    line,
    explanation,
  });
}

function createExample(value: string): Example {
  return value as Example;
}

function createResult(
  example: Example,
  start: number,
  endExclusive: number,
): UniqueSubstringResult {
  return Object.freeze({
    substring: example.slice(start, endExclusive),
    start,
    endExclusive,
    length: endExclusive - start,
  });
}

function cloneResult(result: UniqueSubstringResult): UniqueSubstringResult {
  return Object.freeze({ ...result });
}

function characterAt(example: Example, index: number): string {
  const character = example[index];
  if (character === undefined) {
    throw new Error("Validated example produced an impossible trace state.");
  }
  return character;
}

function failure(error: string): ParseResult {
  return { ok: false, error };
}
