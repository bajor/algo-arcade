import { randomInteger, shuffleCopy } from "../../shared/random";
import {
  HISTOGRAM_BINS,
  validateExample,
  type BinId,
  type Example,
  type TraceSnapshot,
} from "./algorithm";

export const EXAMPLE_PRESETS = Object.freeze([
  Object.freeze({
    label: "Forge sample",
    value: "4, 18, 26, 31, 51, 74, 75, 99, 26",
  }),
  Object.freeze({ label: "Boundary check", value: "24, 25, 49, 50, 74, 75" }),
  Object.freeze({ label: "Equal towers", value: "0, 25, 50, 75" }),
  Object.freeze({ label: "Upper bin", value: "75, 80, 88, 99" }),
]);

export type ChallengeAction = BinId;

export interface ChallengeDecision {
  readonly snapshotIndex: number;
  readonly valueIndex: number;
  readonly value: number;
  readonly expectedAction: ChallengeAction;
}

export type ChallengeSnapshot = Extract<
  TraceSnapshot,
  { readonly kind: "classify" }
>;

export function generateProceduralExample(
  random: () => number = Math.random,
  previous?: Example,
): Example {
  const tallestBinIndex = randomInteger(random, 0, HISTOGRAM_BINS.length - 1);
  const tallestBin = HISTOGRAM_BINS[tallestBinIndex];
  if (!tallestBin) {
    throw new Error("Procedural generator selected an invalid histogram bin.");
  }

  const values = HISTOGRAM_BINS.map((bin) =>
    randomInteger(random, bin.minimum, bin.maximum),
  );
  values.push(
    randomInteger(random, tallestBin.minimum, tallestBin.maximum),
    randomInteger(random, tallestBin.minimum, tallestBin.maximum),
  );
  let shuffledValues = shuffleCopy(values, random);

  if (matchesPrevious(shuffledValues, previous)) {
    shuffledValues = Object.freeze([
      ...shuffledValues.slice(1),
      shuffledValues[0]!,
    ]);
  }

  const validated = validateExample(shuffledValues);
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
      snapshot.kind === "classify"
        ? [
            Object.freeze({
              snapshotIndex,
              valueIndex: snapshot.classifiedIndex,
              value: snapshot.value,
              expectedAction: snapshot.binId,
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
  if (!snapshot || snapshot.kind !== "classify") {
    throw new Error(
      "Challenge decision does not reference a classify snapshot.",
    );
  }
  return snapshot;
}

function matchesPrevious(
  values: readonly number[],
  previous: Example | undefined,
): boolean {
  return (
    previous?.length === values.length &&
    values.every((value, index) => value === previous[index])
  );
}
