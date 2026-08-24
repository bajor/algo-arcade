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
    formatLabel: "1-10 comma-delimited lowercase words; 1-10 letters each",
    presets: EXAMPLE_PRESETS,
    parse: parseExample,
    format: (example) => example.words.join(", "),
    generate: (previous) => generateProceduralExample(Math.random, previous),
  },
  trace: {
    generate: generateTrace,
  },
  stage: {
    className: "anagram-grouping-stage",
    title: "SIGNATURE ASSEMBLY LINE",
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
    ruleLabel: "STABLE GROUPING INVARIANT",
    rule: "Each sorted signature maps to exactly one group; groups keep first-seen signature order and words keep input order.",
  },
  challenge: {
    briefTitle: "CALL THE SIGNATURE LOOKUP",
    brief:
      "A fresh word feed is generated for every run. Earn 100 points by deciding whether each sorted signature creates a group or appends to an existing one; wrong calls explain the directory and let you retry.",
    pointsPerCorrect: 100,
    decisions: getChallengeDecisions,
    snapshot: getChallengeSnapshot,
    expectedAction: (decision) => decision.expectedAction,
    prompt: renderChallengePrompt,
    actions: CHALLENGE_ACTIONS,
    explainAnswer: explainChallengeAnswer,
    isComplete: (progress) => progress.cursor >= progress.decisions.length,
    completionTitle: "ANAGRAM ASSEMBLY CERTIFIED",
    completionRule:
      "create a group when a sorted signature is absent; otherwise append the word to the signature's existing group.",
  },
} satisfies GameUiConfig<
  Example,
  TraceSnapshot,
  ChallengeDecision,
  ChallengeAction,
  Extract<TraceSnapshot, { readonly kind: "lookup" }>
>;

export function mount(
  root: HTMLElement,
  context: GameMountContext,
): () => void {
  return mountGameUi(root, context, gameUiConfig);
}
