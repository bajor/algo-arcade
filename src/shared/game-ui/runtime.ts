import type { GameMountContext } from "../../app/registry";
import { renderGameUi } from "./render";
import type {
  ChallengeProgress,
  GameMode,
  GameUiConfig,
  GameUiState,
} from "./types";

const DEFAULT_SPEED_MS = 700;

interface MutableGameState<Example, Snapshot, Decision> {
  rawInput: string;
  validationError: string;
  acceptedExample: Example;
  trace: readonly Snapshot[];
  stepIndex: number;
  mode: GameMode;
  isPlaying: boolean;
  speedMs: number;
  challenge: ChallengeProgress<Decision>;
}

export function mountGameUi<
  Example,
  Snapshot,
  Decision,
  Action extends string,
  ChallengeSnapshot extends Snapshot,
>(
  root: HTMLElement,
  context: GameMountContext,
  config: GameUiConfig<Example, Snapshot, Decision, Action, ChallengeSnapshot>,
): () => void {
  root.innerHTML = `
    <div data-game-ui-content></div>
    <div class="game-announcer" role="status" aria-live="polite" aria-atomic="true"></div>
  `;
  const contentRoot = root.querySelector<HTMLElement>("[data-game-ui-content]");
  const announcer = root.querySelector<HTMLElement>(".game-announcer");
  if (!contentRoot || !announcer) {
    throw new Error("Shared game UI hosts were not created.");
  }

  let lastGeneratedExample = config.input.generate();
  const initialTrace = generateTrace(config, lastGeneratedExample);
  const state: MutableGameState<Example, Snapshot, Decision> = {
    rawInput: config.input.format(lastGeneratedExample),
    validationError: "",
    acceptedExample: lastGeneratedExample,
    trace: initialTrace,
    stepIndex: 0,
    mode: "explore",
    isPlaying: false,
    speedMs: DEFAULT_SPEED_MS,
    challenge: newChallenge(config, initialTrace),
  };
  let playbackTimer: number | undefined;
  let announcementTimer: number | undefined;
  let announcedFeedback = state.challenge.feedback;

  const announceChallengeFeedback = (): void => {
    const feedback = state.challenge.feedback;
    if (state.mode !== "challenge") {
      announcedFeedback = feedback;
      announcer.textContent = "";
      return;
    }
    if (feedback === announcedFeedback) return;

    announcedFeedback = feedback;
    if (announcementTimer !== undefined) {
      window.clearTimeout(announcementTimer);
      announcementTimer = undefined;
    }
    announcer.textContent = "";
    if (feedback) {
      announcementTimer = window.setTimeout(() => {
        announcer.textContent = feedback.message;
        announcementTimer = undefined;
      }, 0);
    }
  };

  const render = (focusTarget?: string): void => {
    const activeElement = document.activeElement;
    const activeFocus =
      activeElement instanceof HTMLElement && root.contains(activeElement)
        ? activeElement.dataset.focus
        : undefined;
    const activeSelection =
      activeElement instanceof HTMLInputElement && activeElement.type === "text"
        ? {
            start: activeElement.selectionStart,
            end: activeElement.selectionEnd,
            direction: activeElement.selectionDirection,
          }
        : null;
    contentRoot.innerHTML = renderGameUi(
      context,
      state satisfies GameUiState<Example, Snapshot, Decision>,
      config,
    );
    announceChallengeFeedback();

    const nextFocus = focusTarget ?? activeFocus;
    if (nextFocus) {
      const target = contentRoot.querySelector<HTMLElement>(
        `[data-focus="${nextFocus}"]`,
      );
      if (target instanceof HTMLButtonElement && target.disabled) {
        contentRoot
          .querySelector<HTMLElement>('[data-focus="toggle-play"]')
          ?.focus({ preventScroll: true });
      } else {
        target?.focus({ preventScroll: true });
        if (target instanceof HTMLInputElement && activeSelection) {
          target.setSelectionRange(
            activeSelection.start,
            activeSelection.end,
            activeSelection.direction ?? undefined,
          );
        }
      }
    }
  };

  const stopPlayback = (): void => {
    state.isPlaying = false;
    if (playbackTimer !== undefined) {
      window.clearTimeout(playbackTimer);
      playbackTimer = undefined;
    }
  };

  const schedulePlayback = (): void => {
    if (!state.isPlaying) return;
    if (playbackTimer !== undefined) window.clearTimeout(playbackTimer);
    playbackTimer = window.setTimeout(() => {
      playbackTimer = undefined;
      if (!state.isPlaying) return;

      const lastIndex = state.trace.length - 1;
      state.stepIndex = Math.min(state.stepIndex + 1, lastIndex);
      if (state.stepIndex === lastIndex) stopPlayback();
      render();
      schedulePlayback();
    }, state.speedMs);
  };

  const moveToStep = (stepIndex: number, focusTarget: string): void => {
    stopPlayback();
    state.stepIndex = Math.max(0, Math.min(stepIndex, state.trace.length - 1));
    render(focusTarget);
  };

  const installExample = (example: Example, rawInput: string): void => {
    const trace = generateTrace(config, example);
    stopPlayback();
    state.rawInput = rawInput;
    state.validationError = "";
    state.acceptedExample = example;
    state.trace = trace;
    state.stepIndex = 0;
    state.challenge = newChallenge(config, trace);
  };

  const acceptInput = (rawInput: string, focusTarget?: string): void => {
    const parsed = config.input.parse(rawInput);
    state.rawInput = rawInput;
    if (!parsed.ok) {
      stopPlayback();
      state.validationError = parsed.error;
      render();
      root.querySelector<HTMLInputElement>("#example-input")?.focus();
      return;
    }

    installExample(parsed.value, rawInput);
    render(focusTarget);
  };

  const installGeneratedExample = (): void => {
    const generated = config.input.generate(lastGeneratedExample);
    lastGeneratedExample = generated;
    installExample(generated, config.input.format(generated));
  };

  const showMode = (mode: GameMode): void => {
    stopPlayback();
    if (mode === state.mode) {
      render(mode === "explore" ? "show-explore" : "show-challenge");
      return;
    }
    state.mode = mode;
    if (mode === "challenge") installGeneratedExample();
    render(mode === "explore" ? "show-explore" : "show-challenge");
  };

  const answerChallenge = (answer: Action): void => {
    const decision = state.challenge.decisions[state.challenge.cursor];
    if (!decision) return;
    const snapshot = config.challenge.snapshot(state.trace, decision);
    const isCorrect = answer === config.challenge.expectedAction(decision);
    const attempts = state.challenge.attempts + 1;
    const correct = state.challenge.correct + (isCorrect ? 1 : 0);
    state.challenge = {
      ...state.challenge,
      cursor: state.challenge.cursor + (isCorrect ? 1 : 0),
      attempts,
      correct,
      score: correct * config.challenge.pointsPerCorrect,
      accuracy: Math.round((correct / attempts) * 100),
      feedback: {
        tone: isCorrect ? "correct" : "incorrect",
        message: config.challenge.explainAnswer(
          snapshot,
          decision,
          answer,
          isCorrect,
        ),
        decisionNumber: state.challenge.cursor + 1,
        advanced: isCorrect,
      },
    };
    render(
      config.challenge.isComplete(state.challenge)
        ? "restart-challenge"
        : "challenge-answer",
    );
  };

  const togglePlayback = (): void => {
    if (state.isPlaying) {
      stopPlayback();
      render("toggle-play");
      return;
    }
    if (state.trace.length === 1) {
      render("toggle-play");
      return;
    }
    if (state.stepIndex >= state.trace.length - 1) state.stepIndex = 0;
    state.isPlaying = true;
    render("toggle-play");
    schedulePlayback();
  };

  const handleAction = (action: string, element: HTMLElement): void => {
    switch (action) {
      case "show-explore":
        showMode("explore");
        break;
      case "show-challenge":
        showMode("challenge");
        break;
      case "first":
        moveToStep(0, "first");
        break;
      case "previous":
        moveToStep(state.stepIndex - 1, "previous");
        break;
      case "next":
        moveToStep(state.stepIndex + 1, "next");
        break;
      case "last":
        moveToStep(state.trace.length - 1, "last");
        break;
      case "toggle-play":
        togglePlayback();
        break;
      case "preset":
        acceptInput(element.dataset.value ?? "", element.dataset.focus);
        break;
      case "randomize":
        installGeneratedExample();
        render("randomize");
        break;
      case "restart-challenge":
        installGeneratedExample();
        render("challenge-answer");
        break;
      case "challenge-answer": {
        const answer = config.challenge.actions.find(
          (option) => option.action === element.dataset.answer,
        );
        if (answer) answerChallenge(answer.action);
        break;
      }
    }
  };

  const handleClick = (event: MouseEvent): void => {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-action]")
        : null;
    const action = target?.dataset.action;
    if (target && action) handleAction(action, target);
  };

  const handleSubmit = (event: SubmitEvent): void => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.dataset.form !== "example")
      return;
    event.preventDefault();
    const input = form.elements.namedItem("example");
    if (input instanceof HTMLInputElement)
      acceptInput(input.value, "run-trace");
  };

  const handleInput = (event: Event): void => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.name === "example") state.rawInput = input.value;
    if (input.name === "timeline") {
      moveToStep(Number(input.value), "timeline");
    }
  };

  const handleChange = (event: Event): void => {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement) || select.name !== "speed")
      return;
    state.speedMs = Number(select.value);
    if (state.isPlaying) schedulePlayback();
    render("speed");
  };

  root.addEventListener("click", handleClick);
  root.addEventListener("submit", handleSubmit);
  root.addEventListener("input", handleInput);
  root.addEventListener("change", handleChange);
  render();

  return () => {
    stopPlayback();
    if (announcementTimer !== undefined) {
      window.clearTimeout(announcementTimer);
    }
    root.removeEventListener("click", handleClick);
    root.removeEventListener("submit", handleSubmit);
    root.removeEventListener("input", handleInput);
    root.removeEventListener("change", handleChange);
    root.innerHTML = "";
  };
}

function generateTrace<
  Example,
  Snapshot,
  Decision,
  Action extends string,
  ChallengeSnapshot extends Snapshot,
>(
  config: GameUiConfig<Example, Snapshot, Decision, Action, ChallengeSnapshot>,
  example: Example,
): readonly Snapshot[] {
  const trace = config.trace.generate(example);
  if (trace.length === 0) {
    throw new Error("A game trace must contain at least one snapshot.");
  }
  return trace;
}

function newChallenge<
  Example,
  Snapshot,
  Decision,
  Action extends string,
  ChallengeSnapshot extends Snapshot,
>(
  config: GameUiConfig<Example, Snapshot, Decision, Action, ChallengeSnapshot>,
  trace: readonly Snapshot[],
): ChallengeProgress<Decision> {
  return {
    decisions: config.challenge.decisions(trace),
    cursor: 0,
    attempts: 0,
    correct: 0,
    score: 0,
    accuracy: 100,
    feedback: null,
  };
}
