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
    formatLabel: "2-12 sorted integers | target",
    presets: EXAMPLE_PRESETS,
    parse: parseExample,
    format: (example) =>
      `${example.values.join(", ")} | ${String(example.target)}`,
    generate: (previous) => generateProceduralExample(Math.random, previous),
  },
  trace: {
    generate: generateTrace,
  },
  stage: {
    className: "pair-sum-stage",
    title: "TARGET LOCK RANGE",
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
    ruleLabel: "CONVERGENCE RULE",
    rule: "Because the values are sorted, moving LEFT right can only raise the sum and moving RIGHT left can only lower it. After a match, skip equal values so each value pair is recorded once.",
  },
  challenge: {
    briefTitle: "CALL THE NEXT TARGET LOCK MOVE",
    brief:
      "A fresh sorted range is generated for every run. Earn 100 points for each correct pointer decision; a wrong call explains the convergence rule and lets you retry.",
    pointsPerCorrect: 100,
    decisions: getChallengeDecisions,
    snapshot: getChallengeSnapshot,
    expectedAction: (decision) => decision.expectedAction,
    prompt: renderChallengePrompt,
    actions: CHALLENGE_ACTIONS,
    explainAnswer: explainChallengeAnswer,
    isComplete: (progress) => progress.cursor >= progress.decisions.length,
    completionTitle: "UNIQUE PAIR VAULT CLEARED",
    completionRule:
      "move toward larger values for a low sum, toward smaller values for a high sum, and record an equal sum once before skipping duplicates.",
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
