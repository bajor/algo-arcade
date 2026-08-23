export type GameMode = "explore" | "challenge";
export type FeedbackTone = "correct" | "incorrect";

export type ParseResult<Example> =
  | { readonly ok: true; readonly value: Example }
  | { readonly ok: false; readonly error: string };

export interface ChallengeFeedback {
  readonly tone: FeedbackTone;
  readonly message: string;
  readonly decisionNumber: number;
  readonly advanced: boolean;
}

export interface ChallengeProgress<Decision> {
  readonly decisions: readonly Decision[];
  readonly cursor: number;
  readonly attempts: number;
  readonly correct: number;
  readonly score: number;
  readonly accuracy: number;
  readonly feedback: ChallengeFeedback | null;
}

export interface GameUiState<Example, Snapshot, Decision> {
  readonly rawInput: string;
  readonly validationError: string;
  readonly acceptedExample: Example;
  readonly trace: readonly Snapshot[];
  readonly stepIndex: number;
  readonly mode: GameMode;
  readonly isPlaying: boolean;
  readonly speedMs: number;
  readonly challenge: ChallengeProgress<Decision>;
}

export interface ExamplePreset {
  readonly label: string;
  readonly value: string;
}

export interface StageLegendItem {
  readonly label: string;
  readonly markerClass: string;
}

export interface PseudocodeEntry {
  readonly id: string;
  readonly code: string;
}

export interface DiagnosticEntry {
  readonly label: string;
  readonly value: string;
}

export interface ChallengePrompt {
  readonly label: string;
  readonly heading: string;
  readonly question: string;
}

export interface ChallengeActionOption<Action extends string> {
  readonly action: Action;
  readonly cue: string;
  readonly label: string;
}

export interface GameUiConfig<
  Example,
  Snapshot,
  Decision,
  Action extends string,
  ChallengeSnapshot extends Snapshot = Snapshot,
> {
  readonly input: {
    readonly formatLabel: string;
    readonly presets: readonly ExamplePreset[];
    readonly parse: (rawInput: string) => ParseResult<Example>;
    readonly format: (example: Example) => string;
    readonly generate: (previous?: Example) => Example;
  };
  readonly trace: {
    readonly generate: (example: Example) => readonly Snapshot[];
  };
  readonly stage: {
    readonly className: string;
    readonly title: string;
    readonly operationLabel: (
      snapshot: Snapshot,
      hideDecision: boolean,
    ) => string;
    readonly renderBody: (snapshot: Snapshot, hideDecision: boolean) => string;
    readonly explanation: (snapshot: Snapshot, hideDecision: boolean) => string;
    readonly legend: readonly StageLegendItem[];
  };
  readonly pseudocode: {
    readonly entries: readonly PseudocodeEntry[];
    readonly activeEntryId: (snapshot: Snapshot) => string;
  };
  readonly diagnostics: {
    readonly entries: (
      snapshot: Snapshot,
      stepIndex: number,
      traceLength: number,
    ) => readonly DiagnosticEntry[];
    readonly ruleLabel: string;
    readonly rule: string;
  };
  readonly challenge: {
    readonly briefTitle: string;
    readonly brief: string;
    readonly pointsPerCorrect: number;
    readonly decisions: (trace: readonly Snapshot[]) => readonly Decision[];
    readonly snapshot: (
      trace: readonly Snapshot[],
      decision: Decision,
    ) => ChallengeSnapshot;
    readonly expectedAction: (decision: Decision) => Action;
    readonly prompt: (
      snapshot: ChallengeSnapshot,
      decision: Decision,
      decisionNumber: number,
    ) => ChallengePrompt;
    readonly actions: readonly ChallengeActionOption<Action>[];
    readonly explainAnswer: (
      snapshot: ChallengeSnapshot,
      decision: Decision,
      answer: Action,
      isCorrect: boolean,
    ) => string;
    readonly isComplete: (progress: ChallengeProgress<Decision>) => boolean;
    readonly completionTitle: string;
    readonly completionRule: string;
  };
}
