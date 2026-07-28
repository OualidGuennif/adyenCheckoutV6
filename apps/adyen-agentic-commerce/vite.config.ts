import { fresh } from "@fresh/plugin-vite";
import { defineConfig } from "vite";
import { sqliteViteHotfix } from "../../scripts/sqlite-vite-hotfix.ts";

export default defineConfig({
  plugins: [fresh(), sqliteViteHotfix()],
  ssr: { external: ["@adyen/api-library"] },
  // No root package.json (Deno workspace), so Vite's default workspace-root
  // detection can't find the monorepo's node_modules — explicitly allow it.
  server: { fs: { allow: ["../.."] } },
});
