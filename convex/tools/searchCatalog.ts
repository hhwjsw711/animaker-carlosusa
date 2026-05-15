import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { rag } from "../rag/setup";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

export function createSearchCatalogTool(userId?: string) {
  return createTool({
    description:
      "Semantic search across the user's product and service catalog. Use when the user asks about products or services by description, characteristic, or fuzzy name match.",
    inputSchema: z.object({
      query: z.string().describe("The search query"),
      scope: z
        .enum(["all", "products", "services"])
        .default("all")
        .describe("Search scope"),
    }),
    execute: async (ctx, input) => {
      if (!userId) {
        return { found: false, message: "No user context." };
      }

      try {
        const allResults: Array<{ type: string; id: string | null; title: string | null; content: string; score: number }> = [];

        if (input.scope === "all" || input.scope === "products") {
          const { results } = await rag.search(ctx, {
            namespace: `products:${userId}`,
            query: input.query,
            limit: 5,
            vectorScoreThreshold: 0.3,
          });
          for (const r of results) {
            const text = r.content.map((c: { text: string }) => c.text).join("\n");
            const key = (r as { key?: string }).key;
            const entryTitle = (r as { title?: string }).title;
            const id = key?.replace("product:", "") ?? null;
            allResults.push({ type: "product", id, title: entryTitle ?? null, content: text, score: r.score });
          }
        }

        if (input.scope === "all" || input.scope === "services") {
          const { results } = await rag.search(ctx, {
            namespace: `services:${userId}`,
            query: input.query,
            limit: 5,
            vectorScoreThreshold: 0.3,
          });
          for (const r of results) {
            const text = r.content.map((c: { text: string }) => c.text).join("\n");
            const key = (r as { key?: string }).key;
            const entryTitle = (r as { title?: string }).title;
            const id = key?.replace("service:", "") ?? null;
            allResults.push({ type: "service", id, title: entryTitle ?? null, content: text, score: r.score });
          }
        }

        const estimatedTokens = Math.ceil(input.query.length / 4);
        await ctx.runMutation(internal.usage.mutations.trackUsage, {
          userId: userId as Id<"users">,
          source: "rag",
          ragOperation: "search",
          estimatedTokens,
        });

        if (allResults.length === 0) {
          return { found: false, message: "No matching products or services found." };
        }

        allResults.sort((a, b) => b.score - a.score);

        return {
          found: true,
          resultCount: allResults.length,
          results: allResults.map((r) => ({
            type: r.type,
            id: r.id,
            title: r.title,
            content: r.content,
          })),
        };
      } catch (err) {
        console.error("Catalog search failed:", err);
        return { found: false, message: "Failed to search catalog." };
      }
    },
  });
}
