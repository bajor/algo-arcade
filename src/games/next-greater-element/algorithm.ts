const EXAMPLE_BRAND: unique symbol = Symbol("NextGreaterElementExample");

export const EXAMPLE_LIMITS = Object.freeze({
  minItems: 1,
  maxItems: 12,
  minValue: -99,
  maxValue: 99,
});

export type Example = readonly number[] & {
  readonly [EXAMPLE_BRAND]: true;
};

export type ParseResult =
  | { readonly ok: true; readonly value: Example }
  | { readonly ok: false; readonly error: string };

export type PseudocodeLine =
  "scan" | "compare" | "resolve" | "push" | "complete";

export interface OperationCounts {
  readonly comparisons: number;
  readonly pushes: number;
  readonly pops: number;
}

interface SnapshotState {
  readonly values: readonly number[];
  readonly cursor: number | null;
  readonly stack: readonly number[];
  readonly result: readonly (number | null)[];
  readonly counts: OperationCounts;
  readonly line: PseudocodeLine;
  readonly explanation: string;
}

type SnapshotEvent =
  | { readonly kind: "start" }
  | { readonly kind: "inspect"; readonly currentIndex: number }
  | {
      readonly kind: "compare";
      readonly currentIndex: number;
      readonly topIndex: number;
      readonly decision: "resolve" | "stop";
    }
  | {
      readonly kind: "resolve";
      readonly currentIndex: number;
      readonly resolvedIndex: number;
    }
  | { readonly kind: "push"; readonly pushedIndex: number }
  | {
      readonly kind: "complete";
      readonly unresolvedIndices: readonly number[];
    };

export type TraceSnapshot = Readonly<SnapshotState & SnapshotEvent>;

interface MutableState {
  cursor: number | null;
  stack: number[];
  result: (number | null)[];
  counts: {
    comparisons: number;
    pushes: number;
    pops: number;
  };
}

export const DEFAULT_EXAMPLE = createExample([2, 1, 2, 4, 3]);

export function parseExample(raw: string): ParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return failure("Enter at least one integer, such as 2, 1, 2, 4, 3.");
  }

  const startsWithBracket = trimmed.startsWith("[");
  const endsWithBracket = trimmed.endsWith("]");
  if (startsWithBracket !== endsWithBracket) {
    return failure(
      "Use both square brackets or neither: [2, 1, 2] or 2, 1, 2.",
    );
  }

  const body = startsWithBracket ? trimmed.slice(1, -1).trim() : trimmed;
  if (!body) {
    return failure("Enter at least one integer inside the brackets.");
  }

  const tokens = body.split(/[\s,]+/).filter(Boolean);
  const invalidToken = tokens.find((token) => !/^-?\d+$/.test(token));
  if (invalidToken) {
    return failure(
      `"${invalidToken}" is not an integer. Separate values with commas or spaces.`,
    );
  }

  return validateExample(tokens.map(Number));
}

export function validateExample(values: readonly number[]): ParseResult {
  if (values.length < EXAMPLE_LIMITS.minItems) {
    return failure("Enter at least one integer.");
  }

  if (values.length > EXAMPLE_LIMITS.maxItems) {
    return failure(
      `Use at most ${EXAMPLE_LIMITS.maxItems} integers so every step stays visible.`,
    );
  }

  const invalidValue = values.find((value) => !Number.isInteger(value));
  if (invalidValue !== undefined) {
    return failure(`"${String(invalidValue)}" is not an integer.`);
  }

  const outOfRangeValue = values.find(
    (value) =>
      value < EXAMPLE_LIMITS.minValue || value > EXAMPLE_LIMITS.maxValue,
  );
  if (outOfRangeValue !== undefined) {
    return failure(
      `${String(outOfRangeValue)} is out of range. Use values from ${EXAMPLE_LIMITS.minValue} to ${EXAMPLE_LIMITS.maxValue}.`,
    );
  }

  return { ok: true, value: createExample(values) };
}

export function generateTrace(example: Example): readonly TraceSnapshot[] {
  const state: MutableState = {
    cursor: null,
    stack: [],
    result: example.map(() => null),
    counts: { comparisons: 0, pushes: 0, pops: 0 },
  };
  const trace: TraceSnapshot[] = [
    record(
      example,
      state,
      { kind: "start" },
      "scan",
      "The stack is empty. Every value is still waiting for a greater value to its right.",
    ),
  ];

  for (let currentIndex = 0; currentIndex < example.length; currentIndex += 1) {
    state.cursor = currentIndex;
    trace.push(
      record(
        example,
        state,
        { kind: "inspect", currentIndex },
        "scan",
        `Scan index ${String(currentIndex)} with value ${String(example[currentIndex])}.`,
      ),
    );

    while (state.stack.length > 0) {
      const topIndex = state.stack[state.stack.length - 1];
      const currentValue = example[currentIndex];
      if (topIndex === undefined || currentValue === undefined) {
        throw new Error(
          "Validated example produced an impossible trace state.",
        );
      }

      const topValue = example[topIndex];
      if (topValue === undefined) {
        throw new Error("Stack index is outside the validated example.");
      }

      const shouldResolve = currentValue > topValue;
      state.counts.comparisons += 1;
      trace.push(
        record(
          example,
          state,
          {
            kind: "compare",
            currentIndex,
            topIndex,
            decision: shouldResolve ? "resolve" : "stop",
          },
          "compare",
          shouldResolve
            ? `${String(currentValue)} is greater than ${String(topValue)}, so the stack top has found its answer.`
            : `${String(currentValue)} is not greater than ${String(topValue)}, so popping stops here.`,
        ),
      );

      if (!shouldResolve) {
        break;
      }

      state.stack.pop();
      state.result[topIndex] = currentValue;
      state.counts.pops += 1;
      trace.push(
        record(
          example,
          state,
          { kind: "resolve", currentIndex, resolvedIndex: topIndex },
          "resolve",
          `Pop index ${String(topIndex)}. Its next greater value is ${String(currentValue)} at index ${String(currentIndex)}.`,
        ),
      );
    }

    state.stack.push(currentIndex);
    state.counts.pushes += 1;
    trace.push(
      record(
        example,
        state,
        { kind: "push", pushedIndex: currentIndex },
        "push",
        `Push index ${String(currentIndex)}. It now waits for a strictly greater value.`,
      ),
    );
  }

  state.cursor = null;
  const unresolvedIndices = [...state.stack];
  state.result = state.result.map((value) => value ?? -1);
  trace.push(
    record(
      example,
      state,
      { kind: "complete", unresolvedIndices: Object.freeze(unresolvedIndices) },
      "complete",
      unresolvedIndices.length === 0
        ? "Every value found a greater value to its right. The trace is complete."
        : `${String(unresolvedIndices.length)} value${unresolvedIndices.length === 1 ? "" : "s"} never found a greater value, so their answer is -1.`,
    ),
  );

  return Object.freeze(trace);
}

function record(
  values: Example,
  state: MutableState,
  event: SnapshotEvent,
  line: PseudocodeLine,
  explanation: string,
): TraceSnapshot {
  return Object.freeze({
    ...event,
    values: Object.freeze([...values]),
    cursor: state.cursor,
    stack: Object.freeze([...state.stack]),
    result: Object.freeze([...state.result]),
    counts: Object.freeze({ ...state.counts }),
    line,
    explanation,
  });
}

function createExample(values: readonly number[]): Example {
  return Object.freeze([...values]) as Example;
}

function failure(error: string): ParseResult {
  return { ok: false, error };
}
