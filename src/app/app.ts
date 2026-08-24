import { gameRegistry } from "./registry";

const HOME_ROUTE = "#/";
const gamesByTechnique = [...gameRegistry].sort(
  (left, right) =>
    left.technique.localeCompare(right.technique) ||
    left.title.localeCompare(right.title),
);

export function mountApp(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="site-shell">
      <header class="site-header">
        <a class="brand" href="${HOME_ROUTE}" aria-label="Algo Arcade home">
          <span class="brand-mark" aria-hidden="true">A</span>
          <span>
            <strong>ALGO ARCADE</strong>
            <small>INSERT LOGIC</small>
          </span>
        </a>
        <span class="system-status"><i aria-hidden="true"></i> SYSTEM READY</span>
      </header>
      <main id="route-outlet" class="route-outlet" tabindex="-1"></main>
      <footer class="site-footer">
        <span>LEARN THE MOVE</span>
        <span>READ THE STATE</span>
        <span>BEAT THE TRACE</span>
      </footer>
    </div>
  `;

  const outlet = root.querySelector<HTMLElement>("#route-outlet");
  if (!outlet) {
    throw new Error("Route outlet was not created.");
  }

  let gameCleanup: (() => void) | undefined;
  let routeVersion = 0;

  const renderRoute = async (): Promise<void> => {
    routeVersion += 1;
    const currentVersion = routeVersion;
    gameCleanup?.();
    gameCleanup = undefined;

    const hash = window.location.hash;
    if (!hash || hash === HOME_ROUTE) {
      renderHome(outlet);
      focusRoute(outlet);
      return;
    }

    const slug = readGameSlug(hash);
    if (!slug) {
      renderNotFound(outlet);
      focusRoute(outlet);
      return;
    }

    const gameIndex = gamesByTechnique.findIndex(
      (candidate) => candidate.slug === slug,
    );
    const game = gamesByTechnique[gameIndex];
    if (!game) {
      renderNotFound(outlet);
      focusRoute(outlet);
      return;
    }

    try {
      outlet.innerHTML = `<p class="loading-message">LOADING ${game.title.toUpperCase()}...</p>`;
      const module = await game.load();
      if (routeVersion !== currentVersion) return;

      outlet.innerHTML = "";
      gameCleanup = module.mount(outlet, {
        gameNumber: gameIndex + 1,
        metadata: game,
      });
      focusRoute(outlet);
    } catch {
      if (routeVersion !== currentVersion) return;
      renderLoadError(outlet, game.title);
      focusRoute(outlet);
    }
  };

  const handleHashChange = (): void => {
    void renderRoute();
  };

  window.addEventListener("hashchange", handleHashChange);
  void renderRoute();

  return () => {
    routeVersion += 1;
    gameCleanup?.();
    window.removeEventListener("hashchange", handleHashChange);
    root.innerHTML = "";
  };
}

function focusRoute(outlet: HTMLElement): void {
  window.scrollTo(0, 0);
  outlet.focus({ preventScroll: true });
}

function readGameSlug(hash: string): string | undefined {
  const match = /^#\/games\/([^/]+)$/.exec(hash);
  return match?.[1];
}

function renderHome(outlet: HTMLElement): void {
  const cards = gamesByTechnique
    .map(
      (game, index) => `
        <a class="game-card" href="#/games/${game.slug}" data-game-number="${String(index + 1).padStart(2, "0")}">
          <span class="cartridge-number">GAME ${String(index + 1).padStart(2, "0")}</span>
          <span class="difficulty-tag">${game.difficulty}</span>
          <h2>${game.title}</h2>
          <strong>${game.technique}</strong>
          <p>${game.description}</p>
          <span class="card-action">PRESS START <b aria-hidden="true">&gt;</b></span>
        </a>
      `,
    )
    .join("");

  outlet.innerHTML = `
    <section class="home-hero" aria-labelledby="home-title">
      <p class="eyebrow">TRAINING DECK // 001</p>
      <h1 id="home-title">SEE EVERY<br /><span>ALGORITHM MOVE</span></h1>
      <p class="hero-copy">
        Edit the input. Run the trace. Rewind every decision. Then prove you
        can predict the algorithm's next move.
      </p>
    </section>
    <section class="game-library" aria-labelledby="library-title">
      <div class="section-heading">
        <h2 id="library-title">SELECT A GAME</h2>
        <span>${gamesByTechnique.length} LOADED</span>
      </div>
      <div class="game-grid">
        ${cards || '<p class="empty-library">NEW TRAINING CARTRIDGE INCOMING...</p>'}
      </div>
    </section>
  `;
}

function renderNotFound(outlet: HTMLElement): void {
  outlet.innerHTML = `
    <section class="not-found">
      <p class="error-code">ERROR 404</p>
      <h1>CARTRIDGE NOT FOUND</h1>
      <a class="pixel-button" href="${HOME_ROUTE}">RETURN TO ARCADE</a>
    </section>
  `;
}

function renderLoadError(outlet: HTMLElement, title: string): void {
  outlet.innerHTML = `
    <section class="not-found" role="alert">
      <p class="error-code">LOAD ERROR</p>
      <h1>${title.toUpperCase()} DID NOT START</h1>
      <p>Return to the library and try loading the game again.</p>
      <a class="pixel-button" href="${HOME_ROUTE}">RETURN TO ARCADE</a>
    </section>
  `;
}
