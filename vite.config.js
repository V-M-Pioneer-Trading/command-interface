import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
  },
  // Unit tests cover the pure map modules (layout, viewport math, sprite
  // compilation) — no DOM environment needed.
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
});
