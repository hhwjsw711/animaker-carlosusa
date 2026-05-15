import { RAG } from "@convex-dev/rag";
import type { EntryId } from "@convex-dev/rag";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { components } from "../_generated/api";

export type { EntryId };

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const rag = new RAG(components.rag, {
  textEmbeddingModel: openrouter.textEmbeddingModel(
    "openai/text-embedding-3-small",
  ),
  embeddingDimension: 1536,
});
