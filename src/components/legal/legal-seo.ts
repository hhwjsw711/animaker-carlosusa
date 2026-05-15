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
    "zh-CN": string;
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
    "zh-CN": {
      title: "隐私政策 — Vertex",
      description:
        "Vertex 如何收集、使用、共享和保护您的个人和业务数据。您的权利、保留期限、安全性和联系方式。",
      ogAlt: "Vertex 隐私政策",
      keywords:
        "隐私, 数据保护, 个人信息, 隐私政策, Vertex",
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
    "zh-CN": {
      title: "服务条款 — Vertex",
      description:
        "使用 Vertex 平台的条款和条件，包括套餐、信用计费、合理使用、知识产权和责任。",
      ogAlt: "Vertex 服务条款",
      keywords:
        "服务条款, 使用条款, 协议, 套餐, 订阅, Vertex",
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
  const ogLocale = lang === "en-US" ? "en_US" : lang === "zh-CN" ? "zh_CN" : "pt_BR";
  const ptCanonical = `${SITE_URL}/${segment}`;
  const enCanonical = `${SITE_URL}/en/${segment}`;
  const zhCanonical = `${SITE_URL}/zh/${segment}`;
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
      "zh-CN": zhCanonical,
      "x-default": ptCanonical,
    },
  };
}
