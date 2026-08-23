import { parseIntegerList } from "../../shared/integer-input";

const EXAMPLE_BRAND: unique symbol = Symbol("PrefixSumExample");

export const EXAMPLE_LIMITS = Object.freeze({
  minItems: 1,
  maxItems: 12,
  minValue: -99,
  maxValue: 99,
});

export interface Example {
  readonly values: readonly number[];
  readonly start: number;
  readonly end: number;
  readonly [EXAMPLE_BRAND]: true;
}

export type ParseResult =
  | { readonly ok: true; readonly value: Example }
  | { readonly ok: false; readonly error: string };

export type PrefixChange = "higher" | "lower" | "same";

export type PseudocodeLine =
  | "initialize"
  | "accumulate"
  | "read-start"
  | "read-end"
  | "subtract"
  | "complete";

export interface OperationCounts {
  readonly additions: number;
  readonly lookups: number;
  readonly subtractions: number;
}

interface SnapshotState {
  readonly values: readonly number[];
  readonly start: number;
  readonly end: number;
  readonly prefix: readonly (number | null)[];
  readonly startPrefix: number | null;
  readonly endPrefix: number | null;
  readonly result: number | null;
  readonly counts: OperationCounts;
  readonly line: PseudocodeLine;
  readonly explanation: string;
}

type SnapshotEvent =
  | { readonly kind: "start" }
  | {
      readonly kind: "accumulate";
      readonly inputIndex: number;
      readonly incomingValue: number;
      readonly previousTotal: number;
      readonly nextTotal: number;
      readonly change: PrefixChange;
    }
  | {
      readonly kind: "read-start";
      readonly prefixIndex: number;
      readonly prefixValue: number;
    }
  | {
      readonly kind: "read-end";
      readonly prefixIndex: number;
      readonly prefixValue: number;
    }
  | {
      readonly kind: "subtract";
      readonly endValue: number;
      readonly startValue: number;
      readonly rangeSum: number;
    }
  | { readonly kind: "complete"; readonly rangeSum: number };

export type TraceSnapshot = Readonly<SnapshotState & SnapshotEvent>;

interface MutableState {
  prefix: (number | null)[];
  startPrefix: number | null;
  endPrefix: number | null;
  result: number | null;
  counts: {
    additions: number;
    lookups: number;
    subtractions: number;
  };
}

export const DEFAULT_EXAMPLE = createExample([2, -1, 4, 3], 1, 4);

export function parseExample(raw: string): ParseResult {
  const parts = raw.split("|");
  if (parts.length !== 2) {
    return failure(
      'Use exactly one "|" between the values and range, such as 2, -1, 4, 3 | 1:4.',
    );
  }

  const valuesPart = parts[0];
  const rangePart = parts[1]?.trim();
  if (valuesPart === undefined || rangePart === undefined) {
    return failure("The example is missing its values or range query.");
  }

  const parsedValues = parseIntegerList(valuesPart, "2, -1, 4, 3");
  if (!parsedValues.ok) {
    return failure(parsedValues.error);
  }

  const boundaries = rangePart.split(":");
  if (boundaries.length !== 2) {
    return failure(
      'Enter the half-open range as start:end after "|", such as 1:4.',
    );
  }

  const startText = boundaries[0]?.trim() ?? "";
  const endText = boundaries[1]?.trim() ?? "";
  if (!/^-?\d+$/.test(startText)) {
    return failure(`"${startText}" is not an integer query start.`);
  }
  if (!/^-?\d+$/.test(endText)) {
    return failure(`"${endText}" is not an integer query end.`);
  }

  return validateExample(
    parsedValues.values,
    Number(startText),
    Number(endText),
  );
}

export function validateExample(
  values: readonly number[],
  start: number,
  end: number,
): ParseResult {
  if (values.length < EXAMPLE_LIMITS.minItems) {
    return failure("Enter at least one integer value.");
  }
  if (values.length > EXAMPLE_LIMITS.maxItems) {
    return failure(
      `Use at most ${String(EXAMPLE_LIMITS.maxItems)} values so every prefix cell stays visible.`,
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

  if (!Number.isInteger(start)) {
    return failure(`"${String(start)}" is not an integer query start.`);
  }
  if (!Number.isInteger(end)) {
    return failure(`"${String(end)}" is not an integer query end.`);
  }
  if (start < 0 || start >= values.length) {
    return failure(
      `Query start ${String(start)} is out of bounds. Use an index from 0 to ${String(values.length - 1)}.`,
    );
  }
  if (end < 0 || end > values.length) {
    return failure(
      `Query end ${String(end)} is out of bounds. Use an index from 1 to ${String(values.length)}.`,
    );
  }
  if (start >= end) {
    return failure(
      `Query start ${String(start)} must be less than query end ${String(end)} for a non-empty half-open range.`,
    );
  }

  return { ok: true, value: createExample(values, start, end) };
}

export function generateTrace(example: Example): readonly TraceSnapshot[] {
  const state: MutableState = {
    prefix: [0, ...example.values.map(() => null)],
    startPrefix: null,
    endPrefix: null,
    result: null,
    counts: { additions: 0, lookups: 0, subtractions: 0 },
  };
  const trace: TraceSnapshot[] = [
    record(
      example,
      state,
      { kind: "start" },
      "initialize",
      "Place a leading 0 in prefix[0]. Every later cell will total all values before its index.",
    ),
  ];

  for (
    let inputIndex = 0;
    inputIndex < example.values.length;
    inputIndex += 1
  ) {
    const incomingValue = valueAt(example.values, inputIndex);
    const previousTotal = prefixAt(state.prefix, inputIndex);
    const nextTotal = previousTotal + incomingValue;
    state.prefix[inputIndex + 1] = nextTotal;
    state.counts.additions += 1;
    trace.push(
      record(
        example,
        state,
        {
          kind: "accumulate",
          inputIndex,
          incomingValue,
          previousTotal,
          nextTotal,
          change: prefixChange(previousTotal, nextTotal),
        },
        "accumulate",
        `Add value ${String(incomingValue)} at input index ${String(inputIndex)} to prefix total ${String(previousTotal)}. Store ${String(nextTotal)} in prefix[${String(inputIndex + 1)}].`,
      ),
    );
  }

  state.startPrefix = prefixAt(state.prefix, example.start);
  state.counts.lookups += 1;
  trace.push(
    record(
      example,
      state,
      {
        kind: "read-start",
        prefixIndex: example.start,
        prefixValue: state.startPrefix,
      },
      "read-start",
      `Read prefix[${String(example.start)}] = ${String(state.startPrefix)}. This total lies before the requested range.`,
    ),
  );

  state.endPrefix = prefixAt(state.prefix, example.end);
  state.counts.lookups += 1;
  trace.push(
    record(
      example,
      state,
      {
        kind: "read-end",
        prefixIndex: example.end,
        prefixValue: state.endPrefix,
      },
      "read-end",
      `Read prefix[${String(example.end)}] = ${String(state.endPrefix)}. This total includes the requested range.`,
    ),
  );

  state.result = state.endPrefix - state.startPrefix;
  state.counts.subtractions += 1;
  trace.push(
    record(
      example,
      state,
      {
        kind: "subtract",
        endValue: state.endPrefix,
        startValue: state.startPrefix,
        rangeSum: state.result,
      },
      "subtract",
      `Subtract the total before the range: ${String(state.endPrefix)} - ${String(state.startPrefix)} = ${String(state.result)}.`,
    ),
  );

  trace.push(
    record(
      example,
      state,
      { kind: "complete", rangeSum: state.result },
      "complete",
      `The sum of values in [${String(example.start)}, ${String(example.end)}) is ${String(state.result)}.`,
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
    values: Object.freeze([...example.values]),
    start: example.start,
    end: example.end,
    prefix: Object.freeze([...state.prefix]),
    startPrefix: state.startPrefix,
    endPrefix: state.endPrefix,
    result: state.result,
    counts: Object.freeze({ ...state.counts }),
    line,
    explanation,
  });
}

function createExample(
  values: readonly number[],
  start: number,
  end: number,
): Example {
  return Object.freeze({
    values: Object.freeze([...values]),
    start,
    end,
  }) as Example;
}

function prefixChange(previousTotal: number, nextTotal: number): PrefixChange {
  if (nextTotal > previousTotal) return "higher";
  if (nextTotal < previousTotal) return "lower";
  return "same";
}

function valueAt(values: readonly number[], index: number): number {
  const value = values[index];
  if (value === undefined) {
    throw new Error("Validated example produced an invalid input index.");
  }
  return value;
}

function prefixAt(prefix: readonly (number | null)[], index: number): number {
  const value = prefix[index];
  if (value === undefined || value === null) {
    throw new Error("Prefix trace read a total before it was accumulated.");
  }
  return value;
}

function failure(error: string): ParseResult {
  return { ok: false, error };
}
