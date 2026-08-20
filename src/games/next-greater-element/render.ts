import type { TraceSnapshot } from "./algorithm";
import {
  EXAMPLE_PRESETS,
  nextGreaterElementMetadata,
  type ChallengeAction,
  type ChallengeDecision,
} from "./game";

export type GameMode = "explore" | "challenge";
export type FeedbackTone = "correct" | "incorrect";

export interface ChallengeProgress {
  readonly decisions: readonly ChallengeDecision[];
  readonly cursor: number;
  readonly attempts: number;
  readonly correct: number;
  readonly feedback: string;
  readonly feedbackTone: FeedbackTone | null;
}

export interface GameViewModel {
  readonly rawInput: string;
  readonly validationError: string;
  readonly trace: readonly TraceSnapshot[];
  readonly stepIndex: number;
  readonly mode: GameMode;
  readonly isPlaying: boolean;
  readonly speedMs: number;
  readonly challenge: ChallengeProgress;
}

const PSEUDOCODE = [
  { id: "scan", code: "for each index i from left to right" },
  { id: "compare", code: "while stack and value[i] > value[stack.top]" },
  { id: "resolve", code: "answer[stack.pop()] = value[i]" },
  { id: "push", code: "stack.push(i)" },
  { id: "complete", code: "replace unresolved answers with -1" },
] as const;

export function renderGame(model: GameViewModel): string {
  return `
    <article class="game-screen">
      <a class="back-link" href="#/">&lt; GAME LIBRARY</a>
      <header class="game-masthead">
        <div>
          <p class="eyebrow">GAME 01 // ${nextGreaterElementMetadata.technique.toUpperCase()}</p>
          <h1>${nextGreaterElementMetadata.title}</h1>
          <p>Find the first strictly greater value to the right of every signal.</p>
        </div>
        <div class="complexity-chip" aria-label="Linear time and linear space">
          <span>TIME</span><strong>O(n)</strong><span>SPACE</span><strong>O(n)</strong>
        </div>
      </header>

      ${renderModeSwitch(model.mode)}
      ${renderInputConsole(model)}
      ${model.mode === "explore" ? renderExplore(model) : renderChallenge(model)}
    </article>
  `;
}

function renderModeSwitch(mode: GameMode): string {
  return `
    <nav class="mode-switch" aria-label="Game mode">
      <button
        type="button"
        data-action="show-explore"
        aria-pressed="${String(mode === "explore")}"
      >
        <span>01</span> EXPLORE
      </button>
      <button
        type="button"
        data-action="show-challenge"
        aria-pressed="${String(mode === "challenge")}"
      >
        <span>02</span> CHALLENGE
      </button>
    </nav>
  `;
}

function renderInputConsole(model: GameViewModel): string {
  const presets = EXAMPLE_PRESETS.map(
    (preset) => `
      <button type="button" data-action="preset" data-value="${escapeHtml(preset.value)}">
        ${preset.label}
      </button>
    `,
  ).join("");

  return `
    <section class="input-console" aria-labelledby="example-heading">
      <div class="console-label">
        <span>INPUT PORT</span>
        <h2 id="example-heading">LOAD AN EXAMPLE</h2>
      </div>
      <form class="example-form" data-form="example" novalidate>
        <label for="example-input">1-12 integers, separated by commas or spaces</label>
        <div class="input-row">
          <input
            id="example-input"
            name="example"
            value="${escapeHtml(model.rawInput)}"
            inputmode="text"
            autocomplete="off"
            aria-describedby="input-error"
          />
          <button class="run-button" type="submit">RUN TRACE</button>
        </div>
        <p id="input-error" class="input-error" role="alert">${escapeHtml(model.validationError)}</p>
      </form>
      <div class="preset-bank" aria-label="Example presets">${presets}</div>
    </section>
  `;
}

function renderExplore(model: GameViewModel): string {
  const snapshot = model.trace[model.stepIndex];
  if (!snapshot) {
    throw new Error("Explore step is outside the generated trace.");
  }

  return `
    ${renderStage(snapshot, false)}
    ${renderPlayback(model)}
    <div class="debug-grid">
      ${renderPseudocode(snapshot)}
      ${renderDiagnostics(snapshot, model.stepIndex, model.trace.length)}
    </div>
  `;
}

function renderChallenge(model: GameViewModel): string {
  const { challenge } = model;
  const decision = challenge.decisions[challenge.cursor];
  if (!decision) {
    return renderChallengeComplete(challenge);
  }

  const snapshot = model.trace[decision.snapshotIndex];
  if (!snapshot || snapshot.kind !== "compare") {
    throw new Error(
      "Challenge decision does not reference a comparison snapshot.",
    );
  }

  const currentValue = valueAt(snapshot, decision.currentIndex);
  const topValue = valueAt(snapshot, decision.topIndex);

  return `
    <section class="challenge-brief" aria-labelledby="challenge-title">
      <div>
        <p class="eyebrow">PREDICTION MODE</p>
        <h2 id="challenge-title">CALL THE NEXT STACK MOVE</h2>
        <p>Earn 100 points per correct decision. Wrong calls show why and let you retry.</p>
      </div>
      <div class="score-box">
        <span>SCORE</span>
        <strong>${String(challenge.correct * 100).padStart(4, "0")}</strong>
        <small>${String(challenge.cursor)} / ${String(challenge.decisions.length)} CLEARED</small>
      </div>
    </section>
    ${renderStage(snapshot, true)}
    <section class="decision-console" aria-labelledby="decision-prompt">
      <p>WHILE LOOP DECISION ${String(challenge.cursor + 1)}</p>
      <h2 id="decision-prompt">
        CURRENT <b>${String(currentValue)}</b> VS STACK TOP <b>${String(topValue)}</b>
      </h2>
      <p>Is the current value strictly greater than the stack top?</p>
      <div class="decision-buttons">
        <button type="button" data-action="challenge-answer" data-answer="pop">
          <span>YES</span> POP TOP
        </button>
        <button type="button" data-action="challenge-answer" data-answer="stop">
          <span>NO</span> STOP &amp; PUSH
        </button>
      </div>
      ${renderFeedback(challenge)}
    </section>
  `;
}

function renderStage(snapshot: TraceSnapshot, hideDecision: boolean): string {
  return `
    <section class="algorithm-stage" aria-labelledby="stage-heading">
      <div class="stage-header">
        <div>
          <span>LIVE TRACE</span>
          <h2 id="stage-heading">SIGNAL SCAN DECK</h2>
        </div>
        <strong>${operationLabel(snapshot, hideDecision)}</strong>
      </div>
      <div class="stage-layout">
        <div class="scan-deck">
          <div class="track-heading"><span>INPUT SIGNALS</span><span>LEFT TO RIGHT &gt;</span></div>
          <div class="signal-track">${renderSignals(snapshot)}</div>
          <div class="track-heading"><span>ANSWER BAY</span><span>NEXT GREATER VALUE</span></div>
          <div class="answer-track">${renderAnswers(snapshot)}</div>
        </div>
        ${renderStack(snapshot)}
      </div>
      <div class="operation-readout">
        <span>CURRENT OPERATION</span>
        <p>${hideDecision ? "Choose the branch before the reactor executes it." : escapeHtml(snapshot.explanation)}</p>
      </div>
      <div class="stage-legend" aria-label="Stage legend">
        <span><i class="legend-current"></i> CURRENT</span>
        <span><i class="legend-stack"></i> IN STACK</span>
        <span><i class="legend-resolved"></i> RESOLVED</span>
      </div>
    </section>
  `;
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

function renderPlayback(model: GameViewModel): string {
  const lastIndex = model.trace.length - 1;
  return `
    <section class="playback-console" aria-label="Trace playback controls">
      <div class="transport-controls">
        <button type="button" data-action="first" aria-label="First step" ${model.stepIndex === 0 ? "disabled" : ""}>|&lt;</button>
        <button type="button" data-action="previous" aria-label="Previous step" ${model.stepIndex === 0 ? "disabled" : ""}>&lt;</button>
        <button class="play-toggle" type="button" data-action="toggle-play" aria-label="${model.isPlaying ? "Pause trace" : "Play trace"}">
          ${model.isPlaying ? "PAUSE" : "PLAY"}
        </button>
        <button type="button" data-action="next" aria-label="Next step" ${model.stepIndex === lastIndex ? "disabled" : ""}>&gt;</button>
        <button type="button" data-action="last" aria-label="Last step" ${model.stepIndex === lastIndex ? "disabled" : ""}>&gt;|</button>
      </div>
      <div class="timeline-control">
        <label for="trace-timeline">STEP ${String(model.stepIndex + 1)} / ${String(model.trace.length)}</label>
        <input
          id="trace-timeline"
          name="timeline"
          type="range"
          min="0"
          max="${String(lastIndex)}"
          value="${String(model.stepIndex)}"
        />
      </div>
      <label class="speed-control" for="playback-speed">
        SPEED
        <select id="playback-speed" name="speed">
          ${speedOption(1200, "0.5X", model.speedMs)}
          ${speedOption(700, "1X", model.speedMs)}
          ${speedOption(350, "2X", model.speedMs)}
        </select>
      </label>
    </section>
  `;
}

function renderPseudocode(snapshot: TraceSnapshot): string {
  const lines = PSEUDOCODE.map(
    (line, index) => `
      <li class="${snapshot.line === line.id ? "is-active" : ""}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <code>${escapeHtml(line.code)}</code>
      </li>
    `,
  ).join("");

  return `
    <section class="code-panel" aria-labelledby="code-heading">
      <div class="panel-heading"><span>PROGRAM ROM</span><h2 id="code-heading">PSEUDOCODE</h2></div>
      <ol>${lines}</ol>
    </section>
  `;
}

function renderDiagnostics(
  snapshot: TraceSnapshot,
  stepIndex: number,
  traceLength: number,
): string {
  return `
    <section class="diagnostics-panel" aria-labelledby="diagnostics-heading">
      <div class="panel-heading"><span>DEBUG PORT</span><h2 id="diagnostics-heading">DIAGNOSTICS</h2></div>
      <dl class="counter-grid">
        <div><dt>COMPARISONS</dt><dd>${String(snapshot.counts.comparisons).padStart(2, "0")}</dd></div>
        <div><dt>PUSHES</dt><dd>${String(snapshot.counts.pushes).padStart(2, "0")}</dd></div>
        <div><dt>POPS</dt><dd>${String(snapshot.counts.pops).padStart(2, "0")}</dd></div>
        <div><dt>TRACE</dt><dd>${String(stepIndex + 1).padStart(2, "0")}/${String(traceLength).padStart(2, "0")}</dd></div>
      </dl>
      <div class="invariant-box">
        <strong>STACK RULE</strong>
        <p>Unresolved values remain in decreasing order. Equal values stay unresolved.</p>
      </div>
    </section>
  `;
}

function renderFeedback(challenge: ChallengeProgress): string {
  if (!challenge.feedback) {
    return '<p class="challenge-feedback" role="status" aria-live="polite"></p>';
  }

  return `
    <p class="challenge-feedback is-${String(challenge.feedbackTone)}" role="status" aria-live="polite">
      ${escapeHtml(challenge.feedback)}
    </p>
  `;
}

function renderChallengeComplete(challenge: ChallengeProgress): string {
  const accuracy =
    challenge.attempts === 0
      ? 100
      : Math.round((challenge.correct / challenge.attempts) * 100);
  return `
    <section class="challenge-complete" aria-labelledby="challenge-complete-title">
      <p class="eyebrow">TRAINING COMPLETE</p>
      <h2 id="challenge-complete-title">STACK PILOT CLEARED</h2>
      <div class="final-score">${String(challenge.correct * 100).padStart(4, "0")}</div>
      <p>You predicted ${String(challenge.correct)} comparison decisions with ${String(accuracy)}% accuracy.</p>
      <p>The practiced rule: pop only when the current value is <strong>strictly greater</strong> than the stack top.</p>
      <button class="pixel-button" type="button" data-action="restart-challenge">REPLAY CHALLENGE</button>
    </section>
  `;
}

function signalStatus(snapshot: TraceSnapshot, index: number): string {
  if (snapshot.cursor === index) return "CURRENT";
  if (snapshot.stack.at(-1) === index) return "TOP";
  if (snapshot.stack.includes(index)) return "WAIT";
  if (snapshot.result[index] !== null) return "DONE";
  return "QUEUE";
}

function operationLabel(
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

function speedOption(value: number, label: string, selected: number): string {
  return `<option value="${String(value)}" ${value === selected ? "selected" : ""}>${label}</option>`;
}

function valueAt(snapshot: TraceSnapshot, index: number): number {
  const value = snapshot.values[index];
  if (value === undefined) {
    throw new Error("Trace references a value outside the example.");
  }
  return value;
}

export function explainChallengeAnswer(
  snapshot: Extract<TraceSnapshot, { readonly kind: "compare" }>,
  answer: ChallengeAction,
): string {
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
