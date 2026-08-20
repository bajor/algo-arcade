import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/algos-mini-games/",
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
  },
});
