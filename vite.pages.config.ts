import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: "pages",
  publicDir: "../public",
  base: "/wayfin/",
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(process.cwd()) } },
  build: { outDir: "../docs", emptyOutDir: true },
});
