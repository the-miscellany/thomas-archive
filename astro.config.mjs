import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { copyFile, readFile } from "node:fs/promises";
import { createRequire } from "node:module";

import sitemap from "@astrojs/sitemap";

// MapLibre runs its tile parsing in a web worker, a separate file that Astro 2's build drops. This
// serves it in dev and copies it into the build, at /maplibre-gl-worker.js (see the migration map).
const require = createRequire(import.meta.url);
const maplibreWorker = require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs");
const WORKER_PATH = "/maplibre-gl-worker.js";

function maplibreWorkerFile() {
  return {
    name: "maplibre-worker",
    hooks: {
      "astro:server:setup": ({ server }) => {
        server.middlewares.use(WORKER_PATH, async (_req, res) => {
          res.setHeader("Content-Type", "text/javascript");
          res.end(await readFile(maplibreWorker));
        });
      },
      "astro:build:done": async ({ dir }) => {
        await copyFile(maplibreWorker, new URL(WORKER_PATH.slice(1), dir));
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: "https://thomasarchive.com",
  integrations: [mdx(), sitemap(), maplibreWorkerFile()],
});
