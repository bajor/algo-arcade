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
  type ChallengeSnapshot,
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
    formatLabel: "1-12 comma-delimited lowercase words; 1-12 letters each",
    presets: EXAMPLE_PRESETS,
    parse: parseExample,
    format: (example) => example.tokens.join(", "),
    generate: (previous) => generateProceduralExample(Math.random, previous),
  },
  trace: {
    generate: generateTrace,
  },
  stage: {
    className: "frequency-map-stage",
    title: "TOKEN TALLY DEPOT",
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
    ruleLabel: "FREQUENCY MAP INVARIANT",
    rule: "Each stored key appears once, its count equals the processed occurrences, and key order follows first appearance.",
  },
  challenge: {
    briefTitle: "CALL THE KEY LOOKUP",
    brief:
      "A fresh token feed includes new and repeated keys. Earn 100 points by choosing insert or increment at each lookup; wrong calls explain the visible map and let you retry.",
    pointsPerCorrect: 100,
    decisions: getChallengeDecisions,
    snapshot: getChallengeSnapshot,
    expectedAction: (decision) => decision.expectedAction,
    prompt: renderChallengePrompt,
    actions: CHALLENGE_ACTIONS,
    explainAnswer: explainChallengeAnswer,
    isComplete: (progress) => progress.cursor >= progress.decisions.length,
    completionTitle: "TOKEN TALLY CERTIFIED",
    completionRule:
      "insert an absent token with count 1; increment the existing count when its key is already present.",
  },
} satisfies GameUiConfig<
  Example,
  TraceSnapshot,
  ChallengeDecision,
  ChallengeAction,
  ChallengeSnapshot
>;

export function mount(
  root: HTMLElement,
  context: GameMountContext,
): () => void {
  return mountGameUi(root, context, gameUiConfig);
}
