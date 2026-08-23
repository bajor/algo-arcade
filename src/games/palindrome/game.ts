import { randomInteger } from "../../shared/random";
import { LOWERCASE_ASCII_ALPHABET } from "../../shared/lowercase-ascii";
import {
  validateExample,
  type Example,
  type InspectDecision,
  type TraceSnapshot,
} from "./algorithm";

export const EXAMPLE_PRESETS = Object.freeze([
  Object.freeze({ label: "Palindrome", value: "racecar" }),
  Object.freeze({ label: "Not Palindrome", value: "algorithm" }),
]);

const GENERATED_LIMITS = Object.freeze({
  minHalfLength: 3,
  maxHalfLength: 5,
});
export type ChallengeAction = InspectDecision;

export interface ChallengeDecision {
  readonly snapshotIndex: number;
  readonly leftIndex: number;
  readonly rightIndex: number;
  readonly expectedAction: ChallengeAction;
}

export function generateProceduralExample(
  random: () => number = Math.random,
  previous?: Example,
): Example {
  const shouldGeneratePalindrome = randomInteger(random, 1, 3) === 1;
  const halfLength = randomInteger(
    random,
    GENERATED_LIMITS.minHalfLength,
    GENERATED_LIMITS.maxHalfLength,
  );
  const half = Array.from({ length: halfLength }, () =>
    randomCharacter(random),
  );
  const mirroredHalf = [...half].reverse();

  if (!shouldGeneratePalindrome) {
    const innerCharacter = half.at(-1);
    if (innerCharacter === undefined) {
      throw new Error("Generated half must contain a character.");
    }
    mirroredHalf[0] = nextCharacter(innerCharacter);
  }

  let value = `${half.join("")}${mirroredHalf.join("")}`;
  if (value === previous) {
    const firstCharacter = half[0];
    if (firstCharacter === undefined) {
      throw new Error("Generated half must contain a character.");
    }
    const replacement = nextCharacter(firstCharacter);
    half[0] = replacement;
    mirroredHalf[mirroredHalf.length - 1] = replacement;
    value = `${half.join("")}${mirroredHalf.join("")}`;
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
          leftIndex: snapshot.leftIndex,
          rightIndex: snapshot.rightIndex,
          expectedAction: snapshot.decision,
        }),
      ];
    }),
  );
}

export function getChallengeSnapshot(
  trace: readonly TraceSnapshot[],
  decision: ChallengeDecision,
): Extract<TraceSnapshot, { readonly kind: "inspect" }> {
  const snapshot = trace[decision.snapshotIndex];
  if (!snapshot || snapshot.kind !== "inspect") {
    throw new Error(
      "Challenge decision does not reference an inspect snapshot.",
    );
  }
  return snapshot;
}

function randomCharacter(random: () => number): string {
  const index = randomInteger(random, 0, LOWERCASE_ASCII_ALPHABET.length - 1);
  const character = LOWERCASE_ASCII_ALPHABET[index];
  if (character === undefined) {
    throw new Error("Random character index is outside the character set.");
  }
  return character;
}

function nextCharacter(character: string): string {
  const index = LOWERCASE_ASCII_ALPHABET.indexOf(character);
  return (
    LOWERCASE_ASCII_ALPHABET[(index + 1) % LOWERCASE_ASCII_ALPHABET.length] ??
    "a"
  );
}
