import { randomInteger } from "../../shared/random";
import { validateExample, type Example, type TraceSnapshot } from "./algorithm";

export const EXAMPLE_PRESETS = Object.freeze([
  Object.freeze({
    label: "Classic",
    value: "2, 3, 1, 2, 4, 3 | 7",
  }),
  Object.freeze({ label: "One item", value: "8 | 7" }),
  Object.freeze({
    label: "Repeated shrink",
    value: "1, 2, 3, 4 | 6",
  }),
  Object.freeze({ label: "No solution", value: "1, 2, 3 | 10" }),
]);

const GENERATED_LIMITS = Object.freeze({
  minItems: 5,
  maxItems: 8,
  minTarget: 8,
  maxTarget: 30,
  maxRescueOffset: 20,
});

export type ChallengeAction = "expand" | "shrink";

export interface ChallengeDecision {
  readonly snapshotIndex: number;
  readonly left: number;
  readonly right: number;
  readonly sum: number;
  readonly expectedAction: ChallengeAction;
}

export function generateProceduralExample(
  random: () => number = Math.random,
  previous?: Example,
): Example {
  const length = randomInteger(
    random,
    GENERATED_LIMITS.minItems,
    GENERATED_LIMITS.maxItems,
  );
  const target = randomInteger(
    random,
    GENERATED_LIMITS.minTarget,
    GENERATED_LIMITS.maxTarget,
  );
  const prefixMaximum = Math.floor((target - 1) / 2);
  const first = randomInteger(random, 1, prefixMaximum);
  const second = randomInteger(random, 1, prefixMaximum);
  const rescue = randomInteger(
    random,
    target,
    target + GENERATED_LIMITS.maxRescueOffset,
  );
  const values = [
    first,
    second,
    rescue,
    ...Array.from({ length: length - 3 }, () =>
      randomInteger(random, 1, target - 1),
    ),
  ];

  if (matchesPrevious(values, target, previous)) {
    const lastIndex = values.length - 1;
    const lastValue = values[lastIndex];
    if (lastValue === undefined) {
      throw new Error("Procedural example must contain a trailing value.");
    }
    values[lastIndex] = lastValue === target - 1 ? 1 : lastValue + 1;
  }

  const validated = validateExample(values, target);
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
      if (snapshot.kind !== "decide") {
        return [];
      }

      return [
        Object.freeze({
          snapshotIndex,
          left: snapshot.left,
          right: snapshot.right,
          sum: snapshot.sum,
          expectedAction: snapshot.decision,
        }),
      ];
    }),
  );
}

export function getChallengeSnapshot(
  trace: readonly TraceSnapshot[],
  decision: ChallengeDecision,
): Extract<TraceSnapshot, { readonly kind: "decide" }> {
  const snapshot = trace[decision.snapshotIndex];
  if (!snapshot || snapshot.kind !== "decide") {
    throw new Error("Challenge decision does not reference a decide snapshot.");
  }
  return snapshot;
}

function matchesPrevious(
  values: readonly number[],
  target: number,
  previous: Example | undefined,
): boolean {
  return (
    previous?.target === target &&
    previous.values.length === values.length &&
    values.every((value, index) => value === previous.values[index])
  );
}
