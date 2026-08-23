import { parseIntegerList } from "../../shared/integer-input";

const EXAMPLE_BRAND: unique symbol = Symbol("PairSumExample");

export const EXAMPLE_LIMITS = Object.freeze({
  minItems: 2,
  maxItems: 12,
  minValue: -99,
  maxValue: 99,
  minTarget: -198,
  maxTarget: 198,
});

export type Example = Readonly<{
  values: readonly number[];
  target: number;
  readonly [EXAMPLE_BRAND]: true;
}>;

export type ParseResult =
  | { readonly ok: true; readonly value: Example }
  | { readonly ok: false; readonly error: string };

export type PseudocodeLine =
  | "initialize"
  | "compare-sum"
  | "record-pair"
  | "move-left"
  | "move-right"
  | "complete";

export type CompareDecision = "move-left" | "move-right" | "record-pair";

export type PointerMoveReason =
  "sum-too-small" | "sum-too-large" | "matched-value" | "duplicate-skip";

export interface Pair {
  readonly leftValue: number;
  readonly rightValue: number;
  readonly leftIndex: number;
  readonly rightIndex: number;
}

export interface OperationCounts {
  readonly comparisons: number;
  readonly leftMoves: number;
  readonly rightMoves: number;
  readonly pairs: number;
}

interface SnapshotState {
  readonly values: readonly number[];
  readonly target: number;
  readonly left: number;
  readonly right: number;
  readonly currentSum: number | null;
  readonly pairs: readonly Pair[];
  readonly counts: OperationCounts;
  readonly line: PseudocodeLine;
  readonly explanation: string;
}

type SnapshotEvent =
  | { readonly kind: "start" }
  | { readonly kind: "compare"; readonly decision: CompareDecision }
  | { readonly kind: "record-pair"; readonly pair: Pair }
  | {
      readonly kind: "move-left";
      readonly fromIndex: number;
      readonly toIndex: number;
      readonly reason: Exclude<PointerMoveReason, "sum-too-large">;
    }
  | {
      readonly kind: "move-right";
      readonly fromIndex: number;
      readonly toIndex: number;
      readonly reason: Exclude<PointerMoveReason, "sum-too-small">;
    }
  | { readonly kind: "complete" };

export type TraceSnapshot = Readonly<SnapshotState & SnapshotEvent>;

interface MutableState {
  left: number;
  right: number;
  pairs: Pair[];
  counts: {
    comparisons: number;
    leftMoves: number;
    rightMoves: number;
    pairs: number;
  };
}

type LeftMoveReason = Extract<
  PointerMoveReason,
  "sum-too-small" | "matched-value" | "duplicate-skip"
>;

type RightMoveReason = Extract<
  PointerMoveReason,
  "sum-too-large" | "matched-value" | "duplicate-skip"
>;

export const DEFAULT_EXAMPLE = createExample(
  [-4, -1, -1, 0, 1, 2, 2, 5, 10],
  4,
);

export function parseExample(raw: string): ParseResult {
  const parts = raw.split("|");
  if (parts.length !== 2) {
    return failure(
      'Use exactly one "|" between the sorted values and target, such as -4, -1, 0, 5 | 4.',
    );
  }

  const valuesPart = parts[0];
  const targetPart = parts[1]?.trim();
  if (valuesPart === undefined || targetPart === undefined) {
    return failure("The example is missing its values or target.");
  }

  const parsedValues = parseIntegerList(valuesPart, "-4, -1, 0, 5");
  if (!parsedValues.ok) {
    return failure(parsedValues.error);
  }

  if (!/^-?\d+$/.test(targetPart)) {
    return failure(
      'Enter one integer target after "|", such as -4, -1, 0, 5 | 4.',
    );
  }

  return validateExample(parsedValues.values, Number(targetPart));
}

export function validateExample(
  values: readonly number[],
  target: number,
): ParseResult {
  if (values.length < EXAMPLE_LIMITS.minItems) {
    return failure(
      `Enter at least ${String(EXAMPLE_LIMITS.minItems)} integers.`,
    );
  }

  if (values.length > EXAMPLE_LIMITS.maxItems) {
    return failure(
      `Use at most ${String(EXAMPLE_LIMITS.maxItems)} integers so every step stays visible.`,
    );
  }

  const invalidValueIndex = values.findIndex(
    (value) => !Number.isInteger(value),
  );
  if (invalidValueIndex >= 0) {
    return failure(
      `"${String(values[invalidValueIndex])}" at position ${String(invalidValueIndex + 1)} is not an integer.`,
    );
  }

  const outOfRangeIndex = values.findIndex(
    (value) =>
      value < EXAMPLE_LIMITS.minValue || value > EXAMPLE_LIMITS.maxValue,
  );
  if (outOfRangeIndex >= 0) {
    return failure(
      `${String(values[outOfRangeIndex])} at position ${String(outOfRangeIndex + 1)} is out of range. Use values from ${String(EXAMPLE_LIMITS.minValue)} to ${String(EXAMPLE_LIMITS.maxValue)}.`,
    );
  }

  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (previous === undefined || current === undefined) {
      return failure("Every position must contain an integer.");
    }
    if (current < previous) {
      return failure(
        `Values must be in nondecreasing order. Position ${String(index + 1)} has ${String(current)} after ${String(previous)}.`,
      );
    }
  }

  if (!Number.isInteger(target)) {
    return failure(`"${String(target)}" is not an integer target.`);
  }

  if (target < EXAMPLE_LIMITS.minTarget || target > EXAMPLE_LIMITS.maxTarget) {
    return failure(
      `${String(target)} is out of range. Use a target from ${String(EXAMPLE_LIMITS.minTarget)} to ${String(EXAMPLE_LIMITS.maxTarget)}.`,
    );
  }

  return { ok: true, value: createExample(values, target) };
}

export function generateTrace(example: Example): readonly TraceSnapshot[] {
  const state: MutableState = {
    left: 0,
    right: example.values.length - 1,
    pairs: [],
    counts: { comparisons: 0, leftMoves: 0, rightMoves: 0, pairs: 0 },
  };
  const trace: TraceSnapshot[] = [
    record(
      example,
      state,
      { kind: "start" },
      "initialize",
      "Place one pointer at each end of the sorted values.",
    ),
  ];

  while (state.left < state.right) {
    const leftValue = valueAt(example.values, state.left);
    const rightValue = valueAt(example.values, state.right);
    const sum = leftValue + rightValue;
    const decision = compareDecision(sum, example.target);
    state.counts.comparisons += 1;
    trace.push(
      record(
        example,
        state,
        { kind: "compare", decision },
        "compare-sum",
        comparisonExplanation(sum, example.target, decision),
      ),
    );

    if (decision === "move-left") {
      trace.push(moveLeft(example, state, "sum-too-small"));
      continue;
    }

    if (decision === "move-right") {
      trace.push(moveRight(example, state, "sum-too-large"));
      continue;
    }

    const pair = Object.freeze({
      leftValue,
      rightValue,
      leftIndex: state.left,
      rightIndex: state.right,
    });
    state.pairs.push(pair);
    state.counts.pairs += 1;
    trace.push(
      record(
        example,
        state,
        { kind: "record-pair", pair },
        "record-pair",
        `Record (${String(leftValue)}, ${String(rightValue)}) once as a unique value pair.`,
      ),
    );

    advancePastMatch(example, state, trace, leftValue, rightValue);
  }

  trace.push(
    record(
      example,
      state,
      { kind: "complete" },
      "complete",
      state.pairs.length === 0
        ? "The pointers met without finding a pair that reaches the target."
        : `The pointers met after recording ${String(state.pairs.length)} unique value pair${state.pairs.length === 1 ? "" : "s"}.`,
    ),
  );

  return Object.freeze(trace);
}

function advancePastMatch(
  example: Example,
  state: MutableState,
  trace: TraceSnapshot[],
  leftValue: number,
  rightValue: number,
): void {
  if (state.left < state.right) {
    trace.push(moveLeft(example, state, "matched-value"));
  }
  while (
    state.left < state.right &&
    valueAt(example.values, state.left) === leftValue
  ) {
    trace.push(moveLeft(example, state, "duplicate-skip"));
  }

  if (state.left < state.right) {
    trace.push(moveRight(example, state, "matched-value"));
  }
  while (
    state.left < state.right &&
    valueAt(example.values, state.right) === rightValue
  ) {
    trace.push(moveRight(example, state, "duplicate-skip"));
  }
}

function moveLeft(
  example: Example,
  state: MutableState,
  reason: LeftMoveReason,
): TraceSnapshot {
  const fromIndex = state.left;
  state.left += 1;
  state.counts.leftMoves += 1;
  const movedValue = valueAt(example.values, fromIndex);
  const explanation =
    reason === "sum-too-small"
      ? "Move the left pointer right because the sum is below the target."
      : reason === "matched-value"
        ? `Move left past the matched value ${String(movedValue)}.`
        : `Move left again to skip duplicate matched value ${String(movedValue)}.`;

  return record(
    example,
    state,
    { kind: "move-left", fromIndex, toIndex: state.left, reason },
    "move-left",
    explanation,
  );
}

function moveRight(
  example: Example,
  state: MutableState,
  reason: RightMoveReason,
): TraceSnapshot {
  const fromIndex = state.right;
  state.right -= 1;
  state.counts.rightMoves += 1;
  const movedValue = valueAt(example.values, fromIndex);
  const explanation =
    reason === "sum-too-large"
      ? "Move the right pointer left because the sum is above the target."
      : reason === "matched-value"
        ? `Move right past the matched value ${String(movedValue)}.`
        : `Move right again to skip duplicate matched value ${String(movedValue)}.`;

  return record(
    example,
    state,
    { kind: "move-right", fromIndex, toIndex: state.right, reason },
    "move-right",
    explanation,
  );
}

function compareDecision(sum: number, target: number): CompareDecision {
  if (sum < target) {
    return "move-left";
  }
  if (sum > target) {
    return "move-right";
  }
  return "record-pair";
}

function comparisonExplanation(
  sum: number,
  target: number,
  decision: CompareDecision,
): string {
  if (decision === "move-left") {
    return `${String(sum)} is below ${String(target)}, so the left pointer must move right.`;
  }
  if (decision === "move-right") {
    return `${String(sum)} is above ${String(target)}, so the right pointer must move left.`;
  }
  return `${String(sum)} equals ${String(target)}, so record this value pair.`;
}

function record(
  example: Example,
  state: MutableState,
  event: SnapshotEvent,
  line: PseudocodeLine,
  explanation: string,
): TraceSnapshot {
  const pairs = Object.freeze(
    state.pairs.map((pair) => Object.freeze({ ...pair })),
  );
  return Object.freeze({
    ...event,
    values: Object.freeze([...example.values]),
    target: example.target,
    left: state.left,
    right: state.right,
    currentSum:
      event.kind === "complete" || state.left >= state.right
        ? null
        : valueAt(example.values, state.left) +
          valueAt(example.values, state.right),
    pairs,
    counts: Object.freeze({ ...state.counts }),
    line,
    explanation,
  });
}

function valueAt(values: readonly number[], index: number): number {
  const value = values[index];
  if (value === undefined) {
    throw new Error("Validated example produced an invalid pointer position.");
  }
  return value;
}

function createExample(values: readonly number[], target: number): Example {
  return Object.freeze({
    values: Object.freeze([...values]),
    target,
  }) as Example;
}

function failure(error: string): ParseResult {
  return { ok: false, error };
}
