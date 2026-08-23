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
      "Scan a lowercase string from both ends and compare mirrored characters exactly.",
    difficulty: "Beginner",
    objective: "Decide whether a lowercase string is a palindrome.",
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
      "Maintain a duplicate-free cache across a lowercase string while preserving the earliest longest run.",
    difficulty: "Intermediate",
    objective:
      "Find the earliest longest lowercase substring containing no repeated characters.",
    complexity: {
      time: "O(n)",
      space: "O(k)",
      label: "Linear time and space proportional to the active character set",
    },
    load: () => import("../games/unique-substring/view"),
  },
  {
    slug: "prefix-sum",
    title: "Range Relay",
    technique: "Prefix Sum",
    description:
      "Build cumulative totals once, then subtract two prefix values to answer a range-sum query.",
    difficulty: "Beginner",
    objective:
      "Find the sum of a half-open range with two prefix lookups and one subtraction.",
    complexity: {
      time: "O(n) preprocess and O(1) query",
      space: "O(n)",
      label: "Linear preprocessing, constant-time queries, and linear space",
    },
    load: () => import("../games/prefix-sum/view"),
  },
  {
    slug: "anagram-grouping",
    title: "Anagram Assembly",
    technique: "Hashing / Signatures",
    description:
      "Sort each word into a signature, then collect matching signatures into stable groups.",
    difficulty: "Intermediate",
    objective:
      "Group anagrams while preserving first-seen group and input order.",
    complexity: {
      time: "O(n*k log k)",
      space: "O(n*k)",
      label: "O(n*k log k) time and O(n*k) space",
    },
    load: () => import("../games/anagram-grouping/view"),
  },
  {
    slug: "frequency-map",
    title: "Token Tally",
    technique: "Frequency Map",
    description:
      "Use a hash map to count repeated tokens while preserving each key's first appearance.",
    difficulty: "Beginner",
    objective: "Count every token in first-seen key order.",
    complexity: {
      time: "O(n) expected",
      space: "O(k)",
      label: "O(n) expected time and O(k) space",
    },
    load: () => import("../games/frequency-map/view"),
  },
  {
    slug: "histogram-counting",
    title: "Histogram Forge",
    technique: "Counting / Histogram",
    description:
      "Classify each value into one of four fixed ranges and increment its bin.",
    difficulty: "Beginner",
    objective:
      "Count the values in each fixed range and identify every tallest bin.",
    complexity: {
      time: "O(n)",
      space: "O(1) fixed-bin",
      label: "O(n) time and O(1) fixed-bin space",
    },
    load: () => import("../games/histogram-counting/view"),
  },
];
