import { fresh } from "@fresh/plugin-vite";
import { defineConfig } from "vite";
import { adyenLibraryExternal } from "../../scripts/adyen-library-external.ts";
import { sqliteViteHotfix } from "../../scripts/sqlite-vite-hotfix.ts";

export default defineConfig({
  plugins: [fresh(), sqliteViteHotfix(), adyenLibraryExternal()],
  // Only the dev server reads this; the build needs the plugin above.
  ssr: { external: ["@adyen/api-library"] },
  // No root package.json (Deno workspace), so Vite's default workspace-root
  // detection can't find the monorepo's node_modules — explicitly allow it.
  server: { fs: { allow: ["../.."] } },
});
