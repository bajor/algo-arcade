import {
  escapeHtml,
  type ChallengeActionOption,
  type ChallengePrompt,
  type DiagnosticEntry,
  type PseudocodeEntry,
  type StageLegendItem,
} from "../../shared/game-ui";
import type { TraceSnapshot } from "./algorithm";
import type {
  ChallengeAction,
  ChallengeDecision,
  ChallengeSnapshot,
} from "./game";

export const PSEUDOCODE = [
  { id: "initialize", code: "prefix = [0]" },
  {
    id: "accumulate",
    code: "for value in values: prefix.push(prefix.last + value)",
  },
  { id: "read-start", code: "before = prefix[start]" },
  { id: "read-end", code: "throughEnd = prefix[end]" },
  { id: "subtract", code: "rangeSum = throughEnd - before" },
  { id: "complete", code: "return rangeSum" },
] as const satisfies readonly PseudocodeEntry[];

export const STAGE_LEGEND = [
  { label: "CURRENT INPUT", markerClass: "prefix-legend-current" },
  { label: "BUILT PREFIX", markerClass: "prefix-legend-built" },
  { label: "QUERY START", markerClass: "prefix-legend-start" },
  { label: "QUERY END", markerClass: "prefix-legend-end" },
] as const satisfies readonly StageLegendItem[];

export const CHALLENGE_ACTIONS = [
  { action: "add", cue: "+", label: "ADD" },
  { action: "subtract", cue: "-", label: "SUBTRACT" },
  { action: "ignore", cue: "X", label: "IGNORE" },
] as const satisfies readonly ChallengeActionOption<ChallengeAction>[];

export function renderStageBody(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  return `
    <div class="prefix-relay-layout">
      <div class="relay-deck">
        <div class="range-ticket">
          <span>HALF-OPEN QUERY</span>
          <strong>[${numberText(snapshot.start)}, ${numberText(snapshot.end)})</strong>
          <small>${numberText(snapshot.end - snapshot.start)} VALUES SELECTED</small>
        </div>
        <div class="relay-track-heading"><span>INPUT BATONS</span><span>VALUES FEED PREFIX &gt;</span></div>
        <div class="relay-scroll" tabindex="0" data-focus="stage-scroll" aria-label="Scrollable input and prefix tracks">
          <div class="relay-input-track">${renderInputCells(snapshot)}</div>
          <div class="prefix-connector" aria-hidden="true"><i></i><span>RUNNING TOTAL</span><i></i></div>
          <div class="prefix-track">${renderPrefixCells(snapshot, hideDecision)}</div>
        </div>
      </div>
      <aside class="query-terminal" aria-label="Prefix query terminal">
        ${renderCurrentInput(snapshot)}
        ${renderBoundaryBank(snapshot)}
        ${renderEquation(snapshot)}
        ${renderSummary(snapshot)}
      </aside>
    </div>
  `;
}

export function operationLabel(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  switch (snapshot.kind) {
    case "start":
      return "RELAY READY // LEADING ZERO";
    case "accumulate":
      return hideDecision
        ? "RANGE ROLE // CHOOSE ACTION"
        : `ACCUMULATE // ${snapshot.change.toUpperCase()}`;
    case "read-start":
      return "LOOKUP // QUERY START";
    case "read-end":
      return "LOOKUP // QUERY END";
    case "subtract":
      return "SUBTRACT // ISOLATE RANGE";
    case "complete":
      return "RANGE RELAY COMPLETE";
  }
}

export function stageExplanation(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  if (!hideDecision || snapshot.kind !== "accumulate") {
    return snapshot.explanation;
  }

  return `P[${String(snapshot.inputIndex + 1)}] = ${String(snapshot.nextTotal)} is built. For query [${String(snapshot.start)}, ${String(snapshot.end)}), decide whether to add, subtract, or ignore this prefix cell.`;
}

export function getDiagnostics(
  snapshot: TraceSnapshot,
  stepIndex: number,
  traceLength: number,
): readonly DiagnosticEntry[] {
  return [
    {
      label: "ADDITIONS",
      value: padCount(snapshot.counts.additions),
    },
    { label: "LOOKUPS", value: padCount(snapshot.counts.lookups) },
    {
      label: "SUBTRACTIONS",
      value: padCount(snapshot.counts.subtractions),
    },
    {
      label: "TRACE",
      value: `${padCount(stepIndex + 1)}/${padCount(traceLength)}`,
    },
  ];
}

export function renderChallengePrompt(
  snapshot: ChallengeSnapshot,
  decision: ChallengeDecision,
  decisionNumber: number,
): ChallengePrompt {
  return {
    label: `RANGE ROLE DECISION ${String(decisionNumber)}`,
    heading: `P[${String(decision.prefixIndex)}] = ${String(snapshot.nextTotal)} // QUERY [${String(snapshot.start)}, ${String(snapshot.end)})`,
    question:
      "Should this built prefix value be added, subtracted, or ignored?",
  };
}

export function explainChallengeAnswer(
  snapshot: ChallengeSnapshot,
  decision: ChallengeDecision,
  answer: ChallengeAction,
  isCorrect: boolean,
): string {
  const equation = `prefix[${String(snapshot.end)}] - prefix[${String(snapshot.start)}] = P[${String(snapshot.end)}] - P[${String(snapshot.start)}]`;
  const role = explainRangeRole(snapshot, decision);
  if (isCorrect) {
    return `Correct: ${equation}. ${role}`;
  }
  return `Try again: ${equation}. ${role} Do not ${answer} it.`;
}

function explainRangeRole(
  snapshot: ChallengeSnapshot,
  decision: ChallengeDecision,
): string {
  const prefixCell = `P[${String(decision.prefixIndex)}]`;
  const builtValue = String(snapshot.nextTotal);
  if (decision.expectedAction === "add") {
    return `${prefixCell} is prefix[end], the addend, so add its built value ${builtValue}.`;
  }
  if (decision.expectedAction === "subtract") {
    return `${prefixCell} is prefix[start], the subtrahend, so subtract its built value ${builtValue}.`;
  }
  return `${prefixCell} is neither boundary, so ignore its built value ${builtValue}.`;
}

function renderInputCells(snapshot: TraceSnapshot): string {
  return snapshot.values
    .map((value, index) => {
      const classes = ["relay-input-cell"];
      if (index >= snapshot.start && index < snapshot.end) {
        classes.push("is-in-query");
      }
      if (snapshot.kind === "accumulate" && snapshot.inputIndex === index) {
        classes.push("is-current");
      }
      return `
        <div class="${classes.join(" ")}" data-index="${numberText(index)}" aria-label="Input index ${numberText(index)}, value ${numberText(value)}${index >= snapshot.start && index < snapshot.end ? ", inside query" : ""}">
          <small>IDX ${numberText(index)}</small>
          <strong>${numberText(value)}</strong>
          <span>${index >= snapshot.start && index < snapshot.end ? "IN RANGE" : "OUTSIDE"}</span>
        </div>
      `;
    })
    .join("");
}

function renderPrefixCells(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  return snapshot.prefix
    .map((value, index) => {
      const isCurrentDecision =
        hideDecision &&
        snapshot.kind === "accumulate" &&
        index === snapshot.inputIndex + 1;
      const displayValue = value === null ? "?" : numberText(value);
      const classes = ["prefix-cell"];
      if (value !== null) classes.push("is-built");
      if (isCurrentDecision) classes.push("is-decision");
      if (index === snapshot.start) classes.push("is-start-boundary");
      if (index === snapshot.end) classes.push("is-end-boundary");
      if (isActiveBoundary(snapshot, index)) classes.push("is-active-boundary");

      const ariaValue = value === null ? "not built" : `value ${String(value)}`;
      return `
        <div class="${classes.join(" ")}" data-prefix-index="${numberText(index)}" aria-label="Prefix index ${numberText(index)}, ${escapeHtml(ariaValue)}">
          <div class="boundary-flags" aria-hidden="true">
            ${index === snapshot.start ? "<span>START</span>" : ""}
            ${index === snapshot.end ? "<span>END</span>" : ""}
          </div>
          <small>P[${numberText(index)}]</small>
          <strong>${displayValue}</strong>
          <span class="prefix-state">${isCurrentDecision ? "DECIDE" : value === null ? "WAIT" : index === 0 ? "SEED" : "BUILT"}</span>
        </div>
      `;
    })
    .join("");
}

function renderCurrentInput(snapshot: TraceSnapshot): string {
  if (snapshot.kind !== "accumulate") {
    const complete = snapshot.counts.additions === snapshot.values.length;
    return `
      <section class="incoming-port ${complete ? "is-complete" : ""}">
        <span>CURRENT INPUT / VALUE</span>
        <strong>${complete ? "BUILD COMPLETE" : "READY"}</strong>
        <small>${complete ? "QUERY TERMINAL ACTIVE" : "AWAITING INDEX 0"}</small>
      </section>
    `;
  }

  return `
    <section class="incoming-port">
       <span>CURRENT INPUT / VALUE</span>
       <strong>IDX ${numberText(snapshot.inputIndex)} // ${numberText(snapshot.incomingValue)}</strong>
       <small>P[${numberText(snapshot.inputIndex)}] ${numberText(snapshot.previousTotal)} + ${numberText(snapshot.incomingValue)} = ${numberText(snapshot.nextTotal)}</small>
     </section>
   `;
}

function renderBoundaryBank(snapshot: TraceSnapshot): string {
  return `
    <section class="boundary-bank" aria-label="Query boundary lookups">
      ${renderBoundaryCard("START", snapshot.start, snapshot.startPrefix, snapshot.kind === "read-start")}
      ${renderBoundaryCard("END", snapshot.end, snapshot.endPrefix, snapshot.kind === "read-end")}
    </section>
  `;
}

function renderBoundaryCard(
  label: "START" | "END",
  index: number,
  value: number | null,
  active: boolean,
): string {
  return `
    <div class="boundary-card is-${label.toLowerCase()} ${active ? "is-active" : ""}">
      <span>${label} LOOKUP</span>
      <strong>P[${numberText(index)}]</strong>
      <small>${value === null ? "WAITING" : `READ ${numberText(value)}`}</small>
    </div>
  `;
}

function renderEquation(snapshot: TraceSnapshot): string {
  return `
    <section class="range-equation" aria-label="Range sum equation">
      <span>RANGE EQUATION</span>
      <strong>
        <b>${snapshot.endPrefix === null ? `P[${numberText(snapshot.end)}]` : numberText(snapshot.endPrefix)}</b>
        <i>-</i>
        <b>${snapshot.startPrefix === null ? `P[${numberText(snapshot.start)}]` : numberText(snapshot.startPrefix)}</b>
        <i>=</i>
        <em>${snapshot.result === null ? "?" : numberText(snapshot.result)}</em>
      </strong>
      <small>prefix[end] - prefix[start]</small>
    </section>
  `;
}

function renderSummary(snapshot: TraceSnapshot): string {
  const complete = snapshot.kind === "complete";
  return `
    <section class="relay-summary ${complete ? "is-complete" : ""}">
      <span>RELAY SUMMARY</span>
      <strong data-result="range-sum">${complete ? numberText(snapshot.rangeSum) : "WAIT"}</strong>
      <small>${complete ? `RANGE [${numberText(snapshot.start)}, ${numberText(snapshot.end)}) // O(n) BUILD + O(1) QUERY` : "RESULT LOCKED UNTIL SUBTRACTION"}</small>
    </section>
  `;
}

function isActiveBoundary(snapshot: TraceSnapshot, index: number): boolean {
  return (
    (snapshot.kind === "read-start" && index === snapshot.start) ||
    (snapshot.kind === "read-end" && index === snapshot.end) ||
    (snapshot.kind === "subtract" &&
      (index === snapshot.start || index === snapshot.end))
  );
}

function numberText(value: number): string {
  return escapeHtml(String(value));
}

function padCount(value: number): string {
  return String(value).padStart(2, "0");
}
