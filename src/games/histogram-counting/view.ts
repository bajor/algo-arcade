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
    formatLabel: "1-16 integers from 0 to 99, separated by commas or spaces",
    presets: EXAMPLE_PRESETS,
    parse: parseExample,
    format: (example) => example.join(", "),
    generate: (previous) => generateProceduralExample(Math.random, previous),
  },
  trace: {
    generate: generateTrace,
  },
  stage: {
    className: "histogram-stage",
    title: "FOUR-TOWER COUNTING FORGE",
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
    ruleLabel: "COUNTING RULE",
    rule: "Each value belongs to exactly one fixed inclusive range, so inspect it once and increment exactly one counter.",
  },
  challenge: {
    briefTitle: "LOAD THE CORRECT RANGE TOWER",
    brief:
      "A fresh feed exercises all four bins and repeats one bin until it is uniquely tallest. Earn 100 points for each correct classification; wrong choices explain the range and let you retry.",
    pointsPerCorrect: 100,
    decisions: getChallengeDecisions,
    snapshot: getChallengeSnapshot,
    expectedAction: (decision) => decision.expectedAction,
    prompt: renderChallengePrompt,
    actions: CHALLENGE_ACTIONS,
    explainAnswer: explainChallengeAnswer,
    isComplete: (progress) => progress.cursor >= progress.decisions.length,
    completionTitle: "HISTOGRAM FORGE CERTIFIED",
    completionRule:
      "place each value in its one inclusive fixed range, then increment only that range's counter.",
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
