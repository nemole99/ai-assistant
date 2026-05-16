// oxlint-disable require-unicode-regexp
import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  entry: "./src/index.ts",
  format: "esm",
  noExternal: [/@workspace\/.*/],
  outDir: "./dist",
});
