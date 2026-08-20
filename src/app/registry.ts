export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface GameModule {
  mount: (root: HTMLElement) => () => void;
}

export interface GameDefinition {
  readonly slug: string;
  readonly title: string;
  readonly technique: string;
  readonly description: string;
  readonly difficulty: Difficulty;
  readonly load: () => Promise<GameModule>;
}

export const gameRegistry: readonly GameDefinition[] = [];
