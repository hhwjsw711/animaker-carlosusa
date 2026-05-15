import { SITE_URL, buildJsonLd, type LandingLang } from "./landing-seo";
import { buildHead } from "@/lib/seo-head";
import { langPrefix } from "@/i18n/locale-routing";

const TITLES: Record<
  LandingLang,
  { title: string; description: string; keywords: string; ogAlt: string }
> = {
  "pt-BR": {
    title: "Vertex — Assistente inteligente para gestão do seu negócio",
    description:
      "Plataforma completa com IA para gerenciar clientes, serviços, produtos, agenda, financeiro e equipe.",
    keywords: "Vertex, gestão, IA, clientes, agenda, financeiro, plataforma",
    ogAlt: "Vertex — Assistente inteligente para gestão",
  },
  "en-US": {
    title: "Vertex — Intelligent assistant for your business",
    description:
      "All-in-one AI platform to manage customers, services, products, calendar, finance and team.",
    keywords: "Vertex, management, AI, customers, calendar, finance, platform",
    ogAlt: "Vertex — Intelligent business assistant",
  },
  "zh-CN": {
    title: "Vertex — 智能助手，轻松管理您的业务",
    description:
      "一站式AI平台，管理客户、服务、产品、日历、财务和团队。",
    keywords: "Vertex, 管理, AI, 客户, 日历, 财务, 平台",
    ogAlt: "Vertex — 智能业务助手",
  },
};

/**
 * Builds the <head> bundle for the landing at the given language.
 */
export function buildLandingHead(lang: LandingLang) {
  const canonical = `${SITE_URL}${langPrefix(lang) || "/"}`;
  const ogLocale = lang === "en-US" ? "en_US" : lang === "zh-CN" ? "zh_CN" : "pt_BR";
  const meta = TITLES[lang];
  const input = {
    ...meta,
    canonical,
    ogLocale,
    alternates: {
      "pt-BR": `${SITE_URL}/`,
      "en-US": `${SITE_URL}/en`,
      "zh-CN": `${SITE_URL}/zh`,
      "x-default": `${SITE_URL}/`,
    },
  };
  return buildHead(input, buildJsonLd(input));
}
