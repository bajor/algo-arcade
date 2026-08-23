import {
  parseLowercaseWordList,
  validateLowercaseWord,
} from "../../shared/lowercase-word-list";

const EXAMPLE_BRAND: unique symbol = Symbol("FrequencyMapExample");

export const EXAMPLE_LIMITS = Object.freeze({
  minTokens: 1,
  maxTokens: 12,
  minTokenLength: 1,
  maxTokenLength: 12,
});

export interface Example {
  readonly tokens: readonly string[];
  readonly [EXAMPLE_BRAND]: true;
}

export type ParseResult =
  | { readonly ok: true; readonly value: Example }
  | { readonly ok: false; readonly error: string };

export type LookupDecision = "insert" | "increment";

export type PseudocodeLine =
  | "initialize"
  | "inspect-token"
  | "lookup-token"
  | "insert-key"
  | "increment-count"
  | "complete";

export interface FrequencyEntry {
  readonly key: string;
  readonly count: number;
}

export interface OperationCounts {
  readonly lookups: number;
  readonly inserts: number;
  readonly increments: number;
}

interface SnapshotState {
  readonly tokens: readonly string[];
  readonly currentTokenIndex: number | null;
  readonly processedCount: number;
  readonly entries: readonly FrequencyEntry[];
  readonly lookupCount: number | null;
  readonly counts: OperationCounts;
  readonly line: PseudocodeLine;
  readonly explanation: string;
}

type SnapshotEvent =
  | { readonly kind: "start" }
  | {
      readonly kind: "inspect";
      readonly tokenIndex: number;
      readonly token: string;
    }
  | {
      readonly kind: "lookup";
      readonly tokenIndex: number;
      readonly token: string;
      readonly decision: "insert";
      readonly existingCount: null;
    }
  | {
      readonly kind: "lookup";
      readonly tokenIndex: number;
      readonly token: string;
      readonly decision: "increment";
      readonly existingCount: number;
    }
  | {
      readonly kind: "insert";
      readonly tokenIndex: number;
      readonly token: string;
      readonly count: 1;
    }
  | {
      readonly kind: "increment";
      readonly tokenIndex: number;
      readonly token: string;
      readonly previousCount: number;
      readonly nextCount: number;
    }
  | { readonly kind: "complete"; readonly result: readonly FrequencyEntry[] };

export type TraceSnapshot = Readonly<SnapshotState & SnapshotEvent>;

interface MutableState {
  currentTokenIndex: number | null;
  processedCount: number;
  frequencies: Map<string, number>;
  lookupCount: number | null;
  counts: {
    lookups: number;
    inserts: number;
    increments: number;
  };
}

export const DEFAULT_EXAMPLE = createExample([
  "red",
  "blue",
  "red",
  "gold",
  "blue",
  "red",
]);

export function parseExample(input: string): ParseResult {
  const parsed = parseLowercaseWordList(input);
  return parsed.ok ? validateExample(parsed.words) : parsed;
}

export function validateExample(tokens: readonly string[]): ParseResult {
  if (tokens.length < EXAMPLE_LIMITS.minTokens) {
    return failure("Enter at least one lowercase word.");
  }
  if (tokens.length > EXAMPLE_LIMITS.maxTokens) {
    return failure(
      `Use at most ${String(EXAMPLE_LIMITS.maxTokens)} words so every token and map slot stays visible.`,
    );
  }

  for (const [index, token] of tokens.entries()) {
    if (token.length < EXAMPLE_LIMITS.minTokenLength) {
      return failure(
        `Word ${String(index + 1)} is empty. Use at least ${String(EXAMPLE_LIMITS.minTokenLength)} lowercase letter.`,
      );
    }
    if (token.length > EXAMPLE_LIMITS.maxTokenLength) {
      return failure(
        `Word ${String(index + 1)} ${JSON.stringify(token)} is too long. Use at most ${String(EXAMPLE_LIMITS.maxTokenLength)} lowercase letters per word.`,
      );
    }

    const validation = validateLowercaseWord(token);
    if (!validation.ok) {
      return failure(`Word ${String(index + 1)}: ${validation.error}`);
    }
  }

  return { ok: true, value: createExample(tokens) };
}

export function generateTrace(example: Example): readonly TraceSnapshot[] {
  const state: MutableState = {
    currentTokenIndex: null,
    processedCount: 0,
    frequencies: new Map(),
    lookupCount: null,
    counts: { lookups: 0, inserts: 0, increments: 0 },
  };
  const trace: TraceSnapshot[] = [
    record(
      example,
      state,
      { kind: "start" },
      "initialize",
      "Start with an empty sparse key/count map.",
    ),
  ];

  for (const [tokenIndex, token] of example.tokens.entries()) {
    state.currentTokenIndex = tokenIndex;
    state.lookupCount = null;
    trace.push(
      record(
        example,
        state,
        { kind: "inspect", tokenIndex, token },
        "inspect-token",
        `Inspect token ${JSON.stringify(token)} at input position ${String(tokenIndex + 1)}.`,
      ),
    );

    const existingCount = state.frequencies.get(token);
    state.lookupCount = existingCount ?? null;
    state.counts.lookups += 1;
    if (existingCount === undefined) {
      trace.push(
        record(
          example,
          state,
          {
            kind: "lookup",
            tokenIndex,
            token,
            decision: "insert",
            existingCount: null,
          },
          "lookup-token",
          `${JSON.stringify(token)} is absent, so it needs a new key/count slot.`,
        ),
      );

      state.frequencies.set(token, 1);
      state.lookupCount = 1;
      state.processedCount += 1;
      state.counts.inserts += 1;
      trace.push(
        record(
          example,
          state,
          { kind: "insert", tokenIndex, token, count: 1 },
          "insert-key",
          `Insert ${JSON.stringify(token)} with count 1 at the end of the ordered map.`,
        ),
      );
      continue;
    }

    trace.push(
      record(
        example,
        state,
        {
          kind: "lookup",
          tokenIndex,
          token,
          decision: "increment",
          existingCount,
        },
        "lookup-token",
        `${JSON.stringify(token)} is already stored with count ${String(existingCount)}, so reuse its slot.`,
      ),
    );

    const nextCount = existingCount + 1;
    state.frequencies.set(token, nextCount);
    state.lookupCount = nextCount;
    state.processedCount += 1;
    state.counts.increments += 1;
    trace.push(
      record(
        example,
        state,
        {
          kind: "increment",
          tokenIndex,
          token,
          previousCount: existingCount,
          nextCount,
        },
        "increment-count",
        `Increment ${JSON.stringify(token)} from ${String(existingCount)} to ${String(nextCount)} without moving its slot.`,
      ),
    );
  }

  state.currentTokenIndex = null;
  state.lookupCount = null;
  const result = freezeEntries(state.frequencies);
  trace.push(
    record(
      example,
      state,
      { kind: "complete", result },
      "complete",
      `Return ${formatEntries(result)} in first-seen key order. Each token required one average O(1) lookup.`,
    ),
  );

  return Object.freeze(trace);
}

export function formatEntries(entries: readonly FrequencyEntry[]): string {
  return `{${entries.map(({ key, count }) => `${key}: ${String(count)}`).join(", ")}}`;
}

function record(
  example: Example,
  state: MutableState,
  event: SnapshotEvent,
  line: PseudocodeLine,
  explanation: string,
): TraceSnapshot {
  const frozenEvent =
    event.kind === "complete"
      ? { ...event, result: freezeEntryArray(event.result) }
      : event;
  return Object.freeze({
    ...frozenEvent,
    tokens: Object.freeze([...example.tokens]),
    currentTokenIndex: state.currentTokenIndex,
    processedCount: state.processedCount,
    entries: freezeEntries(state.frequencies),
    lookupCount: state.lookupCount,
    counts: Object.freeze({ ...state.counts }),
    line,
    explanation,
  });
}

function freezeEntries(
  frequencies: ReadonlyMap<string, number>,
): readonly FrequencyEntry[] {
  return Object.freeze(
    Array.from(frequencies, ([key, count]) => Object.freeze({ key, count })),
  );
}

function freezeEntryArray(
  entries: readonly FrequencyEntry[],
): readonly FrequencyEntry[] {
  return Object.freeze(
    entries.map(({ key, count }) => Object.freeze({ key, count })),
  );
}

function createExample(tokens: readonly string[]): Example {
  return Object.freeze({ tokens: Object.freeze([...tokens]) }) as Example;
}

function failure(error: string): ParseResult {
  return { ok: false, error };
}
