import type { GameDefinition } from "../../app/registry";
import type { TraceSnapshot } from "./algorithm";

export const nextGreaterElementMetadata = {
  slug: "next-greater-element",
  title: "Stack Reactor",
  technique: "Monotonic Stack",
  description:
    "Scan a signal row, keep unresolved values in order, and pop the stack when a stronger signal arrives.",
  difficulty: "Beginner",
} satisfies Omit<GameDefinition, "load">;

export const EXAMPLE_PRESETS = Object.freeze([
  { label: "Mixed", value: "2, 1, 2, 4, 3" },
  { label: "Rising", value: "1, 3, 5, 7" },
  { label: "Falling", value: "8, 6, 4, 2" },
  { label: "Duplicates", value: "3, 3, 1, 3" },
]);

export type ChallengeAction = "pop" | "stop";

export interface ChallengeDecision {
  readonly snapshotIndex: number;
  readonly currentIndex: number;
  readonly topIndex: number;
  readonly expectedAction: ChallengeAction;
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
