import {
  escapeHtml,
  type ChallengeActionOption,
  type ChallengePrompt,
  type DiagnosticEntry,
  type PseudocodeEntry,
  type StageLegendItem,
} from "../../shared/game-ui";
import type { TraceSnapshot } from "./algorithm";
import type { ChallengeAction, ChallengeDecision } from "./game";

export const PSEUDOCODE = [
  { id: "initialize", code: "left = 0; right = string.length - 1" },
  { id: "center", code: "if left == right: accept the center" },
  { id: "compare", code: "compare string[left] and string[right]" },
  { id: "match", code: "if equal: left += 1; right -= 1" },
  { id: "mismatch", code: "else: verdict = false; stop" },
  { id: "complete", code: "return the verdict after the scan stops" },
] as const satisfies readonly PseudocodeEntry[];

export const STAGE_LEGEND = [
  { label: "LEFT POINTER", markerClass: "pal-legend-left" },
  { label: "RIGHT POINTER", markerClass: "pal-legend-right" },
  { label: "MATCHED PAIR", markerClass: "pal-legend-match" },
] as const satisfies readonly StageLegendItem[];

export const CHALLENGE_ACTIONS = [
  { action: "match", cue: "=", label: "MATCH" },
  { action: "mismatch", cue: "X", label: "MISMATCH" },
] as const satisfies readonly ChallengeActionOption<ChallengeAction>[];

export function renderStageBody(snapshot: TraceSnapshot): string {
  return `
    <div class="mirror-scan-gate">
      ${renderPointerBoard(snapshot)}
      <div class="character-viewport" tabindex="0" data-focus="stage-scroll" aria-label="String characters; scroll horizontally to inspect every index">
        <ol class="character-track">${renderCharacterCells(snapshot)}</ol>
      </div>
      <div class="mirror-results">
        ${renderMatchLinks(snapshot)}
        ${renderVerdict(snapshot)}
      </div>
    </div>
  `;
}

export function operationLabel(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  if (snapshot.kind === "inspect") {
    if (hideDecision) return "INSPECT: ACTION HIDDEN";
    return `INSPECT: ${actionLabel(snapshot.decision)}`;
  }

  const labels: Record<Exclude<TraceSnapshot["kind"], "inspect">, string> = {
    start: "POINTERS READY",
    match: "MATCH + MOVE IN",
    mismatch: "MISMATCH: STOP",
    center: "CENTER REACHED",
    complete:
      snapshot.kind === "complete" && snapshot.verdict
        ? "VERDICT: PALINDROME"
        : "VERDICT: NOT PALINDROME",
  };
  return labels[snapshot.kind];
}

export function stageExplanation(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  return hideDecision
    ? "Choose the next rule action from the two pointer characters before the mirror gate reveals it."
    : snapshot.explanation;
}

export function getDiagnostics(
  snapshot: TraceSnapshot,
): readonly DiagnosticEntry[] {
  return [
    { label: "INSPECTIONS", value: padCount(snapshot.counts.inspections) },
    { label: "COMPARISONS", value: padCount(snapshot.counts.comparisons) },
    { label: "MATCHES", value: padCount(snapshot.counts.matches) },
  ];
}

export function renderChallengePrompt(
  snapshot: TraceSnapshot,
  decision: ChallengeDecision,
  decisionNumber: number,
): ChallengePrompt {
  const leftCharacter = characterAt(snapshot, decision.leftIndex);
  const rightCharacter = characterAt(snapshot, decision.rightIndex);
  return {
    label: `MIRROR RULE DECISION ${String(decisionNumber).padStart(2, "0")}`,
    heading: `LEFT ${displayCharacter(leftCharacter)} [IDX ${String(decision.leftIndex)}] // RIGHT ${displayCharacter(rightCharacter)} [IDX ${String(decision.rightIndex)}]`,
    question: "Which rule action comes next for these pointer characters?",
  };
}

export function explainChallengeAnswer(
  snapshot: TraceSnapshot,
  decision: ChallengeDecision,
  answer: ChallengeAction,
  isCorrect: boolean,
): string {
  if (snapshot.kind !== "inspect") {
    throw new Error("Challenge answer requires an inspect snapshot.");
  }

  const reason = expectedActionReason(snapshot, decision.expectedAction);
  return isCorrect
    ? `Correct: ${reason}`
    : `Try again: ${actionLabel(answer)} is not the next rule action. ${reason}`;
}

function renderPointerBoard(snapshot: TraceSnapshot): string {
  const relation =
    snapshot.left > snapshot.right
      ? "SCAN CROSSED"
      : snapshot.left === snapshot.right
        ? "POINTERS MEET"
        : snapshot.right - snapshot.left === 1
          ? "ADJACENT PAIR"
          : "MIRROR WINDOW";
  return `
    <div class="pointer-board">
      ${renderPointerPort(snapshot, "LEFT", snapshot.left)}
      <div class="mirror-axis" aria-label="${relation}">
        <i aria-hidden="true"></i><span>${relation}</span><i aria-hidden="true"></i>
      </div>
      ${renderPointerPort(snapshot, "RIGHT", snapshot.right)}
    </div>
  `;
}

function renderPointerPort(
  snapshot: TraceSnapshot,
  side: "LEFT" | "RIGHT",
  index: number,
): string {
  const character = snapshot.chars[index];
  const token = character === undefined ? "OUT" : displayCharacter(character);
  const label = `${side.toLowerCase()} pointer at index ${String(index)}, ${character === undefined ? "outside the string" : `character ${token}`}`;
  return `
    <div class="pointer-port is-${side.toLowerCase()}" aria-label="${escapeHtml(label)}">
      <span>${side} POINTER</span>
      <strong>${escapeHtml(token)}</strong>
      <small>IDX ${String(index)}</small>
    </div>
  `;
}

function renderCharacterCells(snapshot: TraceSnapshot): string {
  return snapshot.chars
    .map((character, index) => {
      const pairNumber = matchedPairNumber(snapshot, index);
      const mismatch =
        snapshot.verdict === false &&
        (snapshot.left === index || snapshot.right === index);
      const center =
        snapshot.kind === "center" && snapshot.centerIndex === index;
      const classes = ["character-cell"];
      if (pairNumber !== null) classes.push("is-matched");
      if (mismatch) classes.push("is-mismatch");
      if (center) classes.push("is-center");

      const markers = [
        snapshot.left === index ? '<span class="left-marker">LEFT</span>' : "",
        snapshot.right === index
          ? '<span class="right-marker">RIGHT</span>'
          : "",
      ].join("");
      const status = cellStatus(pairNumber, mismatch, center);
      const ariaLabel = cellAriaLabel(
        snapshot,
        character,
        index,
        pairNumber,
        mismatch,
        center,
      );

      return `
        <li class="${classes.join(" ")}" data-index="${String(index)}" aria-label="${escapeHtml(ariaLabel)}">
          <div class="pointer-markers" aria-hidden="true">${markers}</div>
          <small>IDX ${String(index)}</small>
          <strong class="character-glyph">${escapeHtml(displayCharacter(character))}</strong>
          <span class="cell-status">${status}</span>
        </li>
      `;
    })
    .join("");
}

function renderMatchLinks(snapshot: TraceSnapshot): string {
  const links = snapshot.matchedIndexPairs
    .map(([leftIndex, rightIndex], index) => {
      const leftCharacter = characterAt(snapshot, leftIndex);
      const rightCharacter = characterAt(snapshot, rightIndex);
      const pairLabel = `Matched pair ${String(index + 1)}: index ${String(leftIndex)}, character ${displayCharacter(leftCharacter)}, linked to index ${String(rightIndex)}, character ${displayCharacter(rightCharacter)}`;
      return `
        <div class="match-link" aria-label="${escapeHtml(pairLabel)}">
          <span><b>${escapeHtml(displayCharacter(leftCharacter))}</b><small>IDX ${String(leftIndex)}</small></span>
          <i aria-hidden="true"><em>PAIR ${String(index + 1).padStart(2, "0")}</em></i>
          <span><b>${escapeHtml(displayCharacter(rightCharacter))}</b><small>IDX ${String(rightIndex)}</small></span>
        </div>
      `;
    })
    .join("");
  return `
    <section class="match-bay" aria-label="Matched character pair links">
      <h3>MATCH LINKS</h3>
      <div class="match-link-track">${links || "<p>NO PAIRS LOCKED YET</p>"}</div>
    </section>
  `;
}

function renderVerdict(snapshot: TraceSnapshot): string {
  const verdict =
    snapshot.verdict === null
      ? { className: "is-waiting", label: "WAIT", detail: "SCAN ACTIVE" }
      : snapshot.verdict
        ? {
            className: "is-palindrome",
            label: "PALINDROME",
            detail: "MIRROR LOCK",
          }
        : {
            className: "is-not-palindrome",
            label: "NOT PALINDROME",
            detail: "PAIR BREAK",
          };
  return `
    <aside class="verdict-panel ${verdict.className}" aria-label="Palindrome verdict: ${verdict.label}">
      <span>VERDICT</span><strong>${verdict.label}</strong><small>${verdict.detail}</small>
    </aside>
  `;
}

function matchedPairNumber(
  snapshot: TraceSnapshot,
  characterIndex: number,
): number | null {
  const pairIndex = snapshot.matchedIndexPairs.findIndex(
    ([leftIndex, rightIndex]) =>
      leftIndex === characterIndex || rightIndex === characterIndex,
  );
  return pairIndex === -1 ? null : pairIndex + 1;
}

function cellStatus(
  pairNumber: number | null,
  mismatch: boolean,
  center: boolean,
): string {
  if (pairNumber !== null) return `PAIR ${String(pairNumber).padStart(2, "0")}`;
  if (mismatch) return "BREAK";
  if (center) return "CENTER";
  return "READY";
}

function cellAriaLabel(
  snapshot: TraceSnapshot,
  character: string,
  index: number,
  pairNumber: number | null,
  mismatch: boolean,
  center: boolean,
): string {
  const details = [
    `Index ${String(index)}, character ${displayCharacter(character)}`,
  ];
  if (snapshot.left === index) details.push("left pointer");
  if (snapshot.right === index) details.push("right pointer");
  if (pairNumber !== null) details.push(`matched pair ${String(pairNumber)}`);
  if (mismatch) details.push("mismatched pair");
  if (center) details.push("center character");
  return details.join(", ");
}

function expectedActionReason(
  snapshot: Extract<TraceSnapshot, { readonly kind: "inspect" }>,
  expected: ChallengeAction,
): string {
  const leftCharacter = characterAt(snapshot, snapshot.leftIndex);
  const rightCharacter = characterAt(snapshot, snapshot.rightIndex);
  const leftReference = `[${displayCharacter(leftCharacter)}] at index ${String(snapshot.leftIndex)}`;
  const rightReference = `[${displayCharacter(rightCharacter)}] at index ${String(snapshot.rightIndex)}`;

  return expected === "match"
    ? `${leftReference} and ${rightReference} are exactly equal, so MATCH and move both pointers inward.`
    : `${leftReference} and ${rightReference} differ, so MISMATCH ends the scan.`;
}

function actionLabel(action: ChallengeAction): string {
  return action.replace("-", " ").toUpperCase();
}

function displayCharacter(character: string): string {
  return character === " " ? "SP" : character;
}

function characterAt(snapshot: TraceSnapshot, index: number): string {
  const character = snapshot.chars[index];
  if (character === undefined) {
    throw new Error("Trace references a character outside the string.");
  }
  return character;
}

function padCount(value: number): string {
  return String(value).padStart(2, "0");
}
