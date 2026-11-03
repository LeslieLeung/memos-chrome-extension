import { defineConfig } from "vitest/config";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => {
  const firefox = mode === "firefox";
  const outDir = firefox ? "dist-firefox" : "dist";

  return {
    plugins: firefox
      ? [{
          name: "firefox-manifest",
          writeBundle() {
            const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8"));
            const overrides = JSON.parse(readFileSync("manifests/firefox.json", "utf8"));
            delete manifest.minimum_chrome_version;
            writeFileSync(
              resolve(outDir, "manifest.json"),
              `${JSON.stringify({ ...manifest, ...overrides }, null, 2)}\n`,
            );
          },
        }]
      : [],
    build: {
      outDir,
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
  };
});
