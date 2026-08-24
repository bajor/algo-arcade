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
    formatLabel: "1-12 integers | start:end (half-open range)",
    presets: EXAMPLE_PRESETS,
    parse: parseExample,
    format: (example) =>
      `${example.values.join(", ")} | ${String(example.start)}:${String(example.end)}`,
    generate: (previous) => generateProceduralExample(Math.random, previous),
  },
  trace: {
    generate: generateTrace,
  },
  stage: {
    className: "prefix-sum-stage",
    title: "PREFIX RELAY CIRCUIT",
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
    ruleLabel: "PREFIX INVARIANT",
    rule: "prefix[i] stores the sum of values before index i. Therefore prefix[end] - prefix[start] isolates exactly the half-open range [start, end).",
  },
  challenge: {
    briefTitle: "ASSIGN EACH PREFIX RANGE ROLE",
    brief:
      "A fresh relay is generated for every run. For each built prefix cell, decide whether the range equation adds it, subtracts it, or ignores it. Earn 100 points per correct call; wrong calls explain prefix[end] - prefix[start] and let you retry.",
    pointsPerCorrect: 100,
    decisions: getChallengeDecisions,
    snapshot: getChallengeSnapshot,
    expectedAction: (decision) => decision.expectedAction,
    prompt: renderChallengePrompt,
    actions: CHALLENGE_ACTIONS,
    explainAnswer: explainChallengeAnswer,
    isComplete: (progress) => progress.cursor >= progress.decisions.length,
    completionTitle: "RANGE ROLES CLEARED",
    completionRule:
      "prefix[end] is added, prefix[start] is subtracted, and every other built prefix cell is ignored.",
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
