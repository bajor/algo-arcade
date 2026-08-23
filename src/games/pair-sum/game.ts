import { randomInteger } from "../../shared/random";
import {
  validateExample,
  type CompareDecision,
  type Example,
  type TraceSnapshot,
} from "./algorithm";

export const EXAMPLE_PRESETS = Object.freeze([
  Object.freeze({
    label: "Mixed locks",
    value: "-4, -1, -1, 0, 1, 2, 2, 5, 10 | 4",
  }),
  Object.freeze({
    label: "Duplicate lock",
    value: "1, 1, 1, 2, 3, 3, 4, 4 | 5",
  }),
  Object.freeze({
    label: "Negative locks",
    value: "-10, -8, -5, -3, -2, 0, 4 | -10",
  }),
  Object.freeze({
    label: "No lock",
    value: "-6, -2, 1, 5, 9 | 20",
  }),
]);

const GENERATED_LIMITS = Object.freeze({
  minCenter: -70,
  maxCenter: 70,
  minScale: 1,
  maxScale: 3,
});

const GENERATED_OFFSETS = Object.freeze([
  -6, -5, -5, -5, -4, -3, -1, 1, 3, 5, 6, 8,
]);

export type ChallengeAction = CompareDecision;

export interface ChallengeDecision {
  readonly snapshotIndex: number;
  readonly leftIndex: number;
  readonly rightIndex: number;
  readonly leftValue: number;
  readonly rightValue: number;
  readonly currentSum: number;
  readonly target: number;
  readonly expectedAction: ChallengeAction;
}

export function generateProceduralExample(
  random: () => number = Math.random,
  previous?: Example,
): Example {
  const center = randomInteger(
    random,
    GENERATED_LIMITS.minCenter,
    GENERATED_LIMITS.maxCenter,
  );
  const scale = randomInteger(
    random,
    GENERATED_LIMITS.minScale,
    GENERATED_LIMITS.maxScale,
  );
  const candidate = generatedExample(center, scale);
  if (!previous || !examplesEqual(candidate, previous)) {
    return candidate;
  }

  const nextCenter =
    center === GENERATED_LIMITS.maxCenter
      ? GENERATED_LIMITS.minCenter
      : center + 1;
  return generatedExample(nextCenter, scale);
}

export function getChallengeDecisions(
  trace: readonly TraceSnapshot[],
): readonly ChallengeDecision[] {
  return Object.freeze(
    trace.flatMap((snapshot, snapshotIndex) => {
      if (snapshot.kind !== "compare") {
        return [];
      }

      const leftValue = snapshot.values[snapshot.left];
      const rightValue = snapshot.values[snapshot.right];
      if (
        leftValue === undefined ||
        rightValue === undefined ||
        snapshot.currentSum === null
      ) {
        throw new Error("Comparison snapshot has invalid pointer data.");
      }

      return [
        Object.freeze({
          snapshotIndex,
          leftIndex: snapshot.left,
          rightIndex: snapshot.right,
          leftValue,
          rightValue,
          currentSum: snapshot.currentSum,
          target: snapshot.target,
          expectedAction: snapshot.decision,
        }),
      ];
    }),
  );
}

export function getChallengeSnapshot(
  trace: readonly TraceSnapshot[],
  decision: ChallengeDecision,
): Extract<TraceSnapshot, { readonly kind: "compare" }> {
  const snapshot = trace[decision.snapshotIndex];
  if (!snapshot || snapshot.kind !== "compare") {
    throw new Error(
      "Challenge decision does not reference a comparison snapshot.",
    );
  }
  return snapshot;
}

function generatedExample(center: number, scale: number): Example {
  const values = GENERATED_OFFSETS.map((offset) => center + offset * scale);
  const validated = validateExample(values, center * 2);
  if (!validated.ok) {
    throw new Error(
      `Procedural generator created an invalid example: ${validated.error}`,
    );
  }
  return validated.value;
}

function examplesEqual(first: Example, second: Example): boolean {
  return (
    first.target === second.target &&
    first.values.length === second.values.length &&
    first.values.every((value, index) => value === second.values[index])
  );
}
