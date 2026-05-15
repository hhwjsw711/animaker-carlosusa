import { buildLegalMeta, type LegalRouteMeta } from "./legal-seo";
import { buildLegalJsonLd } from "../landing/landing-seo";
import { buildHead } from "@/lib/seo-head";
import type { LegalPageType } from "./legal-page";
import type { LandingLang } from "../landing/landing-seo";

export function getLegalRoute(type: LegalPageType, lang: LandingLang): LegalRouteMeta {
  return buildLegalMeta(type, lang);
}

export function buildLegalHead(route: LegalRouteMeta) {
  const input = {
    title: route.title,
    description: route.description,
    keywords: route.keywords,
    ogAlt: route.ogAlt,
    canonical: route.canonical,
    ogLocale: route.ogLocale,
    alternates: route.alternates,
  };
  return buildHead(input, buildLegalJsonLd(input));
}
