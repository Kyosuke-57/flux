import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "./vitest.config.ts",
  "./apps/flux-api/vitest.config.ts",
]);
