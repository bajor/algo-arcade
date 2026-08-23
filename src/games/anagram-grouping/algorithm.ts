import {
  parseLowercaseWordList,
  validateLowercaseWord,
} from "../../shared/lowercase-word-list";

const EXAMPLE_BRAND: unique symbol = Symbol("AnagramGroupingExample");

export const EXAMPLE_LIMITS = Object.freeze({
  minWords: 1,
  maxWords: 10,
  minWordLength: 1,
  maxWordLength: 10,
});

export interface Example {
  readonly words: readonly string[];
  readonly [EXAMPLE_BRAND]: true;
}

export type ParseResult =
  | { readonly ok: true; readonly value: Example }
  | { readonly ok: false; readonly error: string };

export type LookupDecision = "create" | "append";

export type PseudocodeLine =
  | "initialize"
  | "inspect"
  | "build-signature"
  | "lookup"
  | "create-group"
  | "append-word"
  | "complete";

export interface SignatureEntry {
  readonly signature: string;
  readonly groupIndex: number;
}

export interface OperationCounts {
  readonly inspections: number;
  readonly signatures: number;
  readonly lookups: number;
  readonly groupsCreated: number;
  readonly appends: number;
}

interface SnapshotState {
  readonly words: readonly string[];
  readonly activeWordIndex: number | null;
  readonly signature: string | null;
  readonly processedCount: number;
  readonly signatureEntries: readonly SignatureEntry[];
  readonly groups: readonly (readonly string[])[];
  readonly counts: OperationCounts;
  readonly line: PseudocodeLine;
  readonly explanation: string;
}

type SnapshotEvent =
  | { readonly kind: "start" }
  | {
      readonly kind: "inspect";
      readonly wordIndex: number;
      readonly word: string;
    }
  | {
      readonly kind: "build-signature";
      readonly wordIndex: number;
      readonly word: string;
      readonly builtSignature: string;
    }
  | {
      readonly kind: "lookup";
      readonly wordIndex: number;
      readonly word: string;
      readonly lookupSignature: string;
      readonly decision: "create";
    }
  | {
      readonly kind: "lookup";
      readonly wordIndex: number;
      readonly word: string;
      readonly lookupSignature: string;
      readonly decision: "append";
      readonly groupIndex: number;
    }
  | {
      readonly kind: "create-group";
      readonly wordIndex: number;
      readonly word: string;
      readonly groupIndex: number;
    }
  | {
      readonly kind: "append-word";
      readonly wordIndex: number;
      readonly word: string;
      readonly groupIndex: number;
    }
  | {
      readonly kind: "complete";
      readonly result: readonly (readonly string[])[];
    };

export type TraceSnapshot = Readonly<SnapshotState & SnapshotEvent>;

interface MutableState {
  activeWordIndex: number | null;
  signature: string | null;
  processedCount: number;
  signatureToGroup: Map<string, number>;
  groups: string[][];
  counts: {
    inspections: number;
    signatures: number;
    lookups: number;
    groupsCreated: number;
    appends: number;
  };
}

export const DEFAULT_EXAMPLE = createExample([
  "eat",
  "tea",
  "tan",
  "ate",
  "nat",
  "bat",
]);

export function parseExample(input: string): ParseResult {
  const parsed = parseLowercaseWordList(input);
  return parsed.ok ? validateExample(parsed.words) : parsed;
}

export function validateExample(words: readonly string[]): ParseResult {
  if (words.length < EXAMPLE_LIMITS.minWords) {
    return failure("Enter at least one lowercase word.");
  }
  if (words.length > EXAMPLE_LIMITS.maxWords) {
    return failure(
      `Use at most ${String(EXAMPLE_LIMITS.maxWords)} words so every group stays visible.`,
    );
  }

  for (const [index, word] of words.entries()) {
    if (word.length < EXAMPLE_LIMITS.minWordLength) {
      return failure(
        `Word ${String(index + 1)} is empty. Use at least ${String(EXAMPLE_LIMITS.minWordLength)} lowercase letter.`,
      );
    }
    if (word.length > EXAMPLE_LIMITS.maxWordLength) {
      return failure(
        `Word ${String(index + 1)} ${JSON.stringify(word)} is too long. Use at most ${String(EXAMPLE_LIMITS.maxWordLength)} lowercase letters per word.`,
      );
    }

    const validation = validateLowercaseWord(word);
    if (!validation.ok) {
      return failure(`Word ${String(index + 1)}: ${validation.error}`);
    }
  }

  return { ok: true, value: createExample(words) };
}

export function buildSignature(word: string): string {
  return Array.from(word).sort().join("");
}

export function generateTrace(example: Example): readonly TraceSnapshot[] {
  const state: MutableState = {
    activeWordIndex: null,
    signature: null,
    processedCount: 0,
    signatureToGroup: new Map(),
    groups: [],
    counts: {
      inspections: 0,
      signatures: 0,
      lookups: 0,
      groupsCreated: 0,
      appends: 0,
    },
  };
  const trace: TraceSnapshot[] = [
    record(
      example,
      state,
      { kind: "start" },
      "initialize",
      "Start with an empty signature directory and no output groups.",
    ),
  ];

  for (const [wordIndex, word] of example.words.entries()) {
    state.activeWordIndex = wordIndex;
    state.signature = null;
    state.counts.inspections += 1;
    trace.push(
      record(
        example,
        state,
        { kind: "inspect", wordIndex, word },
        "inspect",
        `Inspect ${JSON.stringify(word)} at input position ${String(wordIndex + 1)}.`,
      ),
    );

    const signature = buildSignature(word);
    state.signature = signature;
    state.counts.signatures += 1;
    trace.push(
      record(
        example,
        state,
        { kind: "build-signature", wordIndex, word, builtSignature: signature },
        "build-signature",
        `Sort the letters in ${JSON.stringify(word)} to build signature ${JSON.stringify(signature)}.`,
      ),
    );

    const groupIndex = state.signatureToGroup.get(signature);
    state.counts.lookups += 1;
    if (groupIndex === undefined) {
      trace.push(
        record(
          example,
          state,
          {
            kind: "lookup",
            wordIndex,
            word,
            lookupSignature: signature,
            decision: "create",
          },
          "lookup",
          `Signature ${JSON.stringify(signature)} is not in the directory, so create the next ordered group.`,
        ),
      );

      const createdGroupIndex = state.groups.length;
      state.signatureToGroup.set(signature, createdGroupIndex);
      state.groups.push([word]);
      state.processedCount += 1;
      state.counts.groupsCreated += 1;
      trace.push(
        record(
          example,
          state,
          {
            kind: "create-group",
            wordIndex,
            word,
            groupIndex: createdGroupIndex,
          },
          "create-group",
          `Create group ${String(createdGroupIndex + 1)} for signature ${JSON.stringify(signature)} and place ${JSON.stringify(word)} in it.`,
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
          wordIndex,
          word,
          lookupSignature: signature,
          decision: "append",
          groupIndex,
        },
        "lookup",
        `Signature ${JSON.stringify(signature)} already points to group ${String(groupIndex + 1)}, so append the word there.`,
      ),
    );

    const group = state.groups[groupIndex];
    if (!group) {
      throw new Error("Signature directory points outside the output groups.");
    }
    group.push(word);
    state.processedCount += 1;
    state.counts.appends += 1;
    trace.push(
      record(
        example,
        state,
        { kind: "append-word", wordIndex, word, groupIndex },
        "append-word",
        `Append ${JSON.stringify(word)} to existing group ${String(groupIndex + 1)} without changing group order.`,
      ),
    );
  }

  state.activeWordIndex = null;
  state.signature = null;
  trace.push(
    record(
      example,
      state,
      { kind: "complete", result: freezeGroups(state.groups) },
      "complete",
      `Return ${formatGroups(state.groups)}. Sorting each word costs O(k log k), for O(n * k log k) time and O(n * k) output space.`,
    ),
  );

  return Object.freeze(trace);
}

export function formatGroups(groups: readonly (readonly string[])[]): string {
  return `[${groups.map((group) => `[${group.join(",")}]`).join(",")}]`;
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
      ? { ...event, result: freezeGroups(event.result) }
      : event;
  return Object.freeze({
    ...frozenEvent,
    words: Object.freeze([...example.words]),
    activeWordIndex: state.activeWordIndex,
    signature: state.signature,
    processedCount: state.processedCount,
    signatureEntries: Object.freeze(
      Array.from(state.signatureToGroup, ([entrySignature, groupIndex]) =>
        Object.freeze({ signature: entrySignature, groupIndex }),
      ),
    ),
    groups: freezeGroups(state.groups),
    counts: Object.freeze({ ...state.counts }),
    line,
    explanation,
  });
}

function createExample(words: readonly string[]): Example {
  return Object.freeze({ words: Object.freeze([...words]) }) as Example;
}

function freezeGroups(
  groups: readonly (readonly string[])[],
): readonly (readonly string[])[] {
  return Object.freeze(groups.map((group) => Object.freeze([...group])));
}

function failure(error: string): ParseResult {
  return { ok: false, error };
}
