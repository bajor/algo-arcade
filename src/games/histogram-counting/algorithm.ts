import { parseIntegerList } from "../../shared/integer-input";

const EXAMPLE_BRAND: unique symbol = Symbol("HistogramCountingExample");

export const HISTOGRAM_BINS = Object.freeze([
  Object.freeze({ id: "0-24", minimum: 0, maximum: 24 }),
  Object.freeze({ id: "25-49", minimum: 25, maximum: 49 }),
  Object.freeze({ id: "50-74", minimum: 50, maximum: 74 }),
  Object.freeze({ id: "75-99", minimum: 75, maximum: 99 }),
] as const);

export type HistogramBin = (typeof HISTOGRAM_BINS)[number];
export type BinId = HistogramBin["id"];

export const EXAMPLE_LIMITS = Object.freeze({
  minItems: 1,
  maxItems: 16,
  minValue: HISTOGRAM_BINS[0].minimum,
  maxValue: HISTOGRAM_BINS.at(-1)!.maximum,
});

export type Example = readonly number[] & {
  readonly [EXAMPLE_BRAND]: true;
};

export type ParseResult =
  | { readonly ok: true; readonly value: Example }
  | { readonly ok: false; readonly error: string };

export type PseudocodeLine =
  "initialize" | "inspect" | "classify" | "increment" | "complete";

export interface OperationCounts {
  readonly inspections: number;
  readonly classifications: number;
  readonly increments: number;
}

interface SnapshotState {
  readonly values: readonly number[];
  readonly bins: readonly HistogramBin[];
  readonly binCounts: readonly number[];
  readonly currentIndex: number | null;
  readonly currentValue: number | null;
  readonly currentBinId: BinId | null;
  readonly processedValues: readonly number[];
  readonly tallestBinIds: readonly BinId[];
  readonly counts: OperationCounts;
  readonly line: PseudocodeLine;
  readonly explanation: string;
}

type SnapshotEvent =
  | { readonly kind: "start" }
  | {
      readonly kind: "inspect";
      readonly inspectedIndex: number;
      readonly value: number;
    }
  | {
      readonly kind: "classify";
      readonly classifiedIndex: number;
      readonly value: number;
      readonly binId: BinId;
    }
  | {
      readonly kind: "increment";
      readonly incrementedIndex: number;
      readonly value: number;
      readonly binId: BinId;
      readonly previousCount: number;
      readonly nextCount: number;
    }
  | { readonly kind: "complete" };

export type TraceSnapshot = Readonly<SnapshotState & SnapshotEvent>;

interface MutableState {
  binCounts: number[];
  currentIndex: number | null;
  currentValue: number | null;
  currentBinId: BinId | null;
  processedValues: number[];
  tallestBinIds: BinId[];
  counts: {
    inspections: number;
    classifications: number;
    increments: number;
  };
}

export const DEFAULT_EXAMPLE = createExample([
  4, 18, 26, 31, 51, 74, 75, 99, 26,
]);

export function parseExample(raw: string): ParseResult {
  const parsed = parseIntegerList(raw, "4, 18, 26, 31, 51, 74, 75, 99, 26");
  return parsed.ok ? validateExample(parsed.values) : failure(parsed.error);
}

export function validateExample(values: readonly number[]): ParseResult {
  if (values.length < EXAMPLE_LIMITS.minItems) {
    return failure("Enter at least one integer.");
  }
  if (values.length > EXAMPLE_LIMITS.maxItems) {
    return failure(
      `Use at most ${String(EXAMPLE_LIMITS.maxItems)} integers so every value stays visible.`,
    );
  }

  const nonIntegerIndex = values.findIndex((value) => !Number.isInteger(value));
  if (nonIntegerIndex >= 0) {
    return failure(
      `"${String(values[nonIntegerIndex])}" at position ${String(nonIntegerIndex + 1)} is not an integer.`,
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

  return { ok: true, value: createExample(values) };
}

export function classifyValue(value: number): HistogramBin {
  const bin = HISTOGRAM_BINS.find(
    ({ minimum, maximum }) => value >= minimum && value <= maximum,
  );
  if (!bin) {
    throw new Error(
      `Value ${String(value)} is outside the fixed histogram bins.`,
    );
  }
  return bin;
}

export function getBin(binId: BinId): HistogramBin {
  const bin = HISTOGRAM_BINS.find(({ id }) => id === binId);
  if (!bin) {
    throw new Error(`Unknown histogram bin ${binId}.`);
  }
  return bin;
}

export function generateTrace(example: Example): readonly TraceSnapshot[] {
  const state: MutableState = {
    binCounts: HISTOGRAM_BINS.map(() => 0),
    currentIndex: null,
    currentValue: null,
    currentBinId: null,
    processedValues: [],
    tallestBinIds: [],
    counts: { inspections: 0, classifications: 0, increments: 0 },
  };
  const trace: TraceSnapshot[] = [
    record(
      example,
      state,
      { kind: "start" },
      "initialize",
      "Build four empty counters for the fixed value ranges.",
    ),
  ];

  example.forEach((value, index) => {
    state.currentIndex = index;
    state.currentValue = value;
    state.currentBinId = null;
    state.counts.inspections += 1;
    trace.push(
      record(
        example,
        state,
        { kind: "inspect", inspectedIndex: index, value },
        "inspect",
        `Inspect ${String(value)} at position ${String(index + 1)}.`,
      ),
    );

    const bin = classifyValue(value);
    state.currentBinId = bin.id;
    state.counts.classifications += 1;
    trace.push(
      record(
        example,
        state,
        { kind: "classify", classifiedIndex: index, value, binId: bin.id },
        "classify",
        `${String(value)} belongs in the ${bin.id} bin.`,
      ),
    );

    const binIndex = indexOfBin(bin.id);
    const previousCount = countAt(state.binCounts, binIndex);
    const nextCount = previousCount + 1;
    state.binCounts[binIndex] = nextCount;
    state.processedValues.push(value);
    state.counts.increments += 1;
    trace.push(
      record(
        example,
        state,
        {
          kind: "increment",
          incrementedIndex: index,
          value,
          binId: bin.id,
          previousCount,
          nextCount,
        },
        "increment",
        `Increase the ${bin.id} counter from ${String(previousCount)} to ${String(nextCount)}.`,
      ),
    );
  });

  state.currentIndex = null;
  state.currentValue = null;
  state.currentBinId = null;
  state.tallestBinIds = findTallestBins(state.binCounts);
  trace.push(
    record(
      example,
      state,
      { kind: "complete" },
      "complete",
      `All ${String(example.length)} values are counted. Tallest: ${state.tallestBinIds.join(", ")}.`,
    ),
  );

  return Object.freeze(trace);
}

function findTallestBins(binCounts: readonly number[]): BinId[] {
  const tallestCount = Math.max(...binCounts);
  return HISTOGRAM_BINS.flatMap((bin, index) =>
    countAt(binCounts, index) === tallestCount ? [bin.id] : [],
  );
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
    values: Object.freeze([...example]),
    bins: HISTOGRAM_BINS,
    binCounts: Object.freeze([...state.binCounts]),
    currentIndex: state.currentIndex,
    currentValue: state.currentValue,
    currentBinId: state.currentBinId,
    processedValues: Object.freeze([...state.processedValues]),
    tallestBinIds: Object.freeze([...state.tallestBinIds]),
    counts: Object.freeze({ ...state.counts }),
    line,
    explanation,
  });
}

function indexOfBin(binId: BinId): number {
  const index = HISTOGRAM_BINS.findIndex(({ id }) => id === binId);
  if (index < 0) {
    throw new Error(`Unknown histogram bin ${binId}.`);
  }
  return index;
}

function countAt(counts: readonly number[], index: number): number {
  const count = counts[index];
  if (count === undefined) {
    throw new Error("Histogram count is missing for a fixed bin.");
  }
  return count;
}

function createExample(values: readonly number[]): Example {
  return Object.freeze([...values]) as Example;
}

function failure(error: string): ParseResult {
  return { ok: false, error };
}
