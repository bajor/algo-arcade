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
    formatLabel:
      "1-48 printable ASCII characters; punctuation ignored, case-insensitive",
    presets: EXAMPLE_PRESETS,
    parse: parseExample,
    format: (example) => example,
    generate: (previous) => generateProceduralExample(Math.random, previous),
  },
  trace: {
    generate: generateTrace,
  },
  stage: {
    className: "palindrome-stage",
    title: "MIRROR SCAN GATE",
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
    ruleLabel: "NORMALIZATION RULE",
    rule: "Ignore non-alphanumeric ASCII characters. Compare letters without ASCII case; digits compare exactly.",
  },
  challenge: {
    briefTitle: "CALL THE NEXT MIRROR MOVE",
    brief:
      "A fresh phrase is generated for every run. Earn 100 points per correct pointer decision; wrong calls explain the phrase characters and let you retry.",
    pointsPerCorrect: 100,
    decisions: getChallengeDecisions,
    snapshot: getChallengeSnapshot,
    expectedAction: (decision) => decision.expectedAction,
    prompt: renderChallengePrompt,
    actions: CHALLENGE_ACTIONS,
    explainAnswer: explainChallengeAnswer,
    isComplete: (progress) => progress.cursor >= progress.decisions.length,
    completionTitle: "MIRROR SCAN CLEARED",
    completionRule:
      "for each phrase, skip left noise first, then right noise; otherwise compare the pointer characters without ASCII case.",
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
