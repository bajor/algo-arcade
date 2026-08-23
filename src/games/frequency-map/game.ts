import { LOWERCASE_ASCII_ALPHABET } from "../../shared/lowercase-ascii";
import { randomInteger, shuffleCopy } from "../../shared/random";
import {
  validateExample,
  type Example,
  type LookupDecision,
  type TraceSnapshot,
} from "./algorithm";

export const EXAMPLE_PRESETS = Object.freeze([
  Object.freeze({
    label: "Color tally",
    value: "red, blue, red, gold, blue, red",
  }),
  Object.freeze({ label: "One token", value: "pixel" }),
  Object.freeze({ label: "All repeats", value: "coin, coin, coin, coin" }),
  Object.freeze({ label: "Stable order", value: "oak, ash, oak, elm, ash" }),
]);

export type ChallengeAction = LookupDecision;

export interface ChallengeDecision {
  readonly snapshotIndex: number;
  readonly tokenIndex: number;
  readonly token: string;
  readonly existingCount: number | null;
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
  let tokens = shuffleCopy(buildGeneratedTokens(startIndex), random);

  if (sameTokens(tokens, previous?.tokens)) {
    tokens = Object.freeze([...tokens.slice(1), tokens[0]!]);
  }

  const validated = validateExample(tokens);
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
    trace.flatMap((snapshot, snapshotIndex) =>
      snapshot.kind === "lookup"
        ? [
            Object.freeze({
              snapshotIndex,
              tokenIndex: snapshot.tokenIndex,
              token: snapshot.token,
              existingCount: snapshot.existingCount,
              expectedAction: snapshot.decision,
            }),
          ]
        : [],
    ),
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

function buildGeneratedTokens(startIndex: number): readonly string[] {
  const word = (offset: number): string => {
    const character = LOWERCASE_ASCII_ALPHABET.charAt(
      (startIndex + offset) % LOWERCASE_ASCII_ALPHABET.length,
    );
    return character.repeat(3);
  };
  return Object.freeze([
    word(0),
    word(1),
    word(2),
    word(0),
    word(3),
    word(1),
    word(0),
  ]);
}

function sameTokens(
  tokens: readonly string[],
  previous: readonly string[] | undefined,
): boolean {
  return (
    tokens.length === previous?.length &&
    tokens.every((token, index) => token === previous[index])
  );
}
