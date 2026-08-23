import { randomInteger } from "../../shared/random";
import {
  validateExample,
  type Example,
  type InspectDecision,
  type TraceSnapshot,
} from "./algorithm";

export const EXAMPLE_PRESETS = Object.freeze([
  Object.freeze({ label: "Phrase", value: "Never odd or even" }),
  Object.freeze({
    label: "Punctuation",
    value: "A man, a plan, a canal: Panama!",
  }),
  Object.freeze({ label: "Mismatch", value: "Mirror scan" }),
  Object.freeze({ label: "Digits", value: "12 3 21" }),
]);

const GENERATED_LIMITS = Object.freeze({
  minHalfLength: 3,
  maxHalfLength: 5,
});
const ALPHANUMERIC_CHARACTERS = "abcdefghijklmnopqrstuvwxyz";
const LEFT_NOISE = Object.freeze(["! ", "?.", "[ "]);
const RIGHT_NOISE = Object.freeze([" ?", "-!", " ]"]);

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
  const halfLength = randomInteger(
    random,
    GENERATED_LIMITS.minHalfLength,
    GENERATED_LIMITS.maxHalfLength,
  );
  const half = Array.from({ length: halfLength }, () =>
    randomCharacter(random),
  );
  const isPalindrome = randomInteger(random, 0, 1) === 0;
  let leftNoise = randomItem(random, LEFT_NOISE);
  const rightNoise = randomItem(random, RIGHT_NOISE);
  const mirroredHalf = [...half]
    .reverse()
    .map((character) => character.toUpperCase());

  if (!isPalindrome) {
    const innerCharacter = half.at(-1);
    if (innerCharacter === undefined) {
      throw new Error("Generated half must contain a character.");
    }
    mirroredHalf[0] = nextCharacter(innerCharacter).toUpperCase();
  }

  let phrase = buildPhrase(leftNoise, half, mirroredHalf, rightNoise);
  if (phrase === previous) {
    leftNoise = leftNoise.startsWith("!")
      ? `?${leftNoise.slice(1)}`
      : `!${leftNoise.slice(1)}`;
    phrase = buildPhrase(leftNoise, half, mirroredHalf, rightNoise);
  }

  const validated = validateExample(phrase);
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
  const index = randomInteger(random, 0, ALPHANUMERIC_CHARACTERS.length - 1);
  const character = ALPHANUMERIC_CHARACTERS[index];
  if (character === undefined) {
    throw new Error("Random character index is outside the character set.");
  }
  return character;
}

function randomItem<T>(random: () => number, items: readonly T[]): T {
  const item = items[randomInteger(random, 0, items.length - 1)];
  if (item === undefined) {
    throw new Error("Cannot choose from an empty collection.");
  }
  return item;
}

function nextCharacter(character: string): string {
  const index = ALPHANUMERIC_CHARACTERS.indexOf(character);
  return (
    ALPHANUMERIC_CHARACTERS[(index + 1) % ALPHANUMERIC_CHARACTERS.length] ?? "a"
  );
}

function buildPhrase(
  leftNoise: string,
  half: readonly string[],
  mirroredHalf: readonly string[],
  rightNoise: string,
): string {
  return `${leftNoise}${half.join("")}:${mirroredHalf.join("")}${rightNoise}`;
}
