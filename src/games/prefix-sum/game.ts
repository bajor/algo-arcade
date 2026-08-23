import { randomInteger, shuffleCopy } from "../../shared/random";
import { validateExample, type Example, type TraceSnapshot } from "./algorithm";

export const EXAMPLE_PRESETS = Object.freeze([
  Object.freeze({
    label: "Relay sample",
    value: "2, -1, 4, 3 | 1:4",
  }),
  Object.freeze({ label: "Single zero", value: "0 | 0:1" }),
  Object.freeze({
    label: "Negative range",
    value: "-5, -2, -3 | 1:3",
  }),
  Object.freeze({
    label: "Cancel to zero",
    value: "5, -5, 0, 4 | 0:3",
  }),
]);

const GENERATED_LIMITS = Object.freeze({
  minItems: 6,
  maxItems: 9,
  minMagnitude: 1,
  maxMagnitude: 9,
  minFillValue: -9,
  maxFillValue: 9,
});

export type ChallengeAction = "add" | "subtract" | "ignore";

export interface ChallengeDecision {
  readonly snapshotIndex: number;
  readonly prefixIndex: number;
  readonly expectedAction: ChallengeAction;
}

export type ChallengeSnapshot = Extract<
  TraceSnapshot,
  { readonly kind: "accumulate" }
>;

export function generateProceduralExample(
  random: () => number = Math.random,
  previous?: Example,
): Example {
  const length = randomInteger(
    random,
    GENERATED_LIMITS.minItems,
    GENERATED_LIMITS.maxItems,
  );
  const values = [
    randomInteger(
      random,
      GENERATED_LIMITS.minMagnitude,
      GENERATED_LIMITS.maxMagnitude,
    ),
    -randomInteger(
      random,
      GENERATED_LIMITS.minMagnitude,
      GENERATED_LIMITS.maxMagnitude,
    ),
    0,
    randomInteger(
      random,
      GENERATED_LIMITS.minMagnitude,
      GENERATED_LIMITS.maxMagnitude,
    ),
    -randomInteger(
      random,
      GENERATED_LIMITS.minMagnitude,
      GENERATED_LIMITS.maxMagnitude,
    ),
  ];

  while (values.length < length) {
    values.push(
      randomInteger(
        random,
        GENERATED_LIMITS.minFillValue,
        GENERATED_LIMITS.maxFillValue,
      ),
    );
  }

  let shuffledValues = shuffleCopy(values, random);
  const start = randomInteger(random, 1, length - 2);
  const end = randomInteger(random, start + 2, length);
  if (matchesPrevious(shuffledValues, start, end, previous)) {
    shuffledValues = Object.freeze([
      ...shuffledValues.slice(1),
      shuffledValues[0]!,
    ]);
  }

  const validated = validateExample(shuffledValues, start, end);
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
      if (snapshot.kind !== "accumulate") return [];

      const prefixIndex = snapshot.inputIndex + 1;
      return [
        Object.freeze({
          snapshotIndex,
          prefixIndex,
          expectedAction: getRangeAction(snapshot, prefixIndex),
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
  if (!snapshot || snapshot.kind !== "accumulate") {
    throw new Error(
      "Challenge decision does not reference an accumulate snapshot.",
    );
  }
  return snapshot;
}

function getRangeAction(
  snapshot: ChallengeSnapshot,
  prefixIndex: number,
): ChallengeAction {
  if (prefixIndex === snapshot.end) return "add";
  if (prefixIndex === snapshot.start) return "subtract";
  return "ignore";
}

function matchesPrevious(
  values: readonly number[],
  start: number,
  end: number,
  previous: Example | undefined,
): boolean {
  return (
    previous?.start === start &&
    previous.end === end &&
    previous.values.length === values.length &&
    values.every((value, index) => value === previous.values[index])
  );
}
