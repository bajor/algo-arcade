import "./styles.css";

import type { GameMountContext } from "../../app/registry";
import { mountGameUi, type GameUiConfig } from "../../shared/game-ui";
import {
  generateTrace,
  parseExample,
  type Example,
  type TraceSnapshot,
} from "./algorithm";
import {
  EXAMPLE_PRESETS,
  generateProceduralExample,
  getChallengeDecisions,
  getChallengeSnapshot,
  type ChallengeAction,
  type ChallengeDecision,
} from "./game";
import {
  CHALLENGE_ACTIONS,
  PSEUDOCODE,
  STAGE_LEGEND,
  explainChallengeAnswer,
  getDiagnostics,
  operationLabel,
  renderChallengePrompt,
  renderStageBody,
  stageExplanation,
} from "./render";

const gameUiConfig = {
  input: {
    formatLabel: "1-16 lowercase letters or digits",
    presets: EXAMPLE_PRESETS,
    parse: parseExample,
    format: (example) => example,
    generate: (previous) => generateProceduralExample(Math.random, previous),
  },
  trace: {
    generate: generateTrace,
  },
  stage: {
    className: "unique-substring-stage",
    title: "REPEAT BREAKER CACHE",
    operationLabel,
    renderBody: renderStageBody,
    explanation: stageExplanation,
    legend: STAGE_LEGEND,
  },
  pseudocode: {
    entries: PSEUDOCODE,
    activeEntryId: (snapshot) => snapshot.line,
  },
  diagnostics: {
    entries: getDiagnostics,
    ruleLabel: "UNIQUE-WINDOW INVARIANT",
    rule: "Every character in the half-open window [left, right) appears exactly once and is present in the active cache.",
  },
  challenge: {
    briefTitle: "CALL THE CACHE MOVE",
    brief:
      "A fresh character tape is generated for every run. Earn 100 points per correct membership decision; wrong calls explain the cache state and let you retry.",
    pointsPerCorrect: 100,
    decisions: getChallengeDecisions,
    snapshot: getChallengeSnapshot,
    expectedAction: (decision) => decision.expectedAction,
    prompt: renderChallengePrompt,
    actions: CHALLENGE_ACTIONS,
    explainAnswer: explainChallengeAnswer,
    isComplete: (progress) => progress.cursor >= progress.decisions.length,
    completionTitle: "REPEAT BREAKER CLEARED",
    completionRule:
      "shrink when the incoming character is already cached; otherwise add it and expand.",
  },
} satisfies GameUiConfig<
  Example,
  TraceSnapshot,
  ChallengeDecision,
  ChallengeAction,
  Extract<TraceSnapshot, { readonly kind: "inspect" }>
>;

export function mount(
  root: HTMLElement,
  context: GameMountContext,
): () => void {
  return mountGameUi(root, context, gameUiConfig);
}
