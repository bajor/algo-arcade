# Algorithm Mini-Games Agent Guide

## Purpose

This repository is a long-term collection of small browser games for learning
algorithms and algorithmic techniques. Each game must let a learner edit an
example, run the algorithm, inspect every state transition, and practice the
same decisions in a short challenge.

Optimize for understanding and play. A game is not complete when it merely
animates an answer; it must make the algorithm's state and decisions visible.

## Non-Negotiable Constraints

- The application is entirely client-side and deploys as static files to
  GitHub Pages.
- Use Vite with strict TypeScript and browser-native DOM APIs. Do not add a UI
  framework unless the user explicitly approves that architectural change.
- Do not add a backend, database, account system, telemetry, runtime API
  dependency, or server-side rendering.
- Every algorithm must support user-editable input. Valid input regenerates a
  deterministic trace; invalid input shows a precise, actionable error.
- Every game must generate fresh valid examples procedurally so repeated play
  teaches the decision pattern instead of one memorized answer.
- Every algorithm must provide both Explore mode and Challenge mode.
- Reuse the shared application shell, controls, layout, design tokens, and
  game contracts. Do not create a visually or structurally isolated microsite.
- Keep algorithm rules in one pure module. Rendering and challenge code must
  consume that module rather than reimplementing the algorithm.
- The production build must work below the `/algo-arcade/` GitHub Pages
  repository path, not only at a domain root.

## Product Language

Use these terms consistently:

- **Game**: one algorithm or one focused algorithmic technique.
- **Example**: validated user input supplied to an algorithm.
- **Trace**: the complete ordered list of immutable algorithm snapshots.
- **Snapshot**: all state needed to render and explain one atomic transition.
- **Explore mode**: free playback and inspection of a trace.
- **Challenge mode**: a prediction or decision exercise driven by the same
  trace used by Explore mode.
- **Stage**: the main animated representation of the current snapshot.

## Technical Baseline

- Package manager: npm.
- Language: strict TypeScript.
- Build tool: Vite.
- Unit and DOM tests: Vitest.
- Browser smoke tests: Playwright.
- Linting: ESLint with TypeScript support.
- Formatting: Prettier.
- CI and deployment: GitHub Actions.

Use the versions already locked in `package-lock.json`. Add a dependency only
when browser APIs and existing dependencies cannot solve the requirement
clearly in a small amount of code.

The required quality command is:

```bash
make test
```

`make test` must run formatting checks, linting, TypeScript checks, unit and DOM
tests, browser tests, and the production build. Do not claim completion unless
it passes. If a browser binary is unavailable, install it with the project's
documented Playwright command and rerun the complete check.

## Repository Structure

Follow this ownership model as the collection grows:

```text
src/
  app/                    shared shell, navigation, and game registry
  games/
    <game-slug>/
      algorithm.ts       pure parser, validation, and trace generation
      game.ts            metadata and challenge rules
      view.ts             game-specific DOM rendering and interaction
      algorithm.test.ts  trace tests
      view.test.ts        focused DOM behavior tests
  shared/                 genuinely reused TypeScript utilities and controls
  styles/                 global tokens, shell, controls, and shared patterns
tests/                    Playwright browser tests
```

Keep game-specific behavior inside its game directory. Move code to `shared/`
only after at least two games need the same behavior. Shared visual primitives
and trace playback controls are exceptions because consistency is a core
product requirement.

## Game Contract

Every new game must define metadata in the central game registry. Metadata must
include a stable slug, title, technique, short description, difficulty, and a
loader for the game module. The home screen must derive its game list from this
registry.

Every game must provide the following behavior:

1. Show at least one useful preset example.
2. Provide a clearly labeled control that generates a fresh example.
3. Let the learner edit the example using a format explained next to the input.
4. Validate bounds and syntax before starting a run.
5. Reset to the first snapshot when accepted input changes.
6. Generate a deterministic trace with one conceptual action per snapshot.
7. Display the input, active items, working data structure, known output, and
   current operation distinctly.
8. Explain why the current operation occurs in plain language.
9. Highlight the corresponding pseudocode line.
10. Provide first, previous, play/pause, next, last, speed, and timeline controls.
11. Allow moving backward without rerunning the algorithm.
12. Show useful operation counts, such as comparisons, pushes, and pops.
13. End with a concise summary of the result and complexity.
14. Provide a keyboard-operable Challenge mode based on decisions in the trace.
15. Explain incorrect answers and allow recovery without reloading the page.
16. Work at 320 CSS pixels wide and at current desktop viewport sizes.

Do not hide essential state inside animation. When motion is disabled or a
learner jumps through the timeline, every snapshot must remain understandable.

## Trace Design

The trace generator must be a pure function: equal validated input produces
deeply equal output without reading time, randomness, the DOM, or global state.

Model trace events with a discriminated union. Each event kind must contain the
data required for its own explanation and rendering. Prefer domain-specific
event names such as `compare`, `resolve`, `push`, and `complete` over booleans
such as `isPopping`.

Snapshots must be immutable from the consumer's perspective. Clone arrays and
objects when recording a step so later mutations cannot rewrite history.

Make transitions atomic. If one input value causes three stack pops, record
three separately inspectable resolve transitions rather than one opaque jump.

Pseudocode lines must have stable identifiers. Trace events reference those
identifiers; renderers must not infer the active line from an event's position.

## Procedural Examples

Procedural generation belongs outside the trace generator. Randomness may
choose an example, but after validation that example must produce the same trace
on every run.

- Generate within the documented input bounds and validate generated values
  through the same path used by edited examples.
- Construct examples that exercise the algorithm's meaningful branches. Do not
  rely on unconstrained random input that can repeatedly produce trivial runs.
- Do not repeat the immediately previous generated example.
- Keep presets and manual editing available for controlled investigation.
- Start each new Challenge run with a fresh generated example unless the game's
  learning design explicitly requires comparing the same trace.
- Never read randomness, time, storage, or the DOM from a pure algorithm or
  trace module.

## Explore Mode

Explore mode is the default. It must prioritize comprehension over spectacle:

- Playback never begins automatically after page load or input changes.
- The current step and total step count are always visible.
- Previous and timeline controls remain available after completion.
- Playback pauses at the final snapshot.
- Changing speed changes only playback delay, never algorithm state.
- Changing the example discards the old trace only after the new input passes
  validation.

## Challenge Mode

Challenge mode must test the algorithm's next decision rather than trivia or
memorized definitions. Derive challenge prompts and expected answers from the
canonical trace.

- State the objective before the challenge begins.
- Never require reaction speed; no answer timer is permitted by default.
- Keep scoring simple and explain it before play.
- Do not advance on an incorrect answer until the learner has seen why it is
  incorrect and can try again.
- Show a completion summary with accuracy and the decisions practiced.
- Reset challenge progress when the example changes.
- Use a fresh procedurally generated example when a challenge is restarted so
  scores reflect pattern recognition rather than memorization.

## NES-Inspired Visual System

All screens and games use one original Nintendo Entertainment System-inspired
8-bit visual language. This describes an era and rendering style; it does not
permit copying Nintendo intellectual property.

- Use only original names, characters, sprites, icons, backgrounds, sounds, and
  game concepts.
- Never use Nintendo logos, controller silhouettes, game screenshots, music,
  sound effects, characters, maps, or recognizable copied assets.
- Use the shared pixel display font for short headings and labels and the shared
  readable monospace font for explanations, inputs, and pseudocode. Do not add
  a game-specific font.
- Store approved font files locally with their licenses. Do not depend on a
  third-party font CDN at runtime.
- Use the shared limited palette through CSS custom properties. A game may use
  semantic accent colors from that palette but may not define a separate theme.
- Align dimensions and spacing to the shared 8-pixel grid where practical.
- Use hard edges, stepped corners, one-color highlights, pixel borders, tiled
  patterns, and offset pixel shadows.
- Render pixel art with `image-rendering: pixelated`.
- Avoid gradients, blur, glass effects, photorealism, soft shadows, excessive
  rounded cards, and generic dashboard layouts.
- Use restrained scanline or CRT texture only as nonessential decoration. It
  must not reduce text contrast or produce flicker.
- Keep animation stepped and purposeful. Stack pushes, pops, comparisons, and
  resolved answers should read like game actions.
- Preserve the same shell, type scale, control shapes, focus treatment, panel
  framing, and motion timing across games.

The experience must evoke an original 8-bit learning cartridge, not imitate a
specific commercial game.

## Accessibility and Input

- Meet WCAG AA contrast for instructional text and controls.
- Never communicate state with color alone; pair color with text, shape, icon,
  or position.
- Use semantic HTML before ARIA.
- Every interactive element must have a visible focus state and work by
  keyboard.
- Keep touch targets at least 44 by 44 CSS pixels even when the visible art is
  smaller.
- Respect `prefers-reduced-motion`. Disable decorative movement and replace
  animated state transitions with immediate state changes.
- Announce validation errors and important challenge feedback to assistive
  technology without announcing every autoplay frame.
- Do not play sound until the learner explicitly enables it. Muting must persist
  for the current browser when sound is eventually introduced.

## Implementation Workflow for a New Game

1. Read this file and inspect every existing game before designing the new one.
2. Identify the smallest concrete problem that teaches the requested technique.
3. Write down the input format, bounds, procedural-generation constraints,
   invariants, trace event kinds, challenge decision, and expected final output
   before coding.
4. Reuse the registry, shell, playback controller, controls, tokens, and shared
   panels.
5. Implement input validation and the pure trace generator first.
6. Add unit tests for a representative example and meaningful edge cases.
7. Build the stage renderer and explanations from snapshots only.
8. Add Explore controls, then Challenge mode from the same trace.
9. Add focused DOM tests and one browser happy-path test.
10. Verify responsive behavior, keyboard use, reduced motion, and the GitHub
    Pages production base path.
11. Run `make test` and fix every failure.
12. Update the home registry and user-facing documentation.

Do not begin by cloning and recoloring a previous game. Reuse shared structure,
but create a stage metaphor that makes the new algorithm's own data movement
clear.

## Testing Requirements

For every trace generator, test:

- The documented preset from initial state through final result.
- The smallest valid input.
- Duplicate values when equality changes behavior.
- Negative or zero values when valid for the input domain.
- Already ordered and reverse-ordered inputs when relevant.
- Validation at and beyond each documented bound.
- Determinism and snapshot independence where mutation bugs are plausible.

For every game UI, test only distinct behavior:

- Valid custom input regenerates and resets the trace.
- Invalid input keeps the current trace and shows a useful error.
- Timeline controls display the expected snapshot.
- One incorrect and one correct challenge decision follow the documented flow.

The browser suite must prove that the production-shaped app loads, the game is
discoverable, and its primary Explore and Challenge paths work. Avoid redundant
tests that assert the same rule at multiple levels without a distinct risk.

## GitHub Pages and Navigation

- Vite's base path must be `/algo-arcade/` in production.
- Use hash-based client navigation if multiple screens need routes. Direct page
  reloads must never depend on a server rewrite.
- Use relative or Vite-resolved asset references; do not hardcode domain names.
- The deploy workflow must run the complete quality gate before uploading
  `dist/`.
- A failed quality gate must prevent deployment.

## Scope Discipline

- Build one focused teaching problem per requested game unless the user asks for
  a broader sandbox.
- Do not add authentication, cloud saves, social features, global leaderboards,
  ads, analytics, or unrelated algorithms.
- Prefer clear code in the owning game module over speculative abstractions.
- Keep functions focused and shallow. Name bounds, delays, and scoring values.
- Comments explain algorithmic intent or non-obvious constraints, not syntax.
- Remove code made unused by the current change; do not clean up unrelated code.

## Initial Game

The first game teaches the monotonic-stack technique through Next Greater
Element. It uses a decreasing stack of unresolved indices. Equal values do not
resolve one another because the target value must be strictly greater.

The initial preset is `[2, 1, 2, 4, 3]`, whose result is
`[4, 2, 4, -1, -1]`.

This section records the first implementation target. It does not make
monotonic-stack behavior part of the shared architecture.

## Definition of Done

A new game is complete only when all of the following are true:

- The requested technique has one focused, playable game.
- Custom input, validation, presets, reset, and deterministic replay work.
- Procedurally generated examples are valid, meaningful, and avoid immediate
  repetition.
- Explore and Challenge modes consume the same trace.
- All required playback controls and explanations are present.
- The game uses only the shared NES-inspired visual system.
- Mobile, desktop, keyboard, and reduced-motion behavior are usable.
- Unit, DOM, and browser tests cover distinct happy paths and edge cases.
- `make test` passes from a clean dependency install.
- The production build works under `/algo-arcade/`.
- The game appears in the registry and user documentation.
- No copyrighted Nintendo assets or runtime server dependencies are present.
