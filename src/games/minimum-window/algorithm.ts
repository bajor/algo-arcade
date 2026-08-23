import { parseIntegerList } from "../../shared/integer-input";

const EXAMPLE_BRAND: unique symbol = Symbol("MinimumWindowExample");

export const EXAMPLE_LIMITS = Object.freeze({
  minItems: 1,
  maxItems: 12,
  minValue: 1,
  maxValue: 99,
  minTarget: 1,
  maxTarget: 1188,
});

export interface Example {
  readonly values: readonly number[];
  readonly target: number;
  readonly [EXAMPLE_BRAND]: true;
}

export type ParseResult =
  | { readonly ok: true; readonly value: Example }
  | { readonly ok: false; readonly error: string };

export interface WindowResult {
  readonly start: number;
  readonly endExclusive: number;
  readonly values: readonly number[];
  readonly sum: number;
  readonly length: number;
}

export type PseudocodeLine =
  "initialize" | "decide" | "expand" | "qualify" | "shrink" | "complete";

export interface OperationCounts {
  readonly thresholdChecks: number;
  readonly expansions: number;
  readonly shrinks: number;
  readonly bestUpdates: number;
}

interface SnapshotState {
  readonly values: readonly number[];
  readonly target: number;
  readonly left: number;
  readonly right: number;
  readonly sum: number;
  readonly best: WindowResult | null;
  readonly counts: OperationCounts;
  readonly line: PseudocodeLine;
  readonly explanation: string;
}

type SnapshotEvent =
  | { readonly kind: "start" }
  | {
      readonly kind: "decide";
      readonly decision: "expand" | "shrink";
    }
  | {
      readonly kind: "expand";
      readonly expandedIndex: number;
      readonly expandedValue: number;
    }
  | {
      readonly kind: "qualify";
      readonly candidate: WindowResult;
      readonly outcome: "updated" | "retained";
    }
  | {
      readonly kind: "shrink";
      readonly removedIndex: number;
      readonly removedValue: number;
    }
  | { readonly kind: "complete" };

export type TraceSnapshot = Readonly<SnapshotState & SnapshotEvent>;

interface MutableState {
  left: number;
  right: number;
  sum: number;
  best: WindowResult | null;
  counts: {
    thresholdChecks: number;
    expansions: number;
    shrinks: number;
    bestUpdates: number;
  };
}

export const DEFAULT_EXAMPLE = createExample([2, 3, 1, 2, 4, 3], 7);

export function parseExample(raw: string): ParseResult {
  const parts = raw.split("|");
  if (parts.length !== 2) {
    return failure(
      'Use exactly one "|" between the values and target, such as 2, 3, 1, 2, 4, 3 | 7.',
    );
  }

  const valuesPart = parts[0];
  const targetPart = parts[1];
  if (valuesPart === undefined || targetPart === undefined) {
    return failure('Use exactly one "|" between the values and target.');
  }

  const parsedValues = parseIntegerList(valuesPart, "2, 3, 1, 2, 4, 3");
  if (!parsedValues.ok) {
    return failure(parsedValues.error);
  }

  const targetText = targetPart.trim();
  if (!targetText) {
    return failure('Enter one target integer after "|", such as 7.');
  }
  if (!/^-?\d+$/.test(targetText)) {
    return failure(`"${targetText}" is not an integer target.`);
  }

  return validateExample(parsedValues.values, Number(targetText));
}

export function validateExample(
  values: readonly number[],
  target: number,
): ParseResult {
  if (values.length < EXAMPLE_LIMITS.minItems) {
    return failure("Enter at least one positive integer value.");
  }
  if (values.length > EXAMPLE_LIMITS.maxItems) {
    return failure(
      `Use at most ${String(EXAMPLE_LIMITS.maxItems)} values so every window stays visible.`,
    );
  }

  const nonIntegerValue = values.find((value) => !Number.isInteger(value));
  if (nonIntegerValue !== undefined) {
    return failure(`"${String(nonIntegerValue)}" is not an integer value.`);
  }

  const nonPositiveValue = values.find((value) => value <= 0);
  if (nonPositiveValue !== undefined) {
    return failure(
      `Value ${String(nonPositiveValue)} is invalid. Use positive integers from ${String(EXAMPLE_LIMITS.minValue)} to ${String(EXAMPLE_LIMITS.maxValue)}.`,
    );
  }

  const oversizedValue = values.find(
    (value) => value > EXAMPLE_LIMITS.maxValue,
  );
  if (oversizedValue !== undefined) {
    return failure(
      `Value ${String(oversizedValue)} is out of range. Use values from ${String(EXAMPLE_LIMITS.minValue)} to ${String(EXAMPLE_LIMITS.maxValue)}.`,
    );
  }

  if (!Number.isInteger(target)) {
    return failure(`"${String(target)}" is not an integer target.`);
  }
  if (target <= 0) {
    return failure(
      `Target ${String(target)} is invalid. Use a positive integer from ${String(EXAMPLE_LIMITS.minTarget)} to ${String(EXAMPLE_LIMITS.maxTarget)}.`,
    );
  }
  if (target > EXAMPLE_LIMITS.maxTarget) {
    return failure(
      `Target ${String(target)} is out of range. Use a target from ${String(EXAMPLE_LIMITS.minTarget)} to ${String(EXAMPLE_LIMITS.maxTarget)}.`,
    );
  }

  return { ok: true, value: createExample(values, target) };
}

export function generateTrace(example: Example): readonly TraceSnapshot[] {
  const state: MutableState = {
    left: 0,
    right: 0,
    sum: 0,
    best: null,
    counts: {
      thresholdChecks: 0,
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
      "Start with the empty window [0, 0) and sum 0.",
    ),
  ];

  while (true) {
    state.counts.thresholdChecks += 1;

    if (state.sum >= example.target) {
      trace.push(
        record(
          example,
          state,
          { kind: "decide", decision: "shrink" },
          "decide",
          `The sum ${String(state.sum)} reaches target ${String(example.target)}, so evaluate this window before shrinking from the left.`,
        ),
      );

      const candidate = createWindow(
        example.values,
        state.left,
        state.right,
        state.sum,
      );
      const updatesBest =
        state.best === null || candidate.length < state.best.length;
      if (updatesBest) {
        state.best = candidate;
        state.counts.bestUpdates += 1;
      }
      trace.push(
        record(
          example,
          state,
          {
            kind: "qualify",
            candidate,
            outcome: updatesBest ? "updated" : "retained",
          },
          "qualify",
          updatesBest
            ? `Window [${String(candidate.start)}, ${String(candidate.endExclusive)}) qualifies and is the shortest found so far.`
            : `Window [${String(candidate.start)}, ${String(candidate.endExclusive)}) qualifies, but the earlier shortest window remains best.`,
        ),
      );

      const removedIndex = state.left;
      const removedValue = example.values[removedIndex];
      if (removedValue === undefined) {
        throw new Error("Validated example produced an invalid left boundary.");
      }
      state.left += 1;
      state.sum -= removedValue;
      state.counts.shrinks += 1;
      trace.push(
        record(
          example,
          state,
          { kind: "shrink", removedIndex, removedValue },
          "shrink",
          `Remove ${String(removedValue)} at index ${String(removedIndex)}. The window is now [${String(state.left)}, ${String(state.right)}) with sum ${String(state.sum)}.`,
        ),
      );
      continue;
    }

    if (state.right < example.values.length) {
      trace.push(
        record(
          example,
          state,
          { kind: "decide", decision: "expand" },
          "decide",
          `The sum ${String(state.sum)} is below target ${String(example.target)}, so expand to the right.`,
        ),
      );

      const expandedIndex = state.right;
      const expandedValue = example.values[expandedIndex];
      if (expandedValue === undefined) {
        throw new Error(
          "Validated example produced an invalid right boundary.",
        );
      }
      state.right += 1;
      state.sum += expandedValue;
      state.counts.expansions += 1;
      trace.push(
        record(
          example,
          state,
          { kind: "expand", expandedIndex, expandedValue },
          "expand",
          `Add ${String(expandedValue)} at index ${String(expandedIndex)}. The window is now [${String(state.left)}, ${String(state.right)}) with sum ${String(state.sum)}.`,
        ),
      );
      continue;
    }

    break;
  }

  trace.push(
    record(
      example,
      state,
      { kind: "complete" },
      "complete",
      state.best === null
        ? `No contiguous window reaches target ${String(example.target)}.`
        : `The shortest qualifying window is [${String(state.best.start)}, ${String(state.best.endExclusive)}) with length ${String(state.best.length)}.`,
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
  const frozenEvent =
    event.kind === "qualify"
      ? { ...event, candidate: copyWindow(event.candidate) }
      : event;

  return Object.freeze({
    ...frozenEvent,
    values: Object.freeze([...example.values]),
    target: example.target,
    left: state.left,
    right: state.right,
    sum: state.sum,
    best: state.best === null ? null : copyWindow(state.best),
    counts: Object.freeze({ ...state.counts }),
    line,
    explanation,
  });
}

function createExample(values: readonly number[], target: number): Example {
  return Object.freeze({
    values: Object.freeze([...values]),
    target,
  }) as Example;
}

function createWindow(
  values: readonly number[],
  start: number,
  endExclusive: number,
  sum: number,
): WindowResult {
  return Object.freeze({
    start,
    endExclusive,
    values: Object.freeze(values.slice(start, endExclusive)),
    sum,
    length: endExclusive - start,
  });
}

function copyWindow(window: WindowResult): WindowResult {
  return Object.freeze({
    ...window,
    values: Object.freeze([...window.values]),
  });
}

function failure(error: string): ParseResult {
  return { ok: false, error };
}
