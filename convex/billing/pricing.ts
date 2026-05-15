// Conversão de consumo real → créditos.
// 1 crédito ≈ $0.005 de custo real.
// Todos os valores são calibrados para Qwen 3.5 / Gemini Flash como modelos primários.

const CREDIT_RATES = {
  // Chat/Scheduled: ~2 créditos por turno simples (5K input + 2K output)
  chat: { inputTokensPer: 2500, outputTokensPer: 1000 },
  scheduled: { inputTokensPer: 2500, outputTokensPer: 1000 },
  // Extraction (Gemini 2.0 Flash — muito barato)
  extraction: { inputTokensPer: 5000, outputTokensPer: 2500 },
  // RAG: custo fixo mínimo (embedding é quase gratuito: $0.02/M tokens)
  rag: { insert: 1, search: 1 },
  // Exa: custo fixo por chamada (search $0.007, answer $0.005, content $0.001)
  exa: { search: 3, answer: 2, content: 1 },
  // Image generation (fal.ai Nano Banana 2): $0.08/imagem em 1K
  imageGeneration: { generation: 16, edit: 16 },
} as const;

type TokenSource = "chat" | "scheduled" | "extraction";
type ExaType = "search" | "answer" | "content";
type RagOperation = "insert" | "search";
type ImageType = "generation" | "edit";

export function calculateCredits(
  source: "chat" | "scheduled" | "extraction" | "rag" | "exa" | "imageGeneration",
  options: {
    inputTokens?: number;
    outputTokens?: number;
    exaType?: ExaType;
    ragOperation?: RagOperation;
    imageType?: ImageType;
  },
): number {
  switch (source) {
    case "chat":
    case "scheduled":
    case "extraction": {
      const rates = CREDIT_RATES[source as TokenSource];
      const inputTokens = Math.max(0, options.inputTokens ?? 0);
      const outputTokens = Math.max(0, options.outputTokens ?? 0);
      const inputCredits = Math.ceil(inputTokens / rates.inputTokensPer);
      const outputCredits = Math.ceil(outputTokens / rates.outputTokensPer);
      return Math.max(1, inputCredits + outputCredits);
    }
    case "rag":
      return CREDIT_RATES.rag[options.ragOperation ?? "search"];
    case "exa":
      return CREDIT_RATES.exa[options.exaType ?? "search"];
    case "imageGeneration":
      return CREDIT_RATES.imageGeneration[options.imageType ?? "generation"];
  }
}
