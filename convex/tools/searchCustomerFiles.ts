import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { rag } from "../rag/setup";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

export function createSearchCustomerFilesTool(customerId: string, userId?: string) {
  return createTool({
    description:
      "Search the customer's uploaded documents for relevant information. Use this PROACTIVELY for ANY question that could be answered by customer data — financial info, contracts, reports, invoices, personal details, history, etc. Search files first, then supplement with web tools if needed.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("The search query to find relevant content in customer files"),
    }),
    execute: async (ctx, input) => {
      try {
        const { results, text } = await rag.search(ctx, {
          namespace: customerId,
          query: input.query,
          limit: 10,
          chunkContext: { before: 2, after: 2 },
          vectorScoreThreshold: 0.3,
        });

        // Track RAG search embedding tokens (estimated: ~1 token per 4 chars)
        if (userId) {
          const estimatedTokens = Math.ceil(input.query.length / 4);
          await ctx.runMutation(internal.usage.mutations.trackUsage, {
            userId: userId as Id<"users">,
            source: "rag",
            ragOperation: "search",
            estimatedTokens,
          });
        }

        if (!text || results.length === 0) {
          return {
            found: false,
            message: "No relevant content found in customer files.",
          };
        }

        return {
          found: true,
          resultCount: results.length,
          results: results.map((r: { title?: string; content: Array<{ text: string }>; score: number }) => ({
            source: r.title ?? "Unknown file",
            content: r.content.map((c) => c.text).join("\n"),
          })),
          content: text,
        };
      } catch (err) {
        console.error("Customer file search failed:", err);
        return {
          found: false,
          message: "Failed to search customer files.",
        };
      }
    },
  });
}
