import path from "path";
import { execSync } from "child_process";
import { defineConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { FontaineTransform } from "fontaine";
import ViteFont from "vite-plugin-font";

const gitHash = execSync("git rev-parse --short HEAD").toString().trim();

function generateVersionJson(): Plugin {
  return {
    name: "generate-version-json",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: gitHash }),
      });
    },
  };
}

export default defineConfig({
  plugins: [
    cloudflare({ configPath: "wrangler-worker.toml", viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart({
      // Prerender 100%-static public pages (landing + legal, both locales) to
      // real HTML files at build time. Cloudflare Pages serves them directly
      // from the edge — zero worker invocation per visit, and the HTML never
      // depends on client chunks, so stale-chunk errors after deploy cannot
      // affect the SEO-facing surface. nivo-root has no blog.
      prerender: {
        enabled: true,
        crawlLinks: false,
        autoStaticPathsDiscovery: false,
        autoSubfolderIndex: true,
      },
      pages: [
        { path: "/", prerender: { headers: { "Accept-Language": "pt-BR" } } },
        { path: "/en", prerender: { headers: { "Accept-Language": "en-US" } } },
        { path: "/zh", prerender: { headers: { "Accept-Language": "zh-CN" } } },
        { path: "/privacy", prerender: { headers: { "Accept-Language": "pt-BR" } } },
        { path: "/terms", prerender: { headers: { "Accept-Language": "pt-BR" } } },
        { path: "/en/privacy", prerender: { headers: { "Accept-Language": "en-US" } } },
        { path: "/en/terms", prerender: { headers: { "Accept-Language": "en-US" } } },
        { path: "/zh/privacy", prerender: { headers: { "Accept-Language": "zh-CN" } } },
        { path: "/zh/terms", prerender: { headers: { "Accept-Language": "zh-CN" } } },
      ],
    }),
    viteReact(),
    FontaineTransform.vite({
      fallbacks: ["Arial", "Helvetica", "system-ui"],
      resolvePath: (id) =>
        id.startsWith("/fonts/")
          ? path.join(__dirname, "public", id)
          : path.join(__dirname, "node_modules", id),
    }),
    ViteFont.vite(),
    generateVersionJson(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(gitHash),
  },
  server: {
    port: 5183,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
