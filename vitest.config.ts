import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "app/**/*.test.{ts,tsx}",
      "src/**/__tests__/**/*.{ts,tsx}",
      "app/**/__tests__/**/*.{ts,tsx}",
    ],
    projects: [
      { extends: true },
      {
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "apps/flux-api"),
          },
        },
        test: {
          globals: true,
          environment: "node",
          include: [
            "apps/flux-api/**/*.test.{ts,tsx}",
            "apps/flux-api/**/__tests__/**/*.{ts,tsx}",
          ],
        },
      },
    ],
  },
});
