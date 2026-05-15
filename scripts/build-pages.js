#!/usr/bin/env node
/**
 * Post-build: adapts Cloudflare Workers output (produced by @cloudflare/vite-plugin +
 * TanStack Start server-entry) to Cloudflare Pages format.
 *
 * Copies dist/server/assets/*.js → dist/client/assets/, then writes
 * dist/server/index.js as dist/client/_worker.js. _routes.json excludes static
 * assets so Pages serves them directly without invoking the worker.
 */
import { copyFileSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const serverDir = "dist/server";
const serverAssetsDir = "dist/server/assets";
const clientDir = "dist/client";
const clientAssetsDir = "dist/client/assets";

const serverAssets = readdirSync(serverAssetsDir).filter((f) => f.endsWith(".js"));
for (const file of serverAssets) {
  copyFileSync(join(serverAssetsDir, file), join(clientAssetsDir, file));
}

const workerContent = readFileSync(join(serverDir, "index.js"), "utf-8");
writeFileSync(join(clientDir, "_worker.js"), workerContent);

/**
 * Walk the client output tree and collect every prerendered route. TanStack
 * Start emits each prerendered page as `<outDir>/<path>/index.html`, so the
 * route path is the containing directory relative to `dist/client/`.
 * Skipping `assets/` and `fonts/` keeps the scan cheap.
 */
function collectPrerenderedRoutes(dir, routePrefix = "") {
  const routes = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "assets" || entry === "fonts") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      routes.push(...collectPrerenderedRoutes(full, `${routePrefix}/${entry}`));
    } else if (entry === "index.html") {
      routes.push(routePrefix || "/");
    }
  }
  return routes;
}

const prerenderedRoutes = collectPrerenderedRoutes(clientDir);

const routes = {
  version: 1,
  include: ["/*"],
  // Every entry here is served directly by Cloudflare Pages as a static asset,
  // skipping the SSR worker entirely. The prerendered routes are discovered at
  // build time (landing + legal pages); dynamic routes (`/blog/*`, `/_app/*`,
  // sitemap.xml) are NOT excluded so the worker can render them on demand.
  exclude: [
    "/assets/*",
    "/favicon*",
    "/*.png",
    "/*.ico",
    "/*.webmanifest",
    "/fonts/*",
    "/version.json",
    "/manifest.json",
    "/robots.txt",
    ...prerenderedRoutes,
  ],
};
writeFileSync(join(clientDir, "_routes.json"), JSON.stringify(routes, null, 2));

try {
  rmSync(".wrangler", { recursive: true, force: true });
} catch {
  // ignore if not present
}

console.log(`✓ Copied ${serverAssets.length} server assets → dist/client/assets/`);
console.log(`✓ Created dist/client/_worker.js from dist/server/index.js`);
console.log(`✓ Created dist/client/_routes.json`);
