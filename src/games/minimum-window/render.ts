import type {
  ChallengeActionOption,
  ChallengePrompt,
  DiagnosticEntry,
  PseudocodeEntry,
  StageLegendItem,
} from "../../shared/game-ui";
import type { TraceSnapshot, WindowResult } from "./algorithm";
import type { ChallengeAction, ChallengeDecision } from "./game";

export const PSEUDOCODE = [
  {
    id: "initialize",
    code: "left = 0; right = 0; sum = 0; best = NONE",
  },
  {
    id: "decide",
    code: "while sum >= target or right < values.length: choose action",
  },
  {
    id: "expand",
    code: "sum += values[right]; right += 1",
  },
  {
    id: "qualify",
    code: "if sum >= target: evaluate [left, right) for best",
  },
  {
    id: "shrink",
    code: "sum -= values[left]; left += 1",
  },
  { id: "complete", code: "return best" },
] as const satisfies readonly PseudocodeEntry[];

export const STAGE_LEGEND = [
  {
    label: "ACTIVE WINDOW",
    markerClass: "minimum-window-legend-active",
  },
  { label: "NEXT ENTRY", markerClass: "minimum-window-legend-entry" },
  { label: "LEFT EXIT", markerClass: "minimum-window-legend-exit" },
  { label: "BEST RESCUE", markerClass: "minimum-window-legend-best" },
] as const satisfies readonly StageLegendItem[];

export const CHALLENGE_ACTIONS = [
  { action: "expand", cue: "SUM BELOW", label: "EXPAND RIGHT" },
  {
    action: "shrink",
    cue: "TARGET MET",
    label: "EVALUATE + SHRINK LEFT",
  },
] as const satisfies readonly ChallengeActionOption<ChallengeAction>[];

export function renderStageBody(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  return `
    <div class="scanner-layout">
      <div class="tape-bay">
        <div class="scanner-heading">
          <span>RESCUE VALUE TAPE</span>
          <span>SCAN DIRECTION &gt;</span>
        </div>
        <div class="window-coordinate">
          <span>ACTIVE HALF-OPEN WINDOW</span>
          <strong>[${String(snapshot.left)}, ${String(snapshot.right)})</strong>
          <small>${String(snapshot.right - snapshot.left)} ${snapshot.right - snapshot.left === 1 ? "VALUE" : "VALUES"}</small>
        </div>
        <div
          class="tape-scroll"
          tabindex="0"
          data-focus="stage-scroll"
          aria-label="Value tape. Active half-open window [${String(snapshot.left)}, ${String(snapshot.right)})."
        >
          <div class="value-tape">${renderTape(snapshot)}</div>
        </div>
        <div class="scanner-stations">
          ${renderStation("LEFT EXIT", snapshot.left < snapshot.right ? stationValue(snapshot, snapshot.left) : "NONE")}
          ${renderStation("NEXT ENTRY", snapshot.right < snapshot.values.length ? stationValue(snapshot, snapshot.right) : "END OF TAPE")}
        </div>
      </div>
      <aside class="rescue-console" aria-label="Window rescue status">
        ${renderSumMeter(snapshot, hideDecision)}
        ${renderBestRescue(snapshot.best)}
      </aside>
    </div>
  `;
}

export function operationLabel(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  if (snapshot.kind === "decide" && hideDecision) return "NEXT ACTION ???";

  switch (snapshot.kind) {
    case "start":
      return "SCANNER READY";
    case "decide":
      return snapshot.decision === "expand"
        ? "DECIDE: EXPAND"
        : "DECIDE: SHRINK";
    case "expand":
      return "EXPAND RIGHT";
    case "qualify":
      return snapshot.outcome === "updated"
        ? "BEST RESCUE UPDATED"
        : "WINDOW QUALIFIES";
    case "shrink":
      return "SHRINK LEFT";
    case "complete":
      return "RESCUE SCAN COMPLETE";
  }
}

export function stageExplanation(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  return hideDecision
    ? "Choose the scanner's next action from the visible window and sum."
    : snapshot.explanation;
}

export function getDiagnostics(
  snapshot: TraceSnapshot,
): readonly DiagnosticEntry[] {
  return [
    {
      label: "CHECKS",
      value: String(snapshot.counts.thresholdChecks).padStart(2, "0"),
    },
    {
      label: "EXPANSIONS",
      value: String(snapshot.counts.expansions).padStart(2, "0"),
    },
    {
      label: "SHRINKS",
      value: String(snapshot.counts.shrinks).padStart(2, "0"),
    },
    {
      label: "BEST UPDATES",
      value: String(snapshot.counts.bestUpdates).padStart(2, "0"),
    },
  ];
}

export function renderChallengePrompt(
  snapshot: TraceSnapshot,
  decision: ChallengeDecision,
  decisionNumber: number,
): ChallengePrompt {
  return {
    label: `SCANNER DECISION ${String(decisionNumber)}`,
    heading: `ACTIVE [${String(decision.left)}, ${String(decision.right)}) // SUM ${String(decision.sum)} / ${String(snapshot.target)}`,
    question:
      "What is the next action: expand right, or evaluate the qualifying window and shrink left?",
  };
}

export function explainChallengeAnswer(
  snapshot: TraceSnapshot,
  decision: ChallengeDecision,
  _answer: ChallengeAction,
  isCorrect: boolean,
): string {
  if (snapshot.kind !== "decide") {
    throw new Error("Challenge answer requires a decision snapshot.");
  }

  const windowLabel = `[${String(decision.left)}, ${String(decision.right)})`;
  if (decision.expectedAction === "expand") {
    return isCorrect
      ? `Correct: ${String(decision.sum)} is below target ${String(snapshot.target)}, so expand right to scan the next entry.`
      : `Try again: ${String(decision.sum)} is below target ${String(snapshot.target)}. The scanner must expand right.`;
  }

  return isCorrect
    ? `Correct: ${String(decision.sum)} reaches target ${String(snapshot.target)}. Evaluate ${windowLabel} for BEST RESCUE before shrinking left.`
    : `Try again: ${String(decision.sum)} reaches target ${String(snapshot.target)}. Evaluate ${windowLabel} before shrinking left.`;
}

function renderTape(snapshot: TraceSnapshot): string {
  const cells = snapshot.values.map((value, index) => {
    const isActive = index >= snapshot.left && index < snapshot.right;
    const isNext = index === snapshot.right;
    const isExit = index === snapshot.left && isActive;
    const classes = ["tape-cell"];
    if (isActive) classes.push("is-active");
    if (isNext) classes.push("is-next");
    if (isExit) classes.push("is-exit");

    return `
      ${renderBoundary(snapshot, index)}
      <div class="tape-slot" data-index="${String(index)}">
        <span class="tape-marker tape-marker-entry">${isNext ? "NEXT ENTRY" : ""}</span>
        <div class="${classes.join(" ")}">
          <small>IDX ${String(index)}</small>
          <strong>${String(value)}</strong>
          <span>${cellStatus(snapshot, index)}</span>
        </div>
        <span class="tape-marker tape-marker-exit">${isExit ? "LEFT EXIT" : ""}</span>
      </div>
    `;
  });

  cells.push(renderBoundary(snapshot, snapshot.values.length));
  return cells.join("");
}

function renderBoundary(snapshot: TraceSnapshot, index: number): string {
  const isLeft = index === snapshot.left;
  const isRight = index === snapshot.right;
  const bracket = isLeft && isRight ? "[ )" : isLeft ? "[" : isRight ? ")" : "";
  const atEnd = index === snapshot.values.length;

  return `
    <div class="tape-boundary ${isLeft ? "is-left" : ""} ${isRight ? "is-right" : ""}">
      <span class="tape-marker tape-marker-entry">${isRight && atEnd ? "NEXT: END" : ""}</span>
      <strong aria-hidden="true">${bracket}</strong>
      <span class="tape-marker tape-marker-exit">${isLeft && isRight ? "EXIT: NONE" : ""}</span>
    </div>
  `;
}

function renderStation(label: string, value: string): string {
  return `<div><span>${label}</span><strong>${value}</strong></div>`;
}

function renderSumMeter(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  const meterValue = Math.min(snapshot.sum, snapshot.target);
  return `
    <section class="sum-meter ${!hideDecision && snapshot.sum >= snapshot.target ? "is-met" : ""}" aria-labelledby="sum-meter-heading">
      <span id="sum-meter-heading">SUM METER</span>
      <strong>${String(snapshot.sum)} / ${String(snapshot.target)}</strong>
      <progress max="${String(snapshot.target)}" value="${String(meterValue)}" aria-label="Current sum ${String(snapshot.sum)} of target ${String(snapshot.target)}"></progress>
      <small>${hideDecision ? "COMPARE SUM TO TARGET" : snapshot.sum >= snapshot.target ? "TARGET REACHED" : "TARGET NOT YET REACHED"}</small>
    </section>
  `;
}

function renderBestRescue(best: WindowResult | null): string {
  if (best === null) {
    return `
      <section class="rescue-archive is-empty" aria-labelledby="best-rescue-heading">
        <span id="best-rescue-heading">BEST RESCUE ARCHIVE</span>
        <strong>NONE</strong>
        <p>No qualifying window archived.</p>
      </section>
    `;
  }

  return `
    <section class="rescue-archive" aria-labelledby="best-rescue-heading">
      <span id="best-rescue-heading">BEST RESCUE ARCHIVE</span>
      <dl>
        <div><dt>INDICES</dt><dd data-result="indices">[${String(best.start)}, ${String(best.endExclusive)})</dd></div>
        <div><dt>VALUES</dt><dd data-result="values">${best.values.join(", ")}</dd></div>
        <div><dt>LENGTH</dt><dd data-result="length">${String(best.length)}</dd></div>
      </dl>
    </section>
  `;
}

function cellStatus(snapshot: TraceSnapshot, index: number): string {
  if (index >= snapshot.left && index < snapshot.right) return "ACTIVE";
  if (index < snapshot.left) return "SCANNED";
  if (index === snapshot.right) return "NEXT";
  return "QUEUED";
}

function stationValue(snapshot: TraceSnapshot, index: number): string {
  const value = snapshot.values[index];
  if (value === undefined) {
    throw new Error("Trace references a value outside the rescue tape.");
  }
  return `IDX ${String(index)} // VALUE ${String(value)}`;
}
