import {
  escapeHtml,
  type ChallengeActionOption,
  type ChallengePrompt,
  type CodeListing,
  type DiagnosticEntry,
  type StageLegendItem,
} from "../../shared/game-ui";
import type { TraceSnapshot } from "./algorithm";
import type { ChallengeAction, ChallengeDecision } from "./game";

export const PSEUDOCODE = [
  { id: "initialize", code: "left = right = 0; cache = {}" },
  { id: "inspect", code: "inspect whether text[right] is in cache" },
  { id: "shrink", code: "cache.remove(text[left]); left += 1" },
  { id: "expand", code: "cache.add(text[right]); right += 1" },
  { id: "evaluate-best", code: "best = longer(best, text[left:right])" },
  { id: "complete", code: "return earliest longest substring" },
] as const satisfies CodeListing;

export const PYTHON_CODE = [
  {
    id: "python-signature",
    code: "def longest_unique_substring(text: str) -> tuple[str, int, int]:",
  },
  { id: "initialize", code: "    left = right = best_start = best_end = 0" },
  { id: "python-active", code: "    active: set[str] = set()" },
  { id: "python-loop", code: "    while right < len(text):" },
  { id: "inspect", code: "        if text[right] in active:" },
  {
    id: "shrink",
    code: "            active.remove(text[left]); left += 1",
  },
  { id: "python-continue", code: "            continue" },
  { id: "expand", code: "        active.add(text[right]); right += 1" },
  {
    id: "evaluate-best",
    code: "        best_start, best_end = (left, right) if right - left > best_end - best_start else (best_start, best_end)",
  },
  {
    id: "complete",
    code: "    return text[best_start:best_end], best_start, best_end",
  },
  {
    id: "python-example",
    code: '# longest_unique_substring("abcabcbb") == ("abc", 0, 3)',
  },
] as const satisfies CodeListing;

export const STAGE_LEGEND = [
  { label: "REMOVED", markerClass: "unique-legend-removed" },
  { label: "ACTIVE", markerClass: "unique-legend-active" },
  { label: "INCOMING", markerClass: "unique-legend-incoming" },
  { label: "QUEUED", markerClass: "unique-legend-queued" },
] as const satisfies readonly StageLegendItem[];

export const CHALLENGE_ACTIONS = [
  { action: "shrink", cue: "DUPLICATE", label: "SHRINK LEFT" },
  { action: "expand", cue: "NOT STORED", label: "EXPAND RIGHT" },
] as const satisfies readonly ChallengeActionOption<ChallengeAction>[];

export function renderStageBody(snapshot: TraceSnapshot): string {
  const characterCount = snapshot.example.length;
  return `
    <div class="repeat-breaker-layout">
      <div class="character-deck">
        <div class="unique-track-heading">
          <span>CHARACTER TAPE</span><span>MEMBERSHIP SCAN &gt;</span>
        </div>
        <div class="tape-viewport" tabindex="0" data-focus="stage-scroll" aria-label="Scrollable character tape">
          <div class="tape-rail" style="--character-count: ${String(characterCount)}">
            ${renderWindowBracket(snapshot)}
            <div class="character-tape">${renderCharacters(snapshot)}</div>
          </div>
        </div>
        ${renderIncomingScanner(snapshot)}
      </div>
      <aside class="cache-bank" aria-label="Repeat breaker state">
        ${renderActiveCache(snapshot)}
        ${renderBestRun(snapshot)}
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
      return "CACHE RESET";
    case "inspect":
      if (hideDecision) return "INSPECT: ???";
      return snapshot.decision === "shrink"
        ? "INSPECT: DUPLICATE"
        : "INSPECT: CLEAR";
    case "shrink":
      return "SHRINK: REMOVE";
    case "expand":
      return "EXPAND: ADD";
    case "best":
      return snapshot.updated ? "BEST: UPDATE" : "BEST: HOLD";
    case "complete":
      return "COMPLETE";
  }
}

export function stageExplanation(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  return hideDecision
    ? "Check whether the incoming character is already stored in the active cache."
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
    label: `MEMBERSHIP DECISION ${String(decisionNumber)}`,
    heading: `INCOMING ${quoted(decision.character)} // ACTIVE CACHE ${cacheText(snapshot.activeCharacters)}`,
    question:
      "Is the incoming character already in the active cache, forcing a shrink?",
  };
}

export function explainChallengeAnswer(
  snapshot: TraceSnapshot,
  decision: ChallengeDecision,
  answer: ChallengeAction,
): string {
  if (snapshot.kind !== "inspect") {
    throw new Error("Challenge answer requires an inspect snapshot.");
  }

  const character = quoted(decision.character);
  const cache = cacheText(snapshot.activeCharacters);
  if (decision.expectedAction === "shrink") {
    return answer === "shrink"
      ? `Correct: ${character} is already in the active cache ${cache}, so remove the leftmost character before expanding.`
      : `Try again: ${character} is already in the active cache ${cache}. Expanding now would break uniqueness, so shrink left.`;
  }
  return answer === "expand"
    ? `Correct: ${character} is not in the active cache ${cache}, so add it and expand right.`
    : `Try again: ${character} is not in the active cache ${cache}. Shrinking would discard a valid character, so expand right.`;
}

function renderWindowBracket(snapshot: TraceSnapshot): string {
  const windowSize = snapshot.right - snapshot.left;
  return `
    <div class="window-lane">
      <div
        class="window-bracket"
        style="--window-left: ${String(snapshot.left)}; --window-size: ${String(windowSize)}"
      >
        <span>ACTIVE HALF-OPEN WINDOW [${String(snapshot.left)}, ${String(snapshot.right)})</span>
        <div aria-hidden="true"><i>[</i><b></b><i>)</i></div>
      </div>
    </div>
  `;
}

function renderCharacters(snapshot: TraceSnapshot): string {
  return Array.from(snapshot.example)
    .map((character, index) => {
      const state = characterState(snapshot, index);
      const classes = ["tape-cell", `is-${state}`];
      if (snapshot.kind === "inspect" && snapshot.inspectedIndex === index) {
        classes.push("is-scanned");
      }
      if (snapshot.kind === "shrink" && snapshot.removedIndex === index) {
        classes.push("is-just-removed");
      }
      if (snapshot.kind === "expand" && snapshot.addedIndex === index) {
        classes.push("is-just-added");
      }

      return `
        <div class="${classes.join(" ")}" data-index="${String(index)}">
          <small>IDX ${String(index)}</small>
          <strong>${escapeHtml(character)}</strong>
          <span>${state.toUpperCase()}</span>
        </div>
      `;
    })
    .join("");
}

function renderIncomingScanner(snapshot: TraceSnapshot): string {
  if (snapshot.incomingIndex === null) {
    return `
      <div class="incoming-scanner is-complete">
        <span>INCOMING SCANNER</span><strong>END</strong><small>NO CHARACTER QUEUED</small>
      </div>
    `;
  }

  const character = characterAt(snapshot, snapshot.incomingIndex);
  return `
    <div class="incoming-scanner">
      <span>INCOMING SCANNER</span>
      <strong>${escapeHtml(character)}</strong>
      <small>INDEX ${String(snapshot.incomingIndex)}</small>
    </div>
  `;
}

function renderActiveCache(snapshot: TraceSnapshot): string {
  const entries = snapshot.activeCharacters
    .map(
      (character) => `
        <span class="cache-entry"><strong>${escapeHtml(character)}</strong><small>STORED</small></span>
      `,
    )
    .join("");
  return `
    <section class="active-cache" aria-labelledby="active-cache-heading">
      <div class="cache-heading"><span>CURRENT MEMBERSHIP</span><h3 id="active-cache-heading">ACTIVE CACHE</h3></div>
      <div class="cache-entries">${entries || '<p class="empty-cache">EMPTY</p>'}</div>
      <p>${String(snapshot.activeCharacters.length)} UNIQUE STORED</p>
    </section>
  `;
}

function renderBestRun(snapshot: TraceSnapshot): string {
  const substring = snapshot.best.substring
    ? escapeHtml(snapshot.best.substring)
    : "EMPTY";
  return `
    <section class="best-run" aria-labelledby="best-run-heading">
      <div class="cache-heading"><span>EARLIEST LONGEST</span><h3 id="best-run-heading">BEST RUN</h3></div>
      <strong class="best-run-value">${substring}</strong>
      <dl>
        <div><dt>RANGE</dt><dd>[${String(snapshot.best.start)}, ${String(snapshot.best.endExclusive)})</dd></div>
        <div><dt>LENGTH</dt><dd>${String(snapshot.best.length)}</dd></div>
      </dl>
    </section>
  `;
}

function characterState(
  snapshot: TraceSnapshot,
  index: number,
): "removed" | "active" | "incoming" | "queued" {
  if (index < snapshot.left) return "removed";
  if (index < snapshot.right) return "active";
  if (index === snapshot.incomingIndex) return "incoming";
  return "queued";
}

function characterAt(snapshot: TraceSnapshot, index: number): string {
  const character = snapshot.example[index];
  if (character === undefined) {
    throw new Error("Trace references a character outside the example.");
  }
  return character;
}

function cacheText(characters: readonly string[]): string {
  return `{${characters.join(", ")}}`;
}

function quoted(character: string): string {
  return JSON.stringify(character);
}
