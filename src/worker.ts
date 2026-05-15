import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";

interface WorkerEnv {
  VITE_CONVEX_URL?: string;
  VITE_SITE_URL?: string;
}

const tanstackFetch = createStartHandler(defaultStreamHandler);

async function generateSitemap(env: WorkerEnv): Promise<Response> {
  const siteUrl = env.VITE_SITE_URL ?? "https://vertex.app";

  const xml = buildSitemapXml(siteUrl);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // 1h fresh at the CDN, stale-while-revalidate for 1d.
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

function buildSitemapXml(siteUrl: string): string {
  const entries: string[] = [];

  const LANDING_ALTS = [
    // pt-BR lives at the root without a prefix; only en-US has the `/en`
    // prefix; zh-CN has the `/zh` prefix.
    // `x-default` points to the canonical pt-BR URL.
    { hreflang: "pt-BR", href: `${siteUrl}/` },
    { hreflang: "en-US", href: `${siteUrl}/en` },
    { hreflang: "zh-CN", href: `${siteUrl}/zh` },
    { hreflang: "x-default", href: `${siteUrl}/` },
  ];
  const PRIVACY_ALTS = [
    { hreflang: "pt-BR", href: `${siteUrl}/privacy` },
    { hreflang: "en-US", href: `${siteUrl}/en/privacy` },
    { hreflang: "zh-CN", href: `${siteUrl}/zh/privacy` },
    { hreflang: "x-default", href: `${siteUrl}/privacy` },
  ];
  const TERMS_ALTS = [
    { hreflang: "pt-BR", href: `${siteUrl}/terms` },
    { hreflang: "en-US", href: `${siteUrl}/en/terms` },
    { hreflang: "zh-CN", href: `${siteUrl}/zh/terms` },
    { hreflang: "x-default", href: `${siteUrl}/terms` },
  ];

  entries.push(urlEntry(`${siteUrl}/`, "weekly", "1.0", LANDING_ALTS));
  entries.push(urlEntry(`${siteUrl}/en`, "weekly", "0.9", LANDING_ALTS));
  entries.push(urlEntry(`${siteUrl}/zh`, "weekly", "0.9", LANDING_ALTS));
  entries.push(urlEntry(`${siteUrl}/privacy`, "monthly", "0.3", PRIVACY_ALTS));
  entries.push(urlEntry(`${siteUrl}/en/privacy`, "monthly", "0.3", PRIVACY_ALTS));
  entries.push(urlEntry(`${siteUrl}/zh/privacy`, "monthly", "0.3", PRIVACY_ALTS));
  entries.push(urlEntry(`${siteUrl}/terms`, "monthly", "0.3", TERMS_ALTS));
  entries.push(urlEntry(`${siteUrl}/en/terms`, "monthly", "0.3", TERMS_ALTS));
  entries.push(urlEntry(`${siteUrl}/zh/terms`, "monthly", "0.3", TERMS_ALTS));

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;
}

function urlEntry(
  loc: string,
  changefreq: string,
  priority: string,
  alternates?: Array<{ hreflang: string; href: string }>,
): string {
  const altLines = alternates
    ? alternates
        .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`)
        .join("\n")
    : "";
  return `  <url>
    <loc>${loc}</loc>
${altLines ? altLines + "\n" : ""}    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/sitemap.xml") {
      return generateSitemap(env);
    }
    // Delegate every other route to TanStack Start's default stream handler.
    return tanstackFetch(request, env as never, ctx);
  },
};
