import { randomInteger } from "../../shared/random";
import { LOWERCASE_ASCII_ALPHABET } from "../../shared/lowercase-ascii";
import { validateExample, type Example, type TraceSnapshot } from "./algorithm";

export const EXAMPLE_PRESETS = Object.freeze([
  Object.freeze({ label: "Classic", value: "abcabcbb" }),
  Object.freeze({ label: "All Same", value: "bbbbb" }),
  Object.freeze({ label: "Split Repeat", value: "pwwkew" }),
  Object.freeze({ label: "All Unique", value: "algorithm" }),
]);

export type ChallengeAction = "expand" | "shrink";

export interface ChallengeDecision {
  readonly snapshotIndex: number;
  readonly incomingIndex: number;
  readonly character: string;
  readonly expectedAction: ChallengeAction;
}

export type ChallengeSnapshot = Extract<
  TraceSnapshot,
  { readonly kind: "inspect" }
>;

export function generateProceduralExample(
  random: () => number = Math.random,
  previous?: string,
): Example {
  let startIndex = randomInteger(
    random,
    0,
    LOWERCASE_ASCII_ALPHABET.length - 1,
  );
  let value = buildGeneratedValue(startIndex);

  if (value === previous) {
    startIndex = (startIndex + 1) % LOWERCASE_ASCII_ALPHABET.length;
    value = buildGeneratedValue(startIndex);
  }

  const validated = validateExample(value);
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
      if (snapshot.kind !== "inspect") {
        return [];
      }

      return [
        Object.freeze({
          snapshotIndex,
          incomingIndex: snapshot.inspectedIndex,
          character: snapshot.character,
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
  if (!snapshot || snapshot.kind !== "inspect") {
    throw new Error(
      "Challenge decision does not reference an inspect snapshot.",
    );
  }
  return snapshot;
}

function buildGeneratedValue(startIndex: number): string {
  const character = (offset: number): string =>
    LOWERCASE_ASCII_ALPHABET.charAt(
      (startIndex + offset) % LOWERCASE_ASCII_ALPHABET.length,
    );
  return [
    character(0),
    character(1),
    character(2),
    character(1),
    character(3),
    character(4),
    character(5),
  ].join("");
}
