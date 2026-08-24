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
  PYTHON_CODE,
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
    formatLabel: "1-12 integers, separated by commas or spaces",
    presets: EXAMPLE_PRESETS,
    parse: parseExample,
    format: (example) => example.join(", "),
    generate: (previous) => generateProceduralExample(Math.random, previous),
  },
  trace: {
    generate: generateTrace,
  },
  stage: {
    className: "nge-stage",
    title: "SIGNAL SCAN DECK",
    operationLabel,
    renderBody: renderStageBody,
    explanation: stageExplanation,
    legend: STAGE_LEGEND,
  },
  code: {
    listings: { pseudocode: PSEUDOCODE, python: PYTHON_CODE },
    activeLineId: (snapshot) => snapshot.line,
  },
  diagnostics: {
    entries: getDiagnostics,
    ruleLabel: "STACK RULE",
    rule: "Unresolved values remain in decreasing order. Equal values stay unresolved.",
  },
  challenge: {
    briefTitle: "CALL THE NEXT STACK MOVE",
    brief:
      "A fresh sequence is generated for every run. Earn 100 points per correct decision; wrong calls show why and let you retry.",
    pointsPerCorrect: 100,
    decisions: getChallengeDecisions,
    snapshot: getChallengeSnapshot,
    expectedAction: (decision) => decision.expectedAction,
    prompt: renderChallengePrompt,
    actions: CHALLENGE_ACTIONS,
    explainAnswer: explainChallengeAnswer,
    isComplete: (progress) => progress.cursor >= progress.decisions.length,
    completionTitle: "STACK PILOT CLEARED",
    completionRule:
      "pop only when the current value is strictly greater than the stack top.",
  },
} satisfies GameUiConfig<
  Example,
  TraceSnapshot,
  ChallengeDecision,
  ChallengeAction,
  Extract<TraceSnapshot, { readonly kind: "compare" }>
>;

export function mount(
  root: HTMLElement,
  context: GameMountContext,
): () => void {
  return mountGameUi(root, context, gameUiConfig);
}
