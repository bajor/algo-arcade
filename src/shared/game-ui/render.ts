import type { GameMountContext } from "../../app/registry";
import type {
  ChallengeProgress,
  GameMode,
  GameUiConfig,
  GameUiState,
} from "./types";

export function renderGameUi<
  Example,
  Snapshot,
  Decision,
  Action extends string,
  ChallengeSnapshot extends Snapshot,
>(
  context: GameMountContext,
  model: GameUiState<Example, Snapshot, Decision>,
  config: GameUiConfig<Example, Snapshot, Decision, Action, ChallengeSnapshot>,
): string {
  return `
    <article class="game-screen">
      <a class="back-link" href="#/" data-focus="back-link">&lt; GAME LIBRARY</a>
      <header class="game-masthead">
        <div>
          <p class="eyebrow">GAME ${formatNumber(context.gameNumber)} // ${escapeHtml(context.metadata.technique.toUpperCase())}</p>
          <h1>${escapeHtml(context.metadata.title)}</h1>
          <p>${escapeHtml(context.metadata.objective)}</p>
        </div>
        <div class="complexity-chip" aria-label="${escapeHtml(context.metadata.complexity.label)}">
          <span>TIME</span><strong>${escapeHtml(context.metadata.complexity.time)}</strong>
          <span>SPACE</span><strong>${escapeHtml(context.metadata.complexity.space)}</strong>
        </div>
      </header>

      ${renderModeSwitch(model.mode)}
      ${model.mode === "explore" ? renderInputConsole(model, config) : ""}
      ${model.mode === "explore" ? renderExplore(model, config) : renderChallenge(model, config)}
    </article>
  `;
}

function renderModeSwitch(mode: GameMode): string {
  return `
    <nav class="mode-switch" aria-label="Game mode">
      <button
        type="button"
        data-action="show-explore"
        data-focus="show-explore"
        aria-pressed="${String(mode === "explore")}"
      >
        <span>01</span> EXPLORE
      </button>
      <button
        type="button"
        data-action="show-challenge"
        data-focus="show-challenge"
        aria-pressed="${String(mode === "challenge")}"
      >
        <span>02</span> CHALLENGE
      </button>
    </nav>
  `;
}

function renderInputConsole<
  Example,
  Snapshot,
  Decision,
  Action extends string,
  ChallengeSnapshot extends Snapshot,
>(
  model: GameUiState<Example, Snapshot, Decision>,
  config: GameUiConfig<Example, Snapshot, Decision, Action, ChallengeSnapshot>,
): string {
  const presets = config.input.presets
    .map(
      (preset, index) => `
        <button type="button" data-action="preset" data-value="${escapeHtml(preset.value)}" data-focus="preset-${String(index)}">
          ${escapeHtml(preset.label)}
        </button>
      `,
    )
    .join("");

  return `
    <section class="input-console" aria-labelledby="example-heading">
      <div class="console-label">
        <span>INPUT PORT</span>
        <h2 id="example-heading">LOAD AN EXAMPLE</h2>
      </div>
      <form class="example-form" data-form="example" novalidate>
        <label for="example-input">${escapeHtml(config.input.formatLabel)}</label>
        <div class="input-row">
          <input
            id="example-input"
            name="example"
            data-focus="example-input"
            value="${escapeHtml(model.rawInput)}"
            inputmode="text"
            autocomplete="off"
            aria-describedby="input-error"
            aria-invalid="${String(Boolean(model.validationError))}"
          />
          <button class="run-button" type="submit" data-focus="run-trace">RUN TRACE</button>
        </div>
        <p id="input-error" class="input-error" role="alert">${escapeHtml(model.validationError)}</p>
      </form>
      <div class="preset-bank" aria-label="Example generator and presets">
        <button class="random-example" type="button" data-action="randomize" data-focus="randomize">
          NEW RANDOM
        </button>
        ${presets}
      </div>
    </section>
  `;
}

function renderExplore<
  Example,
  Snapshot,
  Decision,
  Action extends string,
  ChallengeSnapshot extends Snapshot,
>(
  model: GameUiState<Example, Snapshot, Decision>,
  config: GameUiConfig<Example, Snapshot, Decision, Action, ChallengeSnapshot>,
): string {
  const snapshot = requireSnapshot(model.trace, model.stepIndex);
  return `
    ${renderStage(snapshot, false, config)}
    ${renderPlayback(model, config, snapshot)}
    <div class="debug-grid">
      ${renderPseudocode(snapshot, config)}
      ${renderDiagnostics(snapshot, model.stepIndex, model.trace.length, config)}
    </div>
  `;
}

function renderChallenge<
  Example,
  Snapshot,
  Decision,
  Action extends string,
  ChallengeSnapshot extends Snapshot,
>(
  model: GameUiState<Example, Snapshot, Decision>,
  config: GameUiConfig<Example, Snapshot, Decision, Action, ChallengeSnapshot>,
): string {
  const { challenge } = model;
  if (config.challenge.isComplete(challenge)) {
    return renderChallengeComplete(challenge, config);
  }

  const decision = challenge.decisions[challenge.cursor];
  if (!decision) {
    throw new Error("Challenge is incomplete but has no current decision.");
  }
  const snapshot = config.challenge.snapshot(model.trace, decision);
  const prompt = config.challenge.prompt(
    snapshot,
    decision,
    challenge.cursor + 1,
  );
  const actions = config.challenge.actions
    .map(
      (option) => `
        <button type="button" data-action="challenge-answer" data-answer="${escapeHtml(option.action)}" data-focus="challenge-answer">
          <span>${escapeHtml(option.cue)}</span> ${escapeHtml(option.label)}
        </button>
      `,
    )
    .join("");

  return `
    <section class="challenge-brief" aria-labelledby="challenge-title">
      <div>
        <p class="eyebrow">PREDICTION MODE</p>
        <h2 id="challenge-title">${escapeHtml(config.challenge.briefTitle)}</h2>
        <p>${escapeHtml(config.challenge.brief)}</p>
      </div>
      <div class="score-box">
        <span>SCORE</span>
        <strong>${String(challenge.score).padStart(4, "0")}</strong>
        <small>${String(challenge.cursor)} / ${String(challenge.decisions.length)} CLEARED</small>
      </div>
    </section>
    ${renderStage(snapshot, true, config)}
    <section class="decision-console" aria-labelledby="decision-prompt">
      <p>${escapeHtml(prompt.label)}</p>
      <h2 id="decision-prompt">${escapeHtml(prompt.heading)}</h2>
      <p>${escapeHtml(prompt.question)}</p>
      <div class="decision-buttons">${actions}</div>
      ${renderFeedback(challenge)}
    </section>
  `;
}

function renderStage<
  Example,
  Snapshot,
  Decision,
  Action extends string,
  ChallengeSnapshot extends Snapshot,
>(
  snapshot: Snapshot,
  hideDecision: boolean,
  config: GameUiConfig<Example, Snapshot, Decision, Action, ChallengeSnapshot>,
): string {
  const legend = config.stage.legend
    .map(
      (item) =>
        `<span><i class="${escapeHtml(item.markerClass)}"></i> ${escapeHtml(item.label)}</span>`,
    )
    .join("");

  return `
    <section class="algorithm-stage ${escapeHtml(config.stage.className)}" aria-labelledby="stage-heading">
      <div class="stage-header">
        <div>
          <span>LIVE TRACE</span>
          <h2 id="stage-heading">${escapeHtml(config.stage.title)}</h2>
        </div>
        <strong>${escapeHtml(config.stage.operationLabel(snapshot, hideDecision))}</strong>
      </div>
      ${config.stage.renderBody(snapshot, hideDecision)}
      <div class="operation-readout">
        <span>CURRENT OPERATION</span>
        <p>${escapeHtml(config.stage.explanation(snapshot, hideDecision))}</p>
      </div>
      <div class="stage-legend" aria-label="Stage legend">${legend}</div>
    </section>
  `;
}

function renderPlayback<
  Example,
  Snapshot,
  Decision,
  Action extends string,
  ChallengeSnapshot extends Snapshot,
>(
  model: GameUiState<Example, Snapshot, Decision>,
  config: GameUiConfig<Example, Snapshot, Decision, Action, ChallengeSnapshot>,
  snapshot: Snapshot,
): string {
  const lastIndex = model.trace.length - 1;
  const valueText = `Step ${String(model.stepIndex + 1)} of ${String(model.trace.length)}: ${config.stage.operationLabel(snapshot, false)}`;
  return `
    <section class="playback-console" aria-label="Trace playback controls">
      <div class="transport-controls">
        <button type="button" data-action="first" data-focus="first" aria-label="First step" ${model.stepIndex === 0 ? "disabled" : ""}>|&lt;</button>
        <button type="button" data-action="previous" data-focus="previous" aria-label="Previous step" ${model.stepIndex === 0 ? "disabled" : ""}>&lt;</button>
        <button class="play-toggle" type="button" data-action="toggle-play" data-focus="toggle-play" aria-label="${model.isPlaying ? "Pause trace" : "Play trace"}">
          ${model.isPlaying ? "PAUSE" : "PLAY"}
        </button>
        <button type="button" data-action="next" data-focus="next" aria-label="Next step" ${model.stepIndex === lastIndex ? "disabled" : ""}>&gt;</button>
        <button type="button" data-action="last" data-focus="last" aria-label="Last step" ${model.stepIndex === lastIndex ? "disabled" : ""}>&gt;|</button>
      </div>
      <div class="timeline-control">
        <label for="trace-timeline">STEP ${String(model.stepIndex + 1)} / ${String(model.trace.length)}</label>
        <input
          id="trace-timeline"
          name="timeline"
          data-focus="timeline"
          type="range"
          min="0"
          max="${String(lastIndex)}"
          value="${String(model.stepIndex)}"
          aria-valuetext="${escapeHtml(valueText)}"
        />
      </div>
      <label class="speed-control" for="playback-speed">
        SPEED
        <select id="playback-speed" name="speed" data-focus="speed">
          ${speedOption(1200, "0.5X", model.speedMs)}
          ${speedOption(700, "1X", model.speedMs)}
          ${speedOption(350, "2X", model.speedMs)}
        </select>
      </label>
    </section>
  `;
}

function renderPseudocode<
  Example,
  Snapshot,
  Decision,
  Action extends string,
  ChallengeSnapshot extends Snapshot,
>(
  snapshot: Snapshot,
  config: GameUiConfig<Example, Snapshot, Decision, Action, ChallengeSnapshot>,
): string {
  const activeEntryId = config.pseudocode.activeEntryId(snapshot);
  const lines = config.pseudocode.entries
    .map(
      (line, index) => `
        <li class="${activeEntryId === line.id ? "is-active" : ""}">
          <span>${formatNumber(index + 1)}</span>
          <code>${escapeHtml(line.code)}</code>
        </li>
      `,
    )
    .join("");

  return `
    <section class="code-panel" aria-labelledby="code-heading">
      <div class="panel-heading"><span>PROGRAM ROM</span><h2 id="code-heading">PSEUDOCODE</h2></div>
      <ol>${lines}</ol>
    </section>
  `;
}

function renderDiagnostics<
  Example,
  Snapshot,
  Decision,
  Action extends string,
  ChallengeSnapshot extends Snapshot,
>(
  snapshot: Snapshot,
  stepIndex: number,
  traceLength: number,
  config: GameUiConfig<Example, Snapshot, Decision, Action, ChallengeSnapshot>,
): string {
  const entries = config.diagnostics
    .entries(snapshot, stepIndex, traceLength)
    .map(
      (entry) => `
        <div><dt>${escapeHtml(entry.label)}</dt><dd>${escapeHtml(entry.value)}</dd></div>
      `,
    )
    .join("");

  return `
    <section class="diagnostics-panel" aria-labelledby="diagnostics-heading">
      <div class="panel-heading"><span>DEBUG PORT</span><h2 id="diagnostics-heading">DIAGNOSTICS</h2></div>
      <dl class="counter-grid">${entries}</dl>
      <div class="invariant-box">
        <strong>${escapeHtml(config.diagnostics.ruleLabel)}</strong>
        <p>${escapeHtml(config.diagnostics.rule)}</p>
      </div>
    </section>
  `;
}

function renderFeedback<Decision>(
  challenge: ChallengeProgress<Decision>,
): string {
  const feedback = challenge.feedback;
  if (!feedback) {
    return '<div class="challenge-feedback"></div>';
  }

  const label = feedback.advanced
    ? `PREVIOUS DECISION ${formatNumber(feedback.decisionNumber)} // CORRECT`
    : `CURRENT DECISION ${formatNumber(feedback.decisionNumber)} // RETRY`;
  return `
    <div class="challenge-feedback is-${feedback.tone}">
      <strong>${label}</strong>
      <span>${escapeHtml(feedback.message)}</span>
    </div>
  `;
}

function renderChallengeComplete<
  Example,
  Snapshot,
  Decision,
  Action extends string,
  ChallengeSnapshot extends Snapshot,
>(
  challenge: ChallengeProgress<Decision>,
  config: GameUiConfig<Example, Snapshot, Decision, Action, ChallengeSnapshot>,
): string {
  return `
    <section class="challenge-complete" aria-labelledby="challenge-complete-title">
      <p class="eyebrow">TRAINING COMPLETE</p>
      <h2 id="challenge-complete-title">${escapeHtml(config.challenge.completionTitle)}</h2>
      <div class="final-score">${String(challenge.score).padStart(4, "0")}</div>
      <p>You cleared ${String(challenge.correct)} decisions with ${String(challenge.accuracy)}% accuracy.</p>
      <p>The practiced rule: ${escapeHtml(config.challenge.completionRule)}</p>
      <button class="pixel-button" type="button" data-action="restart-challenge" data-focus="restart-challenge">NEW RANDOM CHALLENGE</button>
    </section>
  `;
}

function requireSnapshot<Snapshot>(
  trace: readonly Snapshot[],
  stepIndex: number,
): Snapshot {
  const snapshot = trace[stepIndex];
  if (!snapshot) {
    throw new Error("Explore step is outside the generated trace.");
  }
  return snapshot;
}

function speedOption(value: number, label: string, selected: number): string {
  return `<option value="${String(value)}" ${value === selected ? "selected" : ""}>${label}</option>`;
}

function formatNumber(value: number): string {
  return String(value).padStart(2, "0");
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
