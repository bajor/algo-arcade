# Algo Arcade

Algo Arcade is a client-side collection of focused mini-games for learning
algorithms one state transition at a time. Every game supports editable input,
rewindable trace playback, and a prediction challenge driven by the same pure
algorithm trace.

The interface uses an original NES-era-inspired visual system. It does not use
Nintendo branding, characters, artwork, music, sounds, or other copied assets.

## Game Catalog

All games use the same shared Explore and Challenge controls while keeping an
algorithm-specific Stage and trace vocabulary.

| Game           | Technique       | Goal                                                                             |
| -------------- | --------------- | -------------------------------------------------------------------------------- |
| Stack Reactor  | Monotonic Stack | Find the first strictly greater value to the right of each number.               |
| Target Lock    | Two Pointers    | Find every unique value pair in a sorted array that sums to a target.            |
| Mirror Scan    | Two Pointers    | Test a lowercase ASCII string for exact palindrome symmetry.                     |
| Window Rescue  | Sliding Window  | Find the shortest positive-number window whose sum reaches a target.             |
| Repeat Breaker | Sliding Window  | Find the earliest longest lowercase ASCII substring with no repeated characters. |

Representative examples are:

```text
Stack Reactor:  [2, 1, 2, 4, 3] -> [4, 2, 4, -1, -1]
Target Lock:    -4, -1, -1, 0, 1, 2, 2, 5, 10 | 4 -> (-1, 5), (2, 2)
Mirror Scan:    racecar -> palindrome
Window Rescue: 2, 3, 1, 2, 4, 3 | 7 -> [4, 3] at [4, 6)
Repeat Breaker: abcabcbb -> abc at [0, 3)
```

Explore mode provides complete trace playback, active pseudocode, operation
counts, and plain-language explanations. Challenge mode asks the learner to
predict the next algorithm decision from the same canonical trace. Fresh
procedural examples avoid immediate repetition and deliberately exercise the
important branches of each technique. Presets and manual input remain available
for controlled dry runs.

## Local Development

Requirements:

- Node.js 22
- npm
- Chromium installed for Playwright

```bash
npm install
npx playwright install chromium
npm run dev
```

Vite serves the project below `/algo-arcade/`, matching the production
GitHub Pages path.

## Quality Gate

```bash
make test
```

The quality gate checks formatting, ESLint, strict TypeScript, Vitest unit and
DOM tests, the production Vite build, and Playwright browser tests at desktop
and 320-pixel-wide viewports.

## Deployment

Pushes to `main` run `.github/workflows/deploy-pages.yml`. The workflow runs the
complete quality gate before uploading `dist/` and deploying to GitHub Pages.

The repository owner must select **GitHub Actions** under **Settings > Pages >
Build and deployment > Source** once. The production URL is:

<https://bajor.github.io/algo-arcade/>

## Adding Games

Read [`AGENTS.md`](./AGENTS.md) before adding a game. It defines the game
contract, trace rules, shared visual language, accessibility requirements,
testing expectations, and definition of done.
