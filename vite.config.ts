import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    // Chrome extension pages can execute module scripts in a different world
    // from speculative preloads, which makes Vite's generated preload links
    // unusable and produces cross-world mismatch warnings.
    modulePreload: false,
    rollupOptions: {
      input: {
        popup: "popup.html",
        options: "options.html",
        background: "src/background.ts",
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "background"
            ? "assets/background.js"
            : "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
