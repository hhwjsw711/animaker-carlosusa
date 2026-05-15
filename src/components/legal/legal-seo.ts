import { SITE_URL, type LandingLang } from "../landing/landing-seo";
import { langPrefix } from "@/i18n/locale-routing";
import type { LegalPageType } from "./legal-page";

export interface LegalRouteMeta {
  type: LegalPageType;
  lang: LandingLang;
  canonical: string;
  ogLocale: string;
  title: string;
  description: string;
  ogAlt: string;
  keywords: string;
  alternates: {
    "pt-BR": string;
    "en-US": string;
    "x-default": string;
  };
}

const META: Record<
  LegalPageType,
  Record<LandingLang, { title: string; description: string; ogAlt: string; keywords: string }>
> = {
  privacy: {
    "pt-BR": {
      title: "Política de Privacidade — Vertex",
      description:
        "Como o Vertex coleta, usa, compartilha e protege seus dados pessoais e de negócio. Seus direitos, retenção, segurança e contato.",
      ogAlt: "Política de Privacidade da Vertex",
      keywords:
        "privacidade, LGPD, dados pessoais, proteção de dados, política de privacidade, Vertex",
    },
    "en-US": {
      title: "Privacy Policy — Vertex",
      description:
        "How Vertex collects, uses, shares and protects your personal and business data. Your rights, retention, security and contact.",
      ogAlt: "Vertex Privacy Policy",
      keywords:
        "privacy, GDPR, LGPD, data protection, privacy policy, personal data, Vertex",
    },
  },
  terms: {
    "pt-BR": {
      title: "Termos de Uso — Vertex",
      description:
        "Termos e condições para uso da plataforma Vertex, incluindo planos, cobrança de créditos, uso aceitável, propriedade intelectual e responsabilidade.",
      ogAlt: "Termos de Uso da Vertex",
      keywords: "termos de uso, termos de serviço, contrato, planos, assinatura, Vertex",
    },
    "en-US": {
      title: "Terms of Service — Vertex",
      description:
        "Terms and conditions for using the Vertex platform, including plans, credit billing, acceptable use, intellectual property and liability.",
      ogAlt: "Vertex Terms of Service",
      keywords:
        "terms of service, terms of use, agreement, plans, subscription, Vertex",
    },
  },
};

/**
 * Builds the SEO meta bundle for a legal page at the given language.
 */
export function buildLegalMeta(type: LegalPageType, lang: LandingLang): LegalRouteMeta {
  const meta = META[type][lang];
  const segment = type === "privacy" ? "privacy" : "terms";
  const canonical = `${SITE_URL}${langPrefix(lang)}/${segment}`;
  const ogLocale = lang === "en-US" ? "en_US" : "pt_BR";
  const ptCanonical = `${SITE_URL}/${segment}`;
  const enCanonical = `${SITE_URL}/en/${segment}`;
  return {
    type,
    lang,
    canonical,
    ogLocale,
    title: meta.title,
    description: meta.description,
    ogAlt: meta.ogAlt,
    keywords: meta.keywords,
    alternates: {
      "pt-BR": ptCanonical,
      "en-US": enCanonical,
      "x-default": ptCanonical,
    },
  };
}
