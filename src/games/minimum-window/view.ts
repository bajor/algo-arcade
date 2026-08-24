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
    formatLabel: "1-12 positive integers | target",
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
    className: "minimum-window-stage",
    title: "WINDOW RESCUE SCANNER",
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
    ruleLabel: "POSITIVE-VALUES INVARIANT",
    rule: "Every value is positive, so expanding can only increase the sum and shrinking can only decrease it.",
  },
  challenge: {
    briefTitle: "CALL THE NEXT SCANNER ACTION",
    brief:
      "A fresh rescue tape is generated for every run. Expand while the sum is below target. When a window qualifies, evaluate it for BEST RESCUE before shrinking. Earn 100 points per correct call; wrong calls explain the rule and let you retry.",
    pointsPerCorrect: 100,
    decisions: getChallengeDecisions,
    snapshot: getChallengeSnapshot,
    expectedAction: (decision) => decision.expectedAction,
    prompt: renderChallengePrompt,
    actions: CHALLENGE_ACTIONS,
    explainAnswer: explainChallengeAnswer,
    isComplete: (progress) => progress.cursor >= progress.decisions.length,
    completionTitle: "RESCUE SCANNER CERTIFIED",
    completionRule:
      "expand while the sum is below target; when it reaches target, evaluate the qualifying window before shrinking from the left.",
  },
} satisfies GameUiConfig<
  Example,
  TraceSnapshot,
  ChallengeDecision,
  ChallengeAction,
  Extract<TraceSnapshot, { readonly kind: "decide" }>
>;

export function mount(
  root: HTMLElement,
  context: GameMountContext,
): () => void {
  return mountGameUi(root, context, gameUiConfig);
}
