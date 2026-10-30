import os from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: { DATA_DIR: path.join(os.tmpdir(), `ksa-test-${process.pid}`) },
  },
});
