import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
  },
  // Two levels of test. The pure map modules (layout, viewport math, sprite
  // compilation) need no DOM; the hooks and the small components that decide
  // what a panel says when it has no data do. Rather than run two environments,
  // everything runs under jsdom — the pure tests neither notice nor care.
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
    restoreMocks: true,
  },
});
