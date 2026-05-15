import { SITE_URL, LIGHT_BG_HEX, DARK_BG_HEX, type MetaInput } from "@/components/landing/seo-utils";

type HeadMeta = Record<string, string>;
type HeadLink = Record<string, string>;
type HeadScript = { type?: string; children?: string; src?: string };

export interface BuiltHead {
  meta: HeadMeta[];
  links: HeadLink[];
  scripts: HeadScript[];
}

const DEFAULT_ALTERNATES = {
  "pt-BR": `${SITE_URL}/pt`,
  "en-US": `${SITE_URL}/en`,
  "x-default": `${SITE_URL}/`,
} as const;

/**
 * Escapes `</script` sequences so untrusted string values can't terminate
 * the surrounding <script> element when TanStack renders the JSON-LD payload.
 */
function serializeJsonLd(payload: unknown): string {
  return JSON.stringify(payload).replace(/<\/(script)/gi, "<\\/$1");
}

export function buildHead(input: MetaInput, jsonLd?: unknown): BuiltHead {
  const alternates = input.alternates ?? DEFAULT_ALTERNATES;
  const ogType = input.ogType ?? "website";
  // og:image is opt-in: only emit the tags when the caller passes a real URL.
  // The previous default pointed at /og-image.png which isn't yet in public/,
  // so every social share was a broken-image preview. Callers that have a
  // per-route cover (blog post coverImageUrl) pass input.ogImage; landing can
  // start passing it once a 1200x630 PNG is added to public/.
  const ogImage = input.ogImage;
  const robots = input.robots ?? "index,follow,max-image-preview:large";

  const meta: HeadMeta[] = [
    { title: input.title },
    { name: "description", content: input.description },
    { name: "keywords", content: input.keywords },
    { name: "author", content: "Vertex" },
    { name: "robots", content: robots },
    { property: "og:type", content: ogType },
    { property: "og:site_name", content: "Vertex" },
    { property: "og:title", content: input.title },
    { property: "og:description", content: input.description },
    { property: "og:url", content: input.canonical },
    { property: "og:locale", content: input.ogLocale },
    { name: "twitter:card", content: ogImage ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: input.description },
    { name: "theme-color", content: LIGHT_BG_HEX, media: "(prefers-color-scheme: light)" },
    { name: "theme-color", content: DARK_BG_HEX, media: "(prefers-color-scheme: dark)" },
    { name: "color-scheme", content: "light dark" },
  ];

  if (ogImage) {
    meta.push(
      { property: "og:image", content: ogImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: input.ogAlt },
      { name: "twitter:image", content: ogImage },
      { name: "twitter:image:alt", content: input.ogAlt },
    );
  }

  if (ogType === "article") {
    if (input.articlePublishedTime) {
      meta.push({ property: "article:published_time", content: input.articlePublishedTime });
    }
    if (input.articleModifiedTime) {
      meta.push({ property: "article:modified_time", content: input.articleModifiedTime });
    }
    if (input.articleAuthor) {
      meta.push({ property: "article:author", content: input.articleAuthor });
    }
  }

  const links: HeadLink[] = [
    { rel: "canonical", href: input.canonical },
    { rel: "alternate", hrefLang: "pt-BR", href: alternates["pt-BR"] },
    { rel: "alternate", hrefLang: "en-US", href: alternates["en-US"] },
    { rel: "alternate", hrefLang: "x-default", href: alternates["x-default"] },
  ];

  if (input.prevUrl) links.push({ rel: "prev", href: input.prevUrl });
  if (input.nextUrl) links.push({ rel: "next", href: input.nextUrl });

  const scripts: HeadScript[] = [];
  if (jsonLd !== undefined) {
    scripts.push({
      type: "application/ld+json",
      children: serializeJsonLd(jsonLd),
    });
  }

  return { meta, links, scripts };
}
