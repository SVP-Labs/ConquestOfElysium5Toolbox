import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";

const shim = (name) => fileURLToPath(new URL(`./src/shims/${name}.js`, import.meta.url));

/**
 * The validator (modcheck/) loads its JSON tables through node:fs at module
 * load, which a browser bundle cannot do. For client-side code only, the two
 * builtins resolve to shims that serve those same tables from bundled JSON.
 * Server-side (pre-rendering) keeps the real modules.
 */
const modcheckBrowserShims = {
  name: "modcheck-browser-shims",
  enforce: "pre",
  resolveId(id, _importer, options) {
    if (options?.ssr) return null;
    if (id === "node:fs" || id === "fs") return shim("fs");
    if (id === "node:path" || id === "path") return shim("path");
    return null;
  },
};

export default defineConfig({
  site: "https://toolbox.svp.gl",
  integrations: [
    // /play stays out of the sitemap while it is unlisted (it also carries
    // a noindex meta of its own). Exact match — /commands/playerevent and
    // friends must stay in.
    sitemap({
      filter: (page) => !["/play", "/play/"].includes(new URL(page).pathname),
    }),
  ],
  vite: {
    plugins: [modcheckBrowserShims],
  },
});
