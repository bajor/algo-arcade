import {
  escapeHtml,
  type ChallengeActionOption,
  type ChallengePrompt,
  type DiagnosticEntry,
  type PseudocodeEntry,
  type StageLegendItem,
} from "../../shared/game-ui";
import {
  HISTOGRAM_BINS,
  getBin,
  type BinId,
  type TraceSnapshot,
} from "./algorithm";
import type {
  ChallengeAction,
  ChallengeDecision,
  ChallengeSnapshot,
} from "./game";

export const PSEUDOCODE = [
  { id: "initialize", code: "counts = four zeroed fixed-range bins" },
  { id: "inspect", code: "for each value in the input" },
  { id: "classify", code: "bin = fixed range containing value" },
  { id: "increment", code: "counts[bin] += 1" },
  { id: "complete", code: "return counts and every tallest bin" },
] as const satisfies readonly PseudocodeEntry[];

export const STAGE_LEGEND = [
  { label: "CURRENT VALUE", markerClass: "histogram-legend-current" },
  { label: "SELECTED BIN", markerClass: "histogram-legend-selected" },
  { label: "TALLEST RESULT", markerClass: "histogram-legend-tallest" },
] as const satisfies readonly StageLegendItem[];

export const CHALLENGE_ACTIONS: readonly ChallengeActionOption<ChallengeAction>[] =
  Object.freeze(
    HISTOGRAM_BINS.map((bin) =>
      Object.freeze({
        action: bin.id,
        cue: `RANGE ${bin.id}`,
        label: "LOAD THIS TOWER",
      }),
    ),
  );

export function renderStageBody(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  return `
    <div class="histogram-forge-layout">
      <div class="histogram-workbench">
        ${renderCurrentValue(snapshot)}
        ${renderInputFeed(snapshot)}
        <div class="histogram-board" aria-label="Four-bin histogram">
          <div class="tower-grid">
            ${snapshot.bins.map((bin, index) => renderTower(snapshot, bin.id, index, hideDecision)).join("")}
          </div>
        </div>
      </div>
      ${renderForgeReport(snapshot)}
    </div>
  `;
}

export function operationLabel(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  if (snapshot.kind === "classify") {
    return hideDecision
      ? "CLASSIFY // BIN ???"
      : `CLASSIFY // ${getBin(snapshot.binId).id}`;
  }
  if (snapshot.kind === "inspect") {
    return `INSPECT // VALUE ${String(snapshot.value)}`;
  }
  if (snapshot.kind === "increment") {
    return `INCREMENT // ${getBin(snapshot.binId).id}`;
  }
  if (snapshot.kind === "complete") {
    return `COMPLETE // ${snapshot.tallestBinIds.length === 1 ? "TALLEST" : "TALLEST TIE"}`;
  }
  return "READY // EMPTY BINS";
}

export function stageExplanation(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  return hideDecision && snapshot.kind === "classify"
    ? `Choose which fixed range contains ${String(snapshot.value)} before its counter is incremented.`
    : snapshot.explanation;
}

export function getDiagnostics(
  snapshot: TraceSnapshot,
): readonly DiagnosticEntry[] {
  return [
    {
      label: "INSPECTIONS",
      value: String(snapshot.counts.inspections).padStart(2, "0"),
    },
    {
      label: "CLASSIFIED",
      value: String(snapshot.counts.classifications).padStart(2, "0"),
    },
    {
      label: "INCREMENTS",
      value: String(snapshot.counts.increments).padStart(2, "0"),
    },
    {
      label: "PROCESSED",
      value: `${String(snapshot.processedValues.length).padStart(2, "0")}/${String(snapshot.values.length).padStart(2, "0")}`,
    },
  ];
}

export function renderChallengePrompt(
  snapshot: ChallengeSnapshot,
  decision: ChallengeDecision,
  decisionNumber: number,
): ChallengePrompt {
  return {
    label: `FORGE SORT DECISION ${String(decisionNumber)}`,
    heading: `VALUE ${String(snapshot.value)} // ITEM ${String(decision.valueIndex + 1)} OF ${String(snapshot.values.length)}`,
    question: "Which fixed histogram bin contains this value?",
  };
}

export function explainChallengeAnswer(
  _snapshot: ChallengeSnapshot,
  decision: ChallengeDecision,
  answer: ChallengeAction,
  isCorrect: boolean,
): string {
  const expectedBin = getBin(decision.expectedAction);
  if (isCorrect) {
    return `Correct: ${String(decision.value)} is from ${String(expectedBin.minimum)} through ${String(expectedBin.maximum)}, so increment the ${expectedBin.id} tower.`;
  }
  const attemptedBin = getBin(answer);
  return `Try again: ${String(decision.value)} is not from ${String(attemptedBin.minimum)} through ${String(attemptedBin.maximum)}. Find the fixed range that contains it.`;
}

function renderCurrentValue(snapshot: TraceSnapshot): string {
  const current =
    snapshot.currentIndex === null || snapshot.currentValue === null
      ? snapshot.kind === "complete"
        ? "NONE // FORGE COMPLETE"
        : "WAITING FOR INPUT"
      : `${String(snapshot.currentValue)} // POSITION ${String(snapshot.currentIndex + 1)} OF ${String(snapshot.values.length)}`;
  return `
    <section class="current-value-console" aria-label="Current input value">
      <span>CURRENT ORE</span>
      <strong>${escapeHtml(current)}</strong>
    </section>
  `;
}

function renderInputFeed(snapshot: TraceSnapshot): string {
  return `
    <div class="feed-heading"><span>INPUT FEED</span><strong>${String(snapshot.processedValues.length)} / ${String(snapshot.values.length)} FILED</strong></div>
    <div class="input-feed" role="list" tabindex="0" data-focus="stage-scroll" aria-label="Scrollable input values in processing order">
      ${snapshot.values
        .map((value, index) => {
          const classes = ["feed-cell"];
          if (index < snapshot.processedValues.length)
            classes.push("is-processed");
          if (index === snapshot.currentIndex) classes.push("is-current");
          return `
            <div class="${classes.join(" ")}" role="listitem" data-index="${String(index)}">
              <small>${String(index + 1).padStart(2, "0")}</small>
              <strong>${String(value)}</strong>
              <span>${feedState(snapshot, index)}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderTower(
  snapshot: TraceSnapshot,
  binId: BinId,
  index: number,
  hideDecision: boolean,
): string {
  const count = snapshot.binCounts[index];
  if (count === undefined) {
    throw new Error("Trace is missing a count for a fixed histogram bin.");
  }
  const classes = ["histogram-tower"];
  const selected = !hideDecision && snapshot.currentBinId === binId;
  const tallest = snapshot.tallestBinIds.includes(binId);
  if (selected) classes.push("is-selected");
  if (tallest) classes.push("is-tallest");

  const blocks = Array.from(
    { length: count },
    (_, blockIndex) =>
      `<i class="tower-block${isNewBlock(snapshot, binId, blockIndex) ? " is-new" : ""}" aria-hidden="true"></i>`,
  ).join("");

  return `
    <section class="${classes.join(" ")}" data-bin="${escapeHtml(binId)}" aria-label="Range ${escapeHtml(binId)}, count ${String(count)}">
      <div class="tower-count"><span>COUNT</span><strong>${String(count).padStart(2, "0")}</strong></div>
      <div class="tower-shaft"><div class="tower-blocks">${blocks}</div></div>
      <strong class="tower-range">${escapeHtml(binId)}</strong>
      <span class="tower-state">${escapeHtml(towerState(snapshot, binId, hideDecision))}</span>
    </section>
  `;
}

function renderForgeReport(snapshot: TraceSnapshot): string {
  const tallest =
    snapshot.kind === "complete"
      ? snapshot.tallestBinIds.join(" + ")
      : "PENDING";
  return `
    <aside class="forge-report" aria-label="Histogram result and complexity">
      <div class="report-heading"><span>FORGE OUTPUT</span><strong>${snapshot.kind === "complete" ? "FINAL" : "BUILDING"}</strong></div>
      <dl class="histogram-result">
        ${snapshot.bins
          .map((bin, index) => {
            const count = snapshot.binCounts[index];
            if (count === undefined) {
              throw new Error("Trace is missing a result count.");
            }
            return `<div data-result-bin="${escapeHtml(bin.id)}"><dt>${escapeHtml(bin.id)}</dt><dd>${String(count)}</dd></div>`;
          })
          .join("")}
      </dl>
      <div class="tallest-result"><span>TALLEST BIN(S)</span><strong>${escapeHtml(tallest)}</strong></div>
      <div class="forge-complexity">
        <span>COMPLEXITY</span>
        <strong>O(n) TIME</strong>
        <strong>O(1) SPACE</strong>
        <small>FOUR FIXED COUNTERS</small>
      </div>
    </aside>
  `;
}

function feedState(snapshot: TraceSnapshot, index: number): string {
  if (index === snapshot.currentIndex) {
    return index < snapshot.processedValues.length ? "FILED" : "CURRENT";
  }
  return index < snapshot.processedValues.length ? "FILED" : "QUEUE";
}

function towerState(
  snapshot: TraceSnapshot,
  binId: BinId,
  hideDecision: boolean,
): string {
  if (snapshot.tallestBinIds.includes(binId)) return "TALLEST";
  if (snapshot.kind === "classify" && hideDecision) return "CHOOSE?";
  if (snapshot.kind === "increment" && snapshot.binId === binId) {
    return "+1 LOCKED";
  }
  if (snapshot.currentBinId === binId) return "SELECTED";
  return "STANDING";
}

function isNewBlock(
  snapshot: TraceSnapshot,
  binId: BinId,
  blockIndex: number,
): boolean {
  return (
    snapshot.kind === "increment" &&
    snapshot.binId === binId &&
    blockIndex === snapshot.nextCount - 1
  );
}
