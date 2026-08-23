export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface GameComplexity {
  readonly time: string;
  readonly space: string;
  readonly label: string;
}

export interface GameMetadata {
  readonly slug: string;
  readonly title: string;
  readonly technique: string;
  readonly description: string;
  readonly difficulty: Difficulty;
  readonly objective: string;
  readonly complexity: GameComplexity;
}

export interface GameMountContext {
  readonly gameNumber: number;
  readonly metadata: GameMetadata;
}

export interface GameModule {
  mount: (root: HTMLElement, context: GameMountContext) => () => void;
}

export interface GameDefinition extends GameMetadata {
  readonly load: () => Promise<GameModule>;
}

export const gameRegistry: readonly GameDefinition[] = [
  {
    slug: "next-greater-element",
    title: "Stack Reactor",
    technique: "Monotonic Stack",
    description:
      "Scan a signal row, keep unresolved values in order, and pop the stack when a stronger signal arrives.",
    difficulty: "Beginner",
    objective:
      "Find the first strictly greater value to the right of every signal.",
    complexity: {
      time: "O(n)",
      space: "O(n)",
      label: "Linear time and linear space",
    },
    load: () => import("../games/next-greater-element/view"),
  },
  {
    slug: "pair-sum",
    title: "Target Lock",
    technique: "Two Pointers",
    description:
      "Converge across a sorted range, record every unique target pair, and skip duplicate values.",
    difficulty: "Intermediate",
    objective:
      "Find every unique value pair in a sorted array that sums to the target.",
    complexity: {
      time: "O(n)",
      space: "O(1)",
      label:
        "Linear time and constant auxiliary space, excluding the returned pairs",
    },
    load: () => import("../games/pair-sum/view"),
  },
  {
    slug: "palindrome",
    title: "Mirror Scan",
    technique: "Two Pointers",
    description:
      "Scan a phrase from both ends, skip punctuation, and test mirrored characters without case.",
    difficulty: "Beginner",
    objective:
      "Decide whether a phrase is a palindrome after ignoring punctuation, spaces, and ASCII case.",
    complexity: {
      time: "O(n)",
      space: "O(1)",
      label: "Linear time and constant auxiliary space",
    },
    load: () => import("../games/palindrome/view"),
  },
  {
    slug: "minimum-window",
    title: "Window Rescue",
    technique: "Sliding Window",
    description:
      "Expand and shrink a positive-number window to rescue the shortest range that reaches a target.",
    difficulty: "Intermediate",
    objective:
      "Find the shortest contiguous positive-number window whose sum reaches the target.",
    complexity: {
      time: "O(n)",
      space: "O(1)",
      label: "Linear time and constant auxiliary space",
    },
    load: () => import("../games/minimum-window/view"),
  },
  {
    slug: "unique-substring",
    title: "Repeat Breaker",
    technique: "Sliding Window",
    description:
      "Maintain a duplicate-free character cache while preserving the earliest longest run.",
    difficulty: "Intermediate",
    objective:
      "Find the earliest longest substring containing no repeated characters.",
    complexity: {
      time: "O(n)",
      space: "O(k)",
      label: "Linear time and space proportional to the active character set",
    },
    load: () => import("../games/unique-substring/view"),
  },
];
