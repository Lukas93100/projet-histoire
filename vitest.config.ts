import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@shared": fileURLToPath(new URL("./supabase/functions/_shared", import.meta.url)) },
  },
});
