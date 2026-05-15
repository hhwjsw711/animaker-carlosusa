export type LangCode = "pt-BR" | "en-US";

export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined) ?? "https://vertex.app";

export const LIGHT_BG_HEX = "#f3f3f3";
export const DARK_BG_HEX = "#1a1a1a";

export interface MetaInput {
  title: string;
  description: string;
  keywords: string;
  ogAlt: string;
  canonical: string;
  ogLocale: string;
  alternates?: {
    "pt-BR": string;
    "en-US": string;
    "x-default": string;
  };
  ogType?: "website" | "article";
  ogImage?: string;
  articlePublishedTime?: string;
  articleModifiedTime?: string;
  articleAuthor?: string;
  robots?: string;
  prevUrl?: string;
  nextUrl?: string;
}
