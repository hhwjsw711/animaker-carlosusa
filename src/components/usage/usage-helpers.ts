export const SOURCE_KEYS = ["chat", "scheduled", "extraction", "rag", "exa", "imageGeneration"] as const;
export type SourceKey = (typeof SOURCE_KEYS)[number];

export const SOURCE_COLORS: Record<SourceKey, string> = {
  chat: "var(--chart-1)",
  scheduled: "var(--chart-2)",
  extraction: "var(--chart-3)",
  rag: "var(--chart-4)",
  exa: "var(--chart-5)",
  imageGeneration: "var(--chart-6)",
};

export const SOURCE_LABEL_KEYS: Record<SourceKey, string> = {
  chat: "labels.chatSource",
  scheduled: "labels.agentSource",
  extraction: "labels.extractionSource",
  rag: "labels.ragSource",
  exa: "labels.exaSource",
  imageGeneration: "labels.imageGenerationSource",
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}

export interface UsageHistoryRow {
  date: string;
  chat: { inputTokens: number; outputTokens: number; requests: number; credits: number };
  scheduled: { inputTokens: number; outputTokens: number; requests: number; credits: number };
  extraction: { inputTokens: number; outputTokens: number; requests: number; credits: number };
  rag: { tokens: number; inserts: number; searches: number; credits: number };
  exa: { searches: number; answers: number; contents: number; credits: number };
  imageGeneration: { generations: number; edits: number; credits: number };
}
