import {
  escapeHtml,
  renderItemFeed,
  type ChallengeActionOption,
  type ChallengePrompt,
  type DiagnosticEntry,
  type ItemFeedState,
  type PseudocodeEntry,
  type StageLegendItem,
} from "../../shared/game-ui";
import { formatEntries, type TraceSnapshot } from "./algorithm";
import type {
  ChallengeAction,
  ChallengeDecision,
  ChallengeSnapshot,
} from "./game";

export const PSEUDOCODE = [
  { id: "initialize", code: "counts = {}" },
  { id: "inspect-token", code: "for each token in input order:" },
  { id: "lookup-token", code: "existing = counts[token]" },
  { id: "insert-key", code: "if absent: counts[token] = 1" },
  { id: "increment-count", code: "otherwise: counts[token] += 1" },
  { id: "complete", code: "return ordered key/count entries" },
] as const satisfies readonly PseudocodeEntry[];

export const STAGE_LEGEND = [
  { label: "CURRENT TOKEN", markerClass: "frequency-legend-current" },
  { label: "LOOKUP SLOT", markerClass: "frequency-legend-lookup" },
  { label: "UPDATED COUNT", markerClass: "frequency-legend-updated" },
] as const satisfies readonly StageLegendItem[];

export const CHALLENGE_ACTIONS = [
  { action: "insert", cue: "KEY ABSENT", label: "INSERT COUNT 1" },
  { action: "increment", cue: "KEY FOUND", label: "INCREMENT COUNT" },
] as const satisfies readonly ChallengeActionOption<ChallengeAction>[];

export function renderStageBody(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  return `
    <div class="frequency-layout">
      <section class="tally-workbench" aria-label="Token conveyor and frequency map">
        ${renderConveyor(snapshot)}
        <div class="lookup-console">
          <div class="current-token"><span>CURRENT TOKEN</span><strong>${renderCurrentToken(snapshot)}</strong></div>
          <div class="lookup-arrow" aria-hidden="true">&gt;&gt;</div>
          <div class="lookup-result"><span>KEY LOOKUP</span><strong>${renderLookupResult(snapshot, hideDecision)}</strong></div>
        </div>
        ${renderMapSlots(snapshot, hideDecision)}
      </section>
      ${renderOutputReport(snapshot)}
    </div>
  `;
}

export function operationLabel(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  if (snapshot.kind === "lookup" && hideDecision) return "LOOKUP // ???";
  switch (snapshot.kind) {
    case "start":
      return "TALLY READY";
    case "inspect":
      return "INSPECT TOKEN";
    case "lookup":
      return snapshot.decision === "insert"
        ? "LOOKUP // ABSENT"
        : "LOOKUP // FOUND";
    case "insert":
      return "INSERT NEW KEY";
    case "increment":
      return `INCREMENT // ${String(snapshot.previousCount)} TO ${String(snapshot.nextCount)}`;
    case "complete":
      return "TALLY COMPLETE";
  }
}

export function stageExplanation(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  return hideDecision
    ? "Compare the current token with the visible keys, then choose whether to insert a new slot or increment an existing count."
    : snapshot.explanation;
}

export function getDiagnostics(
  snapshot: TraceSnapshot,
): readonly DiagnosticEntry[] {
  return [
    { label: "LOOKUPS", value: pad(snapshot.counts.lookups) },
    { label: "INSERTS", value: pad(snapshot.counts.inserts) },
    { label: "INCREMENTS", value: pad(snapshot.counts.increments) },
    { label: "UNIQUE KEYS", value: pad(snapshot.entries.length) },
    {
      label: "PROCESSED",
      value: `${pad(snapshot.processedCount)}/${pad(snapshot.tokens.length)}`,
    },
  ];
}

export function renderChallengePrompt(
  _snapshot: ChallengeSnapshot,
  decision: ChallengeDecision,
  decisionNumber: number,
): ChallengePrompt {
  return {
    label: `MAP LOOKUP ${String(decisionNumber)}`,
    heading: `TOKEN ${JSON.stringify(decision.token)} // ITEM ${String(decision.tokenIndex + 1)}`,
    question:
      "Is this token a new key that needs count 1, or an existing key whose count must increase?",
  };
}

export function explainChallengeAnswer(
  _snapshot: ChallengeSnapshot,
  decision: ChallengeDecision,
  _answer: ChallengeAction,
  isCorrect: boolean,
): string {
  const token = JSON.stringify(decision.token);
  if (decision.expectedAction === "insert") {
    return isCorrect
      ? `Correct: ${token} is absent, so insert a new key with count 1.`
      : `Try again: ${token} is not among the visible keys. There is no count to increment, so insert it with count 1.`;
  }

  const count = decision.existingCount;
  if (count === null) {
    throw new Error("Increment decision is missing its existing count.");
  }
  return isCorrect
    ? `Correct: ${token} already has count ${String(count)}, so increment it to ${String(count + 1)}.`
    : `Try again: ${token} already has a visible slot with count ${String(count)}. Reuse that slot and increment its count.`;
}

function renderConveyor(snapshot: TraceSnapshot): string {
  return renderItemFeed({
    heading: "TOKEN CONVEYOR",
    summary: `${String(snapshot.processedCount)} / ${String(snapshot.tokens.length)} COUNTED`,
    scrollLabel: "Scrollable token conveyor",
    items: snapshot.tokens.map((token, index) => ({
      label: `TOKEN ${String(index + 1).padStart(2, "0")}`,
      text: token,
      status: tokenStatus(snapshot, index),
      state: tokenFeedState(snapshot, index),
    })),
  });
}

function renderCurrentToken(snapshot: TraceSnapshot): string {
  if (snapshot.kind === "complete") return "DONE";
  if (snapshot.currentTokenIndex === null) return "READY";
  const token = snapshot.tokens[snapshot.currentTokenIndex];
  if (token === undefined) {
    throw new Error("Trace references a token outside the conveyor.");
  }
  return escapeHtml(token);
}

function renderLookupResult(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  if (snapshot.kind === "lookup") {
    if (hideDecision) return "CHECK KEYS";
    return snapshot.decision === "insert"
      ? "ABSENT // INSERT"
      : `FOUND // COUNT ${String(snapshot.existingCount)}`;
  }
  if (snapshot.kind === "insert") return "NEW SLOT // COUNT 1";
  if (snapshot.kind === "increment") {
    return `UPDATED // COUNT ${String(snapshot.nextCount)}`;
  }
  if (snapshot.kind === "complete") return "ALL TOKENS COUNTED";
  return "STANDBY";
}

function renderMapSlots(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  const slots = snapshot.entries
    .map((entry, index) => {
      const active = isActiveEntry(snapshot, entry.key, hideDecision);
      const updated = isUpdatedEntry(snapshot, entry.key);
      return `
        <li class="map-slot${active ? " is-lookup" : ""}${updated ? " is-updated" : ""}" data-entry-index="${String(index)}">
          <span class="slot-address">SLOT ${String(index + 1).padStart(2, "0")}</span>
          <strong class="slot-key">${escapeHtml(entry.key)}</strong>
          <span class="slot-count"><small>COUNT</small><b>${String(entry.count).padStart(2, "0")}</b></span>
        </li>
      `;
    })
    .join("");
  return `
    <section class="sparse-map" aria-labelledby="sparse-map-heading">
      <div><span>SPARSE STORAGE</span><h3 id="sparse-map-heading">KEY / COUNT MAP</h3></div>
      ${slots ? `<ol>${slots}</ol>` : '<p class="empty-map">NO KEYS STORED</p>'}
    </section>
  `;
}

function renderOutputReport(snapshot: TraceSnapshot): string {
  const result =
    snapshot.kind === "complete" ? formatEntries(snapshot.result) : "PENDING";
  return `
    <aside class="tally-report" aria-label="Frequency map result and complexity">
      <div class="tally-report-heading"><span>OUTPUT PORT</span><strong>${snapshot.kind === "complete" ? "FINAL" : "BUILDING"}</strong></div>
      <dl class="ordered-counts">
        ${snapshot.entries
          .map(
            (entry, index) => `
              <div><dt><small>${String(index + 1).padStart(2, "0")}</small>${escapeHtml(entry.key)}</dt><dd>${String(entry.count)}</dd></div>
            `,
          )
          .join("")}
      </dl>
      <p class="tally-result"><span>FINAL COUNTS</span><strong>${escapeHtml(result)}</strong></p>
      <div class="tally-summary">
        <span>SUMMARY</span>
        <strong>O(n) AVG TIME</strong>
        <strong>O(k) SPACE</strong>
        <small>k = UNIQUE TOKENS</small>
      </div>
    </aside>
  `;
}

function tokenStatus(snapshot: TraceSnapshot, index: number): string {
  if (index < snapshot.processedCount) return "COUNTED";
  if (index === snapshot.currentTokenIndex) return "CURRENT";
  return "QUEUED";
}

function tokenFeedState(snapshot: TraceSnapshot, index: number): ItemFeedState {
  if (index === snapshot.currentTokenIndex) {
    return index < snapshot.processedCount ? "latest" : "current";
  }
  return index < snapshot.processedCount ? "processed" : "pending";
}

function isActiveEntry(
  snapshot: TraceSnapshot,
  key: string,
  hideDecision: boolean,
): boolean {
  return (
    !hideDecision &&
    snapshot.kind === "lookup" &&
    snapshot.decision === "increment" &&
    snapshot.token === key
  );
}

function isUpdatedEntry(snapshot: TraceSnapshot, key: string): boolean {
  return (
    (snapshot.kind === "insert" || snapshot.kind === "increment") &&
    snapshot.token === key
  );
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
