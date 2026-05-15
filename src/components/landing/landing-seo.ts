import { SITE_URL, LIGHT_BG_HEX, DARK_BG_HEX, type MetaInput, type LangCode } from "./seo-utils";

export type LandingLang = LangCode;

export { SITE_URL, LIGHT_BG_HEX, DARK_BG_HEX };
export type { MetaInput };

// Social profile URLs for the Organization schema. Empty strings are filtered
// out before serialization.
const ORGANIZATION_SAMEAS: string[] = [];

export function buildJsonLd(input: MetaInput): unknown {
  const lang = input.ogLocale.replace("_", "-");
  const sameAs = ORGANIZATION_SAMEAS.filter(Boolean);
  const organization: Record<string, unknown> = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Vertex",
    url: SITE_URL,
  };
  if (sameAs.length > 0) organization.sameAs = sameAs;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Vertex",
        description: input.description,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: lang,
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: "Vertex",
        description: input.description,
        url: input.canonical,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: lang,
        publisher: { "@id": `${SITE_URL}/#organization` },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
        },
      },
    ],
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function buildFaqJsonLd(items: ReadonlyArray<FaqItem>): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildLegalJsonLd(input: MetaInput): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    description: input.description,
    url: input.canonical,
    inLanguage: input.ogLocale.replace("_", "-"),
    isPartOf: {
      "@type": "WebSite",
      name: "Vertex",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Vertex",
      url: SITE_URL,
    },
  };
}
