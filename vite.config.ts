import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/algo-arcade/",
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
  },
});
