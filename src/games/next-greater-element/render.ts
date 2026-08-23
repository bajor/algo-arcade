import type {
  ChallengeActionOption,
  ChallengePrompt,
  DiagnosticEntry,
  PseudocodeEntry,
  StageLegendItem,
} from "../../shared/game-ui";
import type { TraceSnapshot } from "./algorithm";
import type { ChallengeAction, ChallengeDecision } from "./game";

export const PSEUDOCODE = [
  { id: "scan", code: "for each index i from left to right" },
  { id: "compare", code: "while stack and value[i] > value[stack.top]" },
  { id: "resolve", code: "answer[stack.pop()] = value[i]" },
  { id: "push", code: "stack.push(i)" },
  { id: "complete", code: "replace unresolved answers with -1" },
] as const satisfies readonly PseudocodeEntry[];

export const STAGE_LEGEND = [
  { label: "CURRENT", markerClass: "nge-legend-current" },
  { label: "IN STACK", markerClass: "nge-legend-stack" },
  { label: "RESOLVED", markerClass: "nge-legend-resolved" },
] as const satisfies readonly StageLegendItem[];

export const CHALLENGE_ACTIONS = [
  { action: "pop", cue: "YES", label: "POP TOP" },
  { action: "stop", cue: "NO", label: "STOP & PUSH" },
] as const satisfies readonly ChallengeActionOption<ChallengeAction>[];

export function renderStageBody(snapshot: TraceSnapshot): string {
  return `
    <div class="stage-layout">
      <div class="scan-deck">
        <div class="track-heading"><span>INPUT SIGNALS</span><span>LEFT TO RIGHT &gt;</span></div>
        <div class="signal-track">${renderSignals(snapshot)}</div>
        <div class="track-heading"><span>ANSWER BAY</span><span>NEXT GREATER VALUE</span></div>
        <div class="answer-track">${renderAnswers(snapshot)}</div>
      </div>
      ${renderStack(snapshot)}
    </div>
  `;
}

export function operationLabel(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  if (snapshot.kind === "compare" && hideDecision) return "DECISION ???";
  const labels: Record<TraceSnapshot["kind"], string> = {
    start: "READY",
    inspect: "SCAN",
    compare:
      snapshot.kind === "compare" && snapshot.decision === "resolve"
        ? "COMPARE: YES"
        : "COMPARE: NO",
    resolve: "POP + RESOLVE",
    push: "PUSH",
    complete: "COMPLETE",
  };
  return labels[snapshot.kind];
}

export function stageExplanation(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  return hideDecision
    ? "Choose the branch before the reactor executes it."
    : snapshot.explanation;
}

export function getDiagnostics(
  snapshot: TraceSnapshot,
  stepIndex: number,
  traceLength: number,
): readonly DiagnosticEntry[] {
  return [
    {
      label: "COMPARISONS",
      value: String(snapshot.counts.comparisons).padStart(2, "0"),
    },
    {
      label: "PUSHES",
      value: String(snapshot.counts.pushes).padStart(2, "0"),
    },
    {
      label: "POPS",
      value: String(snapshot.counts.pops).padStart(2, "0"),
    },
    {
      label: "TRACE",
      value: `${String(stepIndex + 1).padStart(2, "0")}/${String(traceLength).padStart(2, "0")}`,
    },
  ];
}

export function renderChallengePrompt(
  snapshot: TraceSnapshot,
  decision: ChallengeDecision,
  decisionNumber: number,
): ChallengePrompt {
  return {
    label: `WHILE LOOP DECISION ${String(decisionNumber)}`,
    heading: `CURRENT ${String(valueAt(snapshot, decision.currentIndex))} VS STACK TOP ${String(valueAt(snapshot, decision.topIndex))}`,
    question: "Is the current value strictly greater than the stack top?",
  };
}

export function explainChallengeAnswer(
  snapshot: TraceSnapshot,
  _decision: ChallengeDecision,
  answer: ChallengeAction,
): string {
  if (snapshot.kind !== "compare") {
    throw new Error("Challenge answer requires a comparison snapshot.");
  }
  const currentValue = valueAt(snapshot, snapshot.currentIndex);
  const topValue = valueAt(snapshot, snapshot.topIndex);
  const expected = snapshot.decision === "resolve" ? "pop" : "stop";
  if (answer === expected) {
    return expected === "pop"
      ? `Correct: ${String(currentValue)} > ${String(topValue)}, so the top resolves and pops.`
      : `Correct: ${String(currentValue)} is not greater than ${String(topValue)}, so popping stops.`;
  }
  return expected === "pop"
    ? `Try again: ${String(currentValue)} > ${String(topValue)}. The stack top has found its next greater value.`
    : `Try again: ${String(currentValue)} is not strictly greater than ${String(topValue)}. Keep the top in the stack.`;
}

function renderSignals(snapshot: TraceSnapshot): string {
  const topIndex = snapshot.stack.at(-1);
  return snapshot.values
    .map((value, index) => {
      const classes = ["signal-cell"];
      const answer = snapshot.result[index];
      if (snapshot.cursor === index) classes.push("is-current");
      if (snapshot.stack.includes(index)) classes.push("is-stacked");
      if (topIndex === index) classes.push("is-top");
      if (answer !== null && answer !== undefined) classes.push("is-resolved");

      return `
        <div class="${classes.join(" ")}" data-index="${String(index)}">
          <small>IDX ${String(index)}</small>
          <strong>${String(value)}</strong>
          <span>${signalStatus(snapshot, index)}</span>
        </div>
      `;
    })
    .join("");
}

function renderAnswers(snapshot: TraceSnapshot): string {
  return snapshot.result
    .map(
      (value, index) => `
        <div class="answer-cell ${value === null ? "is-waiting" : "is-locked"}">
          <small>${String(index)}</small>
          <strong>${value === null ? "?" : String(value)}</strong>
        </div>
      `,
    )
    .join("");
}

function renderStack(snapshot: TraceSnapshot): string {
  const slots = [...snapshot.stack]
    .reverse()
    .map(
      (index, position) => `
        <div class="stack-slot ${position === 0 ? "is-top" : ""}">
          <span>${position === 0 ? "TOP" : `+${String(position)}`}</span>
          <strong>${String(valueAt(snapshot, index))}</strong>
          <small>IDX ${String(index)}</small>
        </div>
      `,
    )
    .join("");

  return `
    <aside class="stack-reactor" aria-label="Monotonic stack, top item first">
      <div class="reactor-heading"><span>STACK REACTOR</span><i aria-hidden="true"></i></div>
      <div class="stack-slots">
        ${slots || '<div class="empty-stack">EMPTY<br /><small>AWAITING SIGNAL</small></div>'}
      </div>
      <p>Values stay decreasing from bottom to top.</p>
    </aside>
  `;
}

function signalStatus(snapshot: TraceSnapshot, index: number): string {
  if (snapshot.cursor === index) return "CURRENT";
  if (snapshot.stack.at(-1) === index) return "TOP";
  if (snapshot.stack.includes(index)) return "WAIT";
  if (snapshot.result[index] !== null) return "DONE";
  return "QUEUE";
}

function valueAt(snapshot: TraceSnapshot, index: number): number {
  const value = snapshot.values[index];
  if (value === undefined) {
    throw new Error("Trace references a value outside the example.");
  }
  return value;
}
