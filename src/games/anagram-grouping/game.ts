import { LOWERCASE_ASCII_ALPHABET } from "../../shared/lowercase-ascii";
import { randomInteger, shuffleCopy } from "../../shared/random";
import { validateExample, type Example, type TraceSnapshot } from "./algorithm";

export const EXAMPLE_PRESETS = Object.freeze([
  Object.freeze({ label: "Classic", value: "eat, tea, tan, ate, nat, bat" }),
  Object.freeze({ label: "Duplicates", value: "arc, car, arc, rat, tar" }),
  Object.freeze({ label: "Single", value: "solo" }),
  Object.freeze({ label: "No Matches", value: "one, two, six" }),
]);

export type ChallengeAction = "create" | "append";

export interface ChallengeDecision {
  readonly snapshotIndex: number;
  readonly wordIndex: number;
  readonly word: string;
  readonly signature: string;
  readonly expectedAction: ChallengeAction;
}

export type ChallengeSnapshot = Extract<
  TraceSnapshot,
  { readonly kind: "lookup" }
>;

export function generateProceduralExample(
  random: () => number = Math.random,
  previous?: Example,
): Example {
  const startIndex = randomInteger(
    random,
    0,
    LOWERCASE_ASCII_ALPHABET.length - 1,
  );
  let words = shuffleCopy(buildGeneratedWords(startIndex), random);

  if (sameWords(words, previous?.words)) {
    words = Object.freeze([...words.slice(1), words[0]!]);
  }

  const validated = validateExample(words);
  if (!validated.ok) {
    throw new Error(
      `Procedural generator created an invalid example: ${validated.error}`,
    );
  }
  return validated.value;
}

export function getChallengeDecisions(
  trace: readonly TraceSnapshot[],
): readonly ChallengeDecision[] {
  return Object.freeze(
    trace.flatMap((snapshot, snapshotIndex) => {
      if (snapshot.kind !== "lookup") return [];
      return [
        Object.freeze({
          snapshotIndex,
          wordIndex: snapshot.wordIndex,
          word: snapshot.word,
          signature: snapshot.lookupSignature,
          expectedAction: snapshot.decision,
        }),
      ];
    }),
  );
}

export function getChallengeSnapshot(
  trace: readonly TraceSnapshot[],
  decision: ChallengeDecision,
): ChallengeSnapshot {
  const snapshot = trace[decision.snapshotIndex];
  if (!snapshot || snapshot.kind !== "lookup") {
    throw new Error("Challenge decision does not reference a lookup snapshot.");
  }
  return snapshot;
}

function buildGeneratedWords(startIndex: number): readonly string[] {
  const character = (offset: number): string =>
    LOWERCASE_ASCII_ALPHABET.charAt(
      (startIndex + offset) % LOWERCASE_ASCII_ALPHABET.length,
    );
  return Object.freeze([
    `${character(0)}${character(1)}${character(2)}`,
    `${character(3)}${character(4)}${character(5)}`,
    `${character(1)}${character(0)}${character(2)}`,
    `${character(6)}${character(7)}`,
    `${character(5)}${character(3)}${character(4)}`,
  ]);
}

function sameWords(
  words: readonly string[],
  previous: readonly string[] | undefined,
): boolean {
  return (
    words.length === previous?.length &&
    words.every((word, index) => word === previous[index])
  );
}
