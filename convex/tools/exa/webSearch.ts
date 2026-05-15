import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { getExaClient } from "./client";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { withTimeout, TOOL_TIMEOUT_WEB } from "../utils";

interface WebCallCounter {
  webCalls: number;
}

export function createWebSearchTool(counter: WebCallCounter, maxCalls: number, userId?: string) {
  return createTool({
    description:
      "Search the web for current information, recent events, or any topic. Use this when you need up-to-date data or facts you are uncertain about.",
    inputSchema: z.object({
      query: z.string().describe("The search query"),
      type: z
        .enum(["neural", "fast", "auto", "deep", "instant"])
        .optional()
        .describe("Search type. Defaults to auto"),
      numResults: z
        .number()
        .optional()
        .describe("Number of results to return. Defaults to 5, max 100"),
      category: z
        .enum([
          "company",
          "research paper",
          "news",
          "personal site",
          "financial report",
          "people",
        ])
        .optional()
        .describe("Narrow search to a specific category"),
      startPublishedDate: z
        .string()
        .optional()
        .describe("Include results published after this date (ISO 8601)"),
      endPublishedDate: z
        .string()
        .optional()
        .describe("Include results published before this date (ISO 8601)"),
      includeDomains: z
        .array(z.string())
        .optional()
        .describe("Restrict results to these domains"),
      excludeDomains: z
        .array(z.string())
        .optional()
        .describe("Exclude results from these domains"),
    }),
    execute: async (ctx, input) => {
      counter.webCalls++;
      if (counter.webCalls > maxCalls) {
        return {
          error: true,
          message: `Web search limit reached (${maxCalls}). You MUST now synthesize your final answer using the results you already have. Do NOT attempt more searches.`,
        };
      }

      try {
        const exa = getExaClient();
        const response = await withTimeout(exa.search(input.query, {
          type: input.type ?? "auto",
          numResults: input.numResults ?? 5,
          ...(input.category && { category: input.category }),
          ...(input.startPublishedDate && {
            startPublishedDate: input.startPublishedDate,
          }),
          ...(input.endPublishedDate && {
            endPublishedDate: input.endPublishedDate,
          }),
          ...(input.includeDomains && { includeDomains: input.includeDomains }),
          ...(input.excludeDomains && { excludeDomains: input.excludeDomains }),
          contents: {
            text: { maxCharacters: 3000 },
            highlights: true,
          },
        }), TOOL_TIMEOUT_WEB, "webSearch");

        if (userId) {
          await ctx.runMutation(internal.usage.mutations.trackUsage, {
            userId: userId as Id<"users">,
            source: "exa",
            exaType: "search",
          });
        }

        return {
          results: response.results.map((r) => ({
            url: r.url,
            title: r.title,
            publishedDate: r.publishedDate ?? null,
            author: r.author ?? null,
            text: r.text ?? null,
            highlights: r.highlights ?? [],
          })),
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Web search failed";
        return { error: true, message };
      }
    },
  });
}

export function createWebAnswerTool(counter: WebCallCounter, maxCalls: number, userId?: string) {
  return createTool({
    description:
      "Get a direct, concise answer to a factual question using web sources. Returns an answer with citations. Use this for straightforward factual questions.",
    inputSchema: z.object({
      query: z.string().describe("The question to answer"),
    }),
    execute: async (ctx, input) => {
      counter.webCalls++;
      if (counter.webCalls > maxCalls) {
        return {
          error: true,
          message: `Web search limit reached (${maxCalls}). You MUST now synthesize your final answer using the results you already have. Do NOT attempt more searches.`,
        };
      }

      try {
        const exa = getExaClient();
        const response = await withTimeout(exa.answer(input.query, {
          text: true,
        }), TOOL_TIMEOUT_WEB, "webAnswer");

        if (userId) {
          await ctx.runMutation(internal.usage.mutations.trackUsage, {
            userId: userId as Id<"users">,
            source: "exa",
            exaType: "answer",
          });
        }

        return {
          answer: response.answer,
          citations: response.citations.map((c) => ({
            url: c.url,
            title: c.title,
            publishedDate: c.publishedDate ?? null,
          })),
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to find answer";
        return { error: true, message };
      }
    },
  });
}
