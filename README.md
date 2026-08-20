# Algo Arcade

Algo Arcade is a client-side collection of focused mini-games for learning
algorithms one state transition at a time. Every game supports editable input,
rewindable trace playback, and a prediction challenge driven by the same pure
algorithm trace.

The interface uses an original NES-era-inspired visual system. It does not use
Nintendo branding, characters, artwork, music, sounds, or other copied assets.

## First Game: Stack Reactor

Stack Reactor teaches the monotonic-stack technique through Next Greater
Element. Given an integer sequence, it finds the first strictly greater value
to the right of each item.

The default example is:

```text
Input:  [2, 1, 2, 4, 3]
Output: [4, 2, 4, -1, -1]
```

Explore mode provides complete trace playback, including comparisons, pushes,
pops, output updates, operation counts, and active pseudocode. Challenge mode
asks the learner to predict whether the algorithm must pop the stack or stop
popping and push the current value.

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

Vite serves the project below `/algos-mini-games/`, matching the production
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

<https://bajor.github.io/algos-mini-games/>

## Adding Games

Read [`AGENTS.md`](./AGENTS.md) before adding a game. It defines the game
contract, trace rules, shared visual language, accessibility requirements,
testing expectations, and definition of done.
