import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsxInject: 'import React from "react"',
  },
  server: { port: 5173 },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-utils/setupTests.js",
    globals: true,
  },
});
