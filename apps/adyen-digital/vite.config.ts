import { fresh } from "@fresh/plugin-vite";
import { defineConfig } from "vite";
import { sqliteViteHotfix } from "../../scripts/sqlite-vite-hotfix.ts";

export default defineConfig({
  plugins: [fresh(), sqliteViteHotfix()],
  ssr: { external: ["@adyen/api-library"] },
  // No root package.json (Deno workspace), so Vite's default workspace-root
  // detection can't find the monorepo's node_modules — registering more
  // Adyen Web components deepens the import graph enough that some chunks
  // fall outside the default fs allowlist and silently 403 in dev, breaking
  // Drop-in. Explicitly allow the monorepo root.
  server: { fs: { allow: ["../.."] } },
});
