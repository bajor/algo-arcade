import {
  escapeHtml,
  type ChallengeActionOption,
  type ChallengePrompt,
  type DiagnosticEntry,
  type PseudocodeEntry,
  type StageLegendItem,
} from "../../shared/game-ui";
import type { Pair, TraceSnapshot } from "./algorithm";
import type { ChallengeAction, ChallengeDecision } from "./game";

export const PSEUDOCODE = [
  { id: "initialize", code: "left = 0; right = values.length - 1" },
  {
    id: "compare-sum",
    code: "while left < right: compare values[left] + values[right]",
  },
  { id: "record-pair", code: "if sum == target: record the pair once" },
  {
    id: "move-left",
    code: "if sum <= target: move left; skip matched duplicates",
  },
  {
    id: "move-right",
    code: "if sum >= target: move right; skip matched duplicates",
  },
  { id: "complete", code: "return the unique recorded value pairs" },
] as const satisfies readonly PseudocodeEntry[];

export const STAGE_LEGEND = [
  { label: "POINTER BADGE", markerClass: "pair-sum-legend-pointer" },
  { label: "CURRENT CANDIDATE", markerClass: "pair-sum-legend-current" },
  { label: "RECORDED PAIR", markerClass: "pair-sum-legend-recorded" },
] as const satisfies readonly StageLegendItem[];

export const CHALLENGE_ACTIONS = [
  { action: "move-left", cue: "SUM < TARGET", label: "MOVE LEFT POINTER" },
  { action: "move-right", cue: "SUM > TARGET", label: "MOVE RIGHT POINTER" },
  { action: "record-pair", cue: "SUM = TARGET", label: "RECORD PAIR" },
] as const satisfies readonly ChallengeActionOption<ChallengeAction>[];

export function renderStageBody(snapshot: TraceSnapshot): string {
  return `
    <div class="target-lock-layout">
      <div class="range-console">
        ${renderSumLock(snapshot)}
        <div class="range-heading">
          <span>SORTED VALUE TRACK</span>
          <strong>${escapeHtml(rangeStatus(snapshot))}</strong>
        </div>
        <div class="range-scroll" tabindex="0" data-focus="stage-scroll" aria-label="Scrollable sorted value track with LEFT and RIGHT pointers">
          <div class="value-track" role="list" aria-label="Sorted values with LEFT and RIGHT pointer positions">
            ${renderValues(snapshot)}
          </div>
        </div>
      </div>
      ${renderPairVault(snapshot)}
    </div>
  `;
}

export function operationLabel(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  if (snapshot.kind === "compare") {
    if (hideDecision) return "COMPARE // DECISION ???";
    const comparisonLabels = {
      "move-left": "COMPARE // SUM LOW",
      "move-right": "COMPARE // SUM HIGH",
      "record-pair": "COMPARE // TARGET LOCK",
    } as const;
    return comparisonLabels[snapshot.decision];
  }

  if (snapshot.kind === "move-left" || snapshot.kind === "move-right") {
    const pointer = snapshot.kind === "move-left" ? "LEFT" : "RIGHT";
    const reasonLabels = {
      "sum-too-small": "AFTER SUM LOW",
      "sum-too-large": "AFTER SUM HIGH",
      "matched-value": "PAST MATCH",
      "duplicate-skip": "SKIP DUPLICATE",
    } as const;
    return `${pointer} MOVE // ${reasonLabels[snapshot.reason]}`;
  }

  const labels: Record<
    Exclude<TraceSnapshot["kind"], "compare" | "move-left" | "move-right">,
    string
  > = {
    start: "READY // SET POINTERS",
    "record-pair": "PAIR RECORDED // VAULT",
    complete:
      snapshot.pairs.length === 0
        ? "COMPLETE // NO PAIR"
        : `COMPLETE // ${String(snapshot.pairs.length)} UNIQUE`,
  };
  return labels[snapshot.kind];
}

export function stageExplanation(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  return hideDecision
    ? "Compare the current sum with the target, then choose which pointer action preserves a possible unique pair."
    : snapshot.explanation;
}

export function getDiagnostics(
  snapshot: TraceSnapshot,
): readonly DiagnosticEntry[] {
  return [
    {
      label: "COMPARISONS",
      value: String(snapshot.counts.comparisons).padStart(2, "0"),
    },
    {
      label: "LEFT MOVES",
      value: String(snapshot.counts.leftMoves).padStart(2, "0"),
    },
    {
      label: "RIGHT MOVES",
      value: String(snapshot.counts.rightMoves).padStart(2, "0"),
    },
    {
      label: "PAIRS",
      value: String(snapshot.counts.pairs).padStart(2, "0"),
    },
  ];
}

export function renderChallengePrompt(
  _snapshot: TraceSnapshot,
  decision: ChallengeDecision,
  decisionNumber: number,
): ChallengePrompt {
  return {
    label: `TARGET LOCK DECISION ${String(decisionNumber)}`,
    heading: `LEFT ${String(decision.leftValue)} + RIGHT ${String(decision.rightValue)} = SUM ${String(decision.currentSum)}`,
    question: `The target is ${String(decision.target)}. Which action keeps the search for unique value pairs correct?`,
  };
}

export function explainChallengeAnswer(
  snapshot: TraceSnapshot,
  decision: ChallengeDecision,
  answer: ChallengeAction,
  isCorrect: boolean,
): string {
  if (snapshot.kind !== "compare") {
    throw new Error("Challenge answer requires a comparison snapshot.");
  }

  const equation = `${String(decision.leftValue)} + ${String(decision.rightValue)} = ${String(decision.currentSum)}`;
  if (isCorrect) {
    if (decision.expectedAction === "move-left") {
      return `Correct: ${equation}, below target ${String(decision.target)}. Move LEFT toward larger sorted values to increase the sum.`;
    }
    if (decision.expectedAction === "move-right") {
      return `Correct: ${equation}, above target ${String(decision.target)}. Move RIGHT toward smaller sorted values to decrease the sum.`;
    }
    return `Correct: ${equation}, exactly target ${String(decision.target)}. Record (${String(decision.leftValue)}, ${String(decision.rightValue)}) once, then skip matching duplicates.`;
  }

  const attemptedAction = challengeActionLabel(answer);
  if (decision.expectedAction === "move-left") {
    return `Try again: ${attemptedAction} is not valid because ${equation} is below target ${String(decision.target)}. Only moving LEFT toward larger values can increase the sum.`;
  }
  if (decision.expectedAction === "move-right") {
    return `Try again: ${attemptedAction} is not valid because ${equation} is above target ${String(decision.target)}. Only moving RIGHT toward smaller values can decrease the sum.`;
  }
  return `Try again: ${attemptedAction} would skip a target lock. ${equation} equals ${String(decision.target)}, so record (${String(decision.leftValue)}, ${String(decision.rightValue)}) as one unique value pair.`;
}

function renderSumLock(snapshot: TraceSnapshot): string {
  const trigger = sumMoveTrigger(snapshot);
  if (snapshot.currentSum === null) {
    return `
      <section class="sum-lock is-closed" aria-label="Target lock range closed">
        <div><span>${trigger ? "TRIGGER SUM" : "CURRENT SUM"}</span><strong>${trigger ? formatNumber(trigger.sum) : "RANGE CLOSED"}</strong></div>
        <div class="target-value"><span>TARGET</span><strong>${formatNumber(snapshot.target)}</strong></div>
        <p>${trigger ? `${trigger.description} LEFT and RIGHT then met or crossed, so no next candidate remains.` : "LEFT and RIGHT have met or crossed; no candidate remains."}</p>
      </section>
    `;
  }

  const leftValue = valueAt(snapshot, snapshot.left);
  const rightValue = valueAt(snapshot, snapshot.right);
  return `
    <section class="sum-lock" aria-label="Current sum ${formatNumber(snapshot.currentSum)} and target ${formatNumber(snapshot.target)}">
      <div>
        <span>${trigger ? "NEXT SUM EQUATION" : "CURRENT SUM EQUATION"}</span>
        <strong><b>L ${formatNumber(leftValue)}</b><i>+</i><b>R ${formatNumber(rightValue)}</b><i>=</i><em>${formatNumber(snapshot.currentSum)}</em></strong>
      </div>
      <div class="target-value"><span>TARGET</span><strong>${formatNumber(snapshot.target)}</strong></div>
      <p>${trigger ? `${trigger.description} The equation above is the next candidate after that move.` : "Compare the sum with the target."}</p>
    </section>
  `;
}

function sumMoveTrigger(
  snapshot: TraceSnapshot,
): { readonly sum: number; readonly description: string } | null {
  if (snapshot.kind === "move-left" && snapshot.reason === "sum-too-small") {
    const sum =
      valueAt(snapshot, snapshot.fromIndex) + valueAt(snapshot, snapshot.right);
    return {
      sum,
      description: `Previous sum ${String(sum)} was below target ${String(snapshot.target)}, so LEFT moved right.`,
    };
  }
  if (snapshot.kind === "move-right" && snapshot.reason === "sum-too-large") {
    const sum =
      valueAt(snapshot, snapshot.left) + valueAt(snapshot, snapshot.fromIndex);
    return {
      sum,
      description: `Previous sum ${String(sum)} was above target ${String(snapshot.target)}, so RIGHT moved left.`,
    };
  }
  return null;
}

function renderValues(snapshot: TraceSnapshot): string {
  const recordedIndices = new Set(
    snapshot.pairs.flatMap((pair) => [pair.leftIndex, pair.rightIndex]),
  );

  return snapshot.values
    .map((value, index) => {
      const classes = ["range-cell"];
      if (index === snapshot.left) classes.push("is-left");
      if (index === snapshot.right) classes.push("is-right");
      if (
        snapshot.left < snapshot.right &&
        (index === snapshot.left || index === snapshot.right)
      ) {
        classes.push("is-current");
      }
      if (recordedIndices.has(index)) classes.push("is-recorded");

      return `
        <div class="${classes.join(" ")}" role="listitem" data-index="${formatNumber(index)}">
          <div class="pointer-badges">
            ${index === snapshot.left ? '<span class="left-badge">LEFT</span>' : ""}
            ${index === snapshot.right ? '<span class="right-badge">RIGHT</span>' : ""}
          </div>
          <small>IDX ${formatNumber(index)}</small>
          <strong>${formatNumber(value)}</strong>
          <span class="cell-state">${escapeHtml(cellStatus(snapshot, index, recordedIndices.has(index)))}</span>
        </div>
      `;
    })
    .join("");
}

function renderPairVault(snapshot: TraceSnapshot): string {
  const pairs = snapshot.pairs
    .map((pair, index) => renderPair(pair, index, isNewPair(snapshot, pair)))
    .join("");
  const isFinal = snapshot.kind === "complete";
  const emptyTitle = isFinal ? "NO UNIQUE PAIRS FOUND" : "VAULT EMPTY";
  const emptyDetail = isFinal
    ? `No two distinct indices produce target ${String(snapshot.target)}.`
    : "A target match will be recorded here once per value pair.";
  const finalStatus = isFinal
    ? `<p class="vault-final">FINAL OUTPUT // ${String(snapshot.pairs.length)} UNIQUE PAIR${snapshot.pairs.length === 1 ? "" : "S"}</p>`
    : "";

  return `
    <aside class="pair-vault" aria-label="Recorded unique value pairs">
      <div class="vault-heading">
        <span>PAIR VAULT</span>
        <strong>${String(snapshot.pairs.length).padStart(2, "0")} STORED</strong>
      </div>
      ${
        pairs
          ? `<ol class="pair-vault-list">${pairs}</ol>${finalStatus}`
          : `<div class="empty-vault"><strong>${emptyTitle}</strong><p>${escapeHtml(emptyDetail)}</p></div>`
      }
    </aside>
  `;
}

function renderPair(pair: Pair, index: number, isNew: boolean): string {
  return `
    <li class="vault-pair ${isNew ? "is-new" : ""}" aria-label="Pair ${formatNumber(pair.leftValue)} and ${formatNumber(pair.rightValue)}, discovered at indices ${formatNumber(pair.leftIndex)} and ${formatNumber(pair.rightIndex)}">
      <span>${isNew ? "RECORDED" : `PAIR ${String(index + 1).padStart(2, "0")}`}</span>
      <strong>(${formatNumber(pair.leftValue)}, ${formatNumber(pair.rightValue)})</strong>
      <small>DISCOVERY IDX ${formatNumber(pair.leftIndex)} + IDX ${formatNumber(pair.rightIndex)}</small>
    </li>
  `;
}

function rangeStatus(snapshot: TraceSnapshot): string {
  if (snapshot.left > snapshot.right) {
    return `CROSSED // LEFT ${String(snapshot.left)} / RIGHT ${String(snapshot.right)}`;
  }
  if (snapshot.left === snapshot.right) {
    return `MET // INDEX ${String(snapshot.left)}`;
  }
  if (snapshot.right - snapshot.left === 1) {
    return `ADJACENT // LEFT ${String(snapshot.left)} / RIGHT ${String(snapshot.right)}`;
  }
  return `ACTIVE // LEFT ${String(snapshot.left)} TO RIGHT ${String(snapshot.right)}`;
}

function cellStatus(
  snapshot: TraceSnapshot,
  index: number,
  isRecorded: boolean,
): string {
  const states: string[] = [];
  if (index === snapshot.left) states.push("LEFT POINTER");
  if (index === snapshot.right) states.push("RIGHT POINTER");
  if (
    snapshot.left < snapshot.right &&
    (index === snapshot.left || index === snapshot.right)
  ) {
    states.push("CURRENT");
  }
  if (isRecorded) states.push("RECORDED");
  if (states.length > 0) return states.join(" + ");
  return index < snapshot.left || index > snapshot.right
    ? "PASSED"
    : "IN RANGE";
}

function isNewPair(snapshot: TraceSnapshot, pair: Pair): boolean {
  return (
    snapshot.kind === "record-pair" &&
    snapshot.pair.leftIndex === pair.leftIndex &&
    snapshot.pair.rightIndex === pair.rightIndex
  );
}

function challengeActionLabel(action: ChallengeAction): string {
  const labels: Record<ChallengeAction, string> = {
    "move-left": "moving the LEFT pointer toward larger values",
    "move-right": "moving the RIGHT pointer toward smaller values",
    "record-pair": "recording the current pair",
  };
  return labels[action];
}

function valueAt(snapshot: TraceSnapshot, index: number): number {
  const value = snapshot.values[index];
  if (value === undefined) {
    throw new Error("Trace references a value outside the sorted track.");
  }
  return value;
}

function formatNumber(value: number): string {
  return escapeHtml(String(value));
}
