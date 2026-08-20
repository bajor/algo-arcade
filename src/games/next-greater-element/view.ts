import "./styles.css";

import {
  DEFAULT_EXAMPLE,
  generateTrace,
  parseExample,
  type TraceSnapshot,
} from "./algorithm";
import { getChallengeDecisions, type ChallengeAction } from "./game";
import {
  explainChallengeAnswer,
  renderGame,
  type ChallengeProgress,
  type GameMode,
  type GameViewModel,
} from "./render";

const DEFAULT_INPUT = DEFAULT_EXAMPLE.join(", ");
const DEFAULT_SPEED_MS = 700;

interface MutableGameState {
  rawInput: string;
  validationError: string;
  trace: readonly TraceSnapshot[];
  stepIndex: number;
  mode: GameMode;
  isPlaying: boolean;
  speedMs: number;
  challenge: ChallengeProgress;
}

export function mount(root: HTMLElement): () => void {
  const trace = generateTrace(DEFAULT_EXAMPLE);
  const state: MutableGameState = {
    rawInput: DEFAULT_INPUT,
    validationError: "",
    trace,
    stepIndex: 0,
    mode: "explore",
    isPlaying: false,
    speedMs: DEFAULT_SPEED_MS,
    challenge: newChallenge(trace),
  };
  let playbackTimer: number | undefined;

  const render = (focusAction?: string): void => {
    root.innerHTML = renderGame(state satisfies GameViewModel);
    if (focusAction) {
      root
        .querySelector<HTMLElement>(`[data-action="${focusAction}"]`)
        ?.focus({ preventScroll: true });
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
    window.clearTimeout(playbackTimer);
    playbackTimer = window.setTimeout(() => {
      if (state.stepIndex >= state.trace.length - 1) {
        stopPlayback();
      } else {
        state.stepIndex += 1;
      }
      render("toggle-play");
      schedulePlayback();
    }, state.speedMs);
  };

  const moveToStep = (stepIndex: number, focusAction: string): void => {
    stopPlayback();
    state.stepIndex = Math.max(0, Math.min(stepIndex, state.trace.length - 1));
    render(focusAction);
  };

  const acceptInput = (rawInput: string): void => {
    const parsed = parseExample(rawInput);
    state.rawInput = rawInput;
    if (!parsed.ok) {
      stopPlayback();
      state.validationError = parsed.error;
      render();
      root.querySelector<HTMLInputElement>("#example-input")?.focus();
      return;
    }

    const nextTrace = generateTrace(parsed.value);
    stopPlayback();
    state.validationError = "";
    state.trace = nextTrace;
    state.stepIndex = 0;
    state.challenge = newChallenge(nextTrace);
    render();
  };

  const showMode = (mode: GameMode): void => {
    stopPlayback();
    state.mode = mode;
    render(mode === "explore" ? "show-explore" : "show-challenge");
  };

  const answerChallenge = (answer: ChallengeAction): void => {
    const decision = state.challenge.decisions[state.challenge.cursor];
    if (!decision) return;
    const snapshot = state.trace[decision.snapshotIndex];
    if (!snapshot || snapshot.kind !== "compare") return;

    const isCorrect = answer === decision.expectedAction;
    state.challenge = {
      ...state.challenge,
      cursor: isCorrect ? state.challenge.cursor + 1 : state.challenge.cursor,
      attempts: state.challenge.attempts + 1,
      correct: state.challenge.correct + (isCorrect ? 1 : 0),
      feedback: explainChallengeAnswer(snapshot, answer),
      feedbackTone: isCorrect ? "correct" : "incorrect",
    };
    render("challenge-answer");
  };

  const handleAction = (action: string, element: HTMLElement): void => {
    const actionHandlers: Record<string, () => void> = {
      "show-explore": () => {
        showMode("explore");
      },
      "show-challenge": () => {
        showMode("challenge");
      },
      first: () => {
        moveToStep(0, "first");
      },
      previous: () => {
        moveToStep(state.stepIndex - 1, "previous");
      },
      next: () => {
        moveToStep(state.stepIndex + 1, "next");
      },
      last: () => {
        moveToStep(state.trace.length - 1, "last");
      },
      "toggle-play": () => {
        togglePlayback();
      },
      preset: () => {
        acceptInput(element.dataset.value ?? "");
      },
      "restart-challenge": () => {
        restartChallenge();
      },
      "challenge-answer": () => {
        const answer = element.dataset.answer;
        if (answer === "pop" || answer === "stop") answerChallenge(answer);
      },
    };
    actionHandlers[action]?.();
  };

  const togglePlayback = (): void => {
    if (state.isPlaying) {
      stopPlayback();
      render("toggle-play");
      return;
    }
    if (state.stepIndex >= state.trace.length - 1) state.stepIndex = 0;
    state.isPlaying = true;
    render("toggle-play");
    schedulePlayback();
  };

  const restartChallenge = (): void => {
    state.challenge = newChallenge(state.trace);
    render("challenge-answer");
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
    if (input instanceof HTMLInputElement) acceptInput(input.value);
  };

  const handleInput = (event: Event): void => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.name === "example") state.rawInput = input.value;
    if (input.name === "timeline") moveToStep(Number(input.value), "timeline");
  };

  const handleChange = (event: Event): void => {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement) || select.name !== "speed")
      return;
    state.speedMs = Number(select.value);
    if (state.isPlaying) schedulePlayback();
    render();
  };

  root.addEventListener("click", handleClick);
  root.addEventListener("submit", handleSubmit);
  root.addEventListener("input", handleInput);
  root.addEventListener("change", handleChange);
  render();

  return () => {
    stopPlayback();
    root.removeEventListener("click", handleClick);
    root.removeEventListener("submit", handleSubmit);
    root.removeEventListener("input", handleInput);
    root.removeEventListener("change", handleChange);
    root.innerHTML = "";
  };
}

function newChallenge(trace: readonly TraceSnapshot[]): ChallengeProgress {
  return {
    decisions: getChallengeDecisions(trace),
    cursor: 0,
    attempts: 0,
    correct: 0,
    feedback: "",
    feedbackTone: null,
  };
}
