// Registro central de modelos LLM disponíveis no app.
// Este é o ÚNICO lugar onde modelos devem ser adicionados, removidos ou editados.
// Acessível por qualquer função backend (convex/**) e qualquer componente frontend (src/**).
//
// Formato de IDs: OpenRouter (ex: "anthropic/claude-sonnet-4.6")
//
// reasoning — shape idêntico ao parâmetro `reasoning` da OpenRouter API:
//   effort     → "xhigh"~95% | "high"~80% | "medium"~50% | "low"~20% | "minimal"~10% | "none"=off
//   max_tokens → budget exato em tokens (não combinar com effort)
//   enabled    → ativa reasoning com "medium" como padrão
//   exclude    → oculta reasoning da resposta (default false)
//
// providerPreferences — shape idêntico ao parâmetro `provider` da OpenRouter API:
//   order, allow_fallbacks, require_parameters, data_collection, zdr, etc.
//   Docs: https://openrouter.ai/docs/api-reference/provider-routing
//
// sampling — parâmetros de amostragem por modelo (temperature, top_p, etc.)
//   Passados como top-level params ao streamText(), NÃO dentro de providerOptions.
//   Docs: https://openrouter.ai/docs/api-reference/parameters

// ─── Reasoning ──────────────────────────────────────────────────────────────────

export type ORReasoningEffort = "xhigh" | "high" | "medium" | "low" | "minimal" | "none";

export interface ORReasoning {
  effort?: ORReasoningEffort;
  max_tokens?: number;
  exclude?: boolean;
  enabled?: boolean;
}

// ─── Provider Preferences ───────────────────────────────────────────────────────

export type ORQuantization = "int4" | "int8" | "fp4" | "fp6" | "fp8" | "fp16" | "bf16" | "fp32" | "unknown";

export type ORSortStrategy = "price" | "throughput" | "latency" | { by: string; partition?: string };

export interface ORPercentile {
  percentile: number;
  value: number;
}

export interface ORMaxPrice {
  prompt?: number;
  completion?: number;
  request?: number;
  image?: number;
}

export interface ORProviderPreferences {
  order?: Array<string>;
  allow_fallbacks?: boolean;
  require_parameters?: boolean;
  data_collection?: "allow" | "deny";
  zdr?: boolean;
  enforce_distillable_text?: boolean;
  only?: Array<string>;
  ignore?: Array<string>;
  quantizations?: Array<ORQuantization>;
  sort?: ORSortStrategy;
  preferred_min_throughput?: number | ORPercentile;
  preferred_max_latency?: number | ORPercentile;
  max_price?: ORMaxPrice;
}

// ─── Sampling Params ────────────────────────────────────────────────────────────

export interface ORSamplingParams {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  top_a?: number;
  min_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  repetition_penalty?: number;
  max_tokens?: number;
  stop?: string | Array<string>;
  seed?: number;
  response_format?: { type: "json_object" } | { type: "json_schema"; json_schema: Record<string, unknown> };
  verbosity?: "low" | "medium" | "high" | "max";
}

// ─── Model Definition ───────────────────────────────────────────────────────────

export interface ModelDefinition {
  id: string;
  name: string;
  shortName: string;
  provider: string;
  reasoning?: ORReasoning;
  providerPreferences?: ORProviderPreferences;
  sampling?: ORSamplingParams;
  modelIdOverride?: string;
  isDefault?: true;
}

export const models = [
  // Qwen
  {
    id: "qwen/qwen3.6-plus:free",
    name: "Qwen 3.5 397B",
    shortName: "Qwen 3.5",
    provider: "Qwen",
    reasoning: { effort: "high" } satisfies ORReasoning,
    providerPreferences: { order: ["novita"], allow_fallbacks: true } satisfies ORProviderPreferences,
  },
  {
    id: "qwen/qwen3.5-397b-a17b",
    name: "Qwen 3.5 397B",
    shortName: "Qwen 3.5",
    provider: "Qwen",
    reasoning: { effort: "high" } satisfies ORReasoning,
    providerPreferences: { order: ["novita"], allow_fallbacks: true } satisfies ORProviderPreferences,
  },
  // OpenAI
  {
    id: "openai/gpt-5.3-chat",
    name: "GPT-5.3 Chat",
    shortName: "GPT-5.3 Chat",
    provider: "OpenAI",
    reasoning: { effort: "high" } satisfies ORReasoning,
    providerPreferences: { order: ["openai"], allow_fallbacks: true } satisfies ORProviderPreferences,
  },
  // Google - Gemini
  {
    id: "google/gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    shortName: "Gemini 3.1 Pro",
    provider: "Google",
    reasoning: { effort: "high" } satisfies ORReasoning,
    providerPreferences: { order: ["google-ai-studio"], allow_fallbacks: true } satisfies ORProviderPreferences,
  },
  {
    id: "google/gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    shortName: "Gemini 3 Flash",
    provider: "Google",
    reasoning: { effort: "high" } satisfies ORReasoning,
    providerPreferences: { order: ["google-ai-studio"], allow_fallbacks: true } satisfies ORProviderPreferences,
    isDefault: true,
  },
  // Moonshot
  {
    id: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    shortName: "Kimi K2.5",
    provider: "Moonshot",
    reasoning: { effort: "high" } satisfies ORReasoning,
    providerPreferences: { order: ["fireworks"], allow_fallbacks: true } satisfies ORProviderPreferences,
  },
  // ZhipuAI
  {
    id: "z-ai/glm-5",
    name: "GLM-5",
    shortName: "GLM-5",
    provider: "ZhipuAI",
    reasoning: { effort: "high" } satisfies ORReasoning,
    providerPreferences: { order: ["fireworks"], allow_fallbacks: true } satisfies ORProviderPreferences,
  },
  // Anthropic
  {
    id: "anthropic/claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    shortName: "Sonnet 4.6",
    provider: "Anthropic",
    reasoning: { effort: "high" } satisfies ORReasoning,
    providerPreferences: { order: ["anthropic"], allow_fallbacks: true } satisfies ORProviderPreferences,
  },
] as const satisfies Array<ModelDefinition>;

export type ModelId = (typeof models)[number]["id"];

const defaultModel = models.find(m => 'isDefault' in m);
if (!defaultModel) throw new Error("No model marked as isDefault in convex/chat/models.ts");
export const DEFAULT_MODEL = defaultModel.id as ModelId;

/** Fallback chain: se o modelo primário falha, tenta o próximo na lista. */
export const FALLBACK_MODELS: ModelId[] = [
  "qwen/qwen3.5-397b-a17b",
  "moonshotai/kimi-k2.5",
];

// Mapa de lookup interno para O(1) nas funções utilitárias
const modelMap = new Map<string, ModelDefinition>(models.map(m => [m.id, m]));

/** Resolve o ID final enviado à API OpenRouter, aplicando override se necessário. */
export function resolveModelId(id: string): string {
  const model = modelMap.get(id);
  return model?.modelIdOverride ?? id;
}

/** Retorna o objeto providerOptions para o Vercel AI SDK, ou undefined se não aplicável. */
export function getProviderOptions(
  id: string
): { openrouter: Record<string, JSONValue> } | undefined {
  const model = modelMap.get(id);
  if (!model) return undefined;

  const parts: Record<string, JSONValue> = {};
  if (model.reasoning) parts.reasoning = model.reasoning as JSONValue;
  if (model.providerPreferences) parts.provider = model.providerPreferences as JSONValue;

  if (Object.keys(parts).length === 0) return undefined;
  return { openrouter: parts };
}

type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };

/** Retorna parâmetros de sampling por modelo para streamText(), ou undefined. */
export function getSamplingParams(id: string): ORSamplingParams | undefined {
  return modelMap.get(id)?.sampling;
}


