import "@fontsource/press-start-2p/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/shell.css";
import "./shared/game-ui/styles.css";

import { mountApp } from "./app/app";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Application root #app was not found.");
}

mountApp(root);
