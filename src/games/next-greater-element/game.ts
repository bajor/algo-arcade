import { randomInteger } from "../../shared/random";
import { validateExample, type Example, type TraceSnapshot } from "./algorithm";

export const EXAMPLE_PRESETS = Object.freeze([
  { label: "Mixed", value: "2, 1, 2, 4, 3" },
  { label: "Rising", value: "1, 3, 5, 7" },
  { label: "Falling", value: "8, 6, 4, 2" },
  { label: "Duplicates", value: "3, 3, 1, 3" },
]);

const GENERATED_LIMITS = Object.freeze({
  minItems: 5,
  maxItems: 8,
  minValue: -9,
  maxValue: 9,
  minAnchor: -5,
  maxAnchor: 5,
  minOffset: 1,
  maxOffset: 3,
});

export type ChallengeAction = "pop" | "stop";

export interface ChallengeDecision {
  readonly snapshotIndex: number;
  readonly currentIndex: number;
  readonly topIndex: number;
  readonly expectedAction: ChallengeAction;
}

export function generateProceduralExample(
  random: () => number = Math.random,
  previous?: readonly number[],
): Example {
  const length = randomInteger(
    random,
    GENERATED_LIMITS.minItems,
    GENERATED_LIMITS.maxItems,
  );
  const anchor = randomInteger(
    random,
    GENERATED_LIMITS.minAnchor,
    GENERATED_LIMITS.maxAnchor,
  );
  const drop = randomInteger(
    random,
    GENERATED_LIMITS.minOffset,
    GENERATED_LIMITS.maxOffset,
  );
  const rise = randomInteger(
    random,
    GENERATED_LIMITS.minOffset,
    GENERATED_LIMITS.maxOffset,
  );
  const popFirst = randomInteger(random, 0, 1) === 0;
  const lowerValue = anchor - drop;
  const higherValue = anchor + rise;
  const values = popFirst
    ? [anchor, higherValue, lowerValue]
    : [anchor, lowerValue, higherValue];

  while (values.length < length) {
    values.push(
      randomInteger(
        random,
        GENERATED_LIMITS.minValue,
        GENERATED_LIMITS.maxValue,
      ),
    );
  }

  const repeatsPrevious =
    previous?.length === values.length &&
    values.every((value, index) => value === previous[index]);
  if (repeatsPrevious) {
    const lastIndex = values.length - 1;
    const lastValue = values[lastIndex];
    if (lastValue !== undefined) {
      values[lastIndex] =
        lastValue === GENERATED_LIMITS.maxValue
          ? GENERATED_LIMITS.minValue
          : lastValue + 1;
    }
  }

  const validated = validateExample(values);
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
      if (snapshot.kind !== "compare") {
        return [];
      }

      return [
        Object.freeze({
          snapshotIndex,
          currentIndex: snapshot.currentIndex,
          topIndex: snapshot.topIndex,
          expectedAction: snapshot.decision === "resolve" ? "pop" : "stop",
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
