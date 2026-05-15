import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { getExaClient } from "./client";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { withTimeout, TOOL_TIMEOUT_WEB } from "../utils";

interface WebCallCounter {
  webCalls: number;
  contentCalls: number;
}

export function createWebContentsTool(counter: WebCallCounter, maxCalls: number, userId?: string) {
  return createTool({
    description:
      "Fetch and read the full content of one or more web pages by URL. Use this when you need to read the content of specific URLs.",
    inputSchema: z.object({
      urls: z.array(z.string()).describe("URLs to fetch content from"),
      maxCharacters: z
        .number()
        .optional()
        .describe("Maximum characters of text to return per page"),
    }),
    execute: async (ctx, input) => {
      counter.contentCalls++;
      if (counter.contentCalls > maxCalls) {
        return {
          error: true,
          message: `Page read limit reached (${maxCalls}). You MUST now synthesize your final answer using the content you already have. Do NOT attempt to read more pages.`,
        };
      }

      try {
        const exa = getExaClient();
        const response = await withTimeout(exa.getContents(input.urls, {
          text: {
            maxCharacters: input.maxCharacters ?? 5000,
          },
        }), TOOL_TIMEOUT_WEB, "webContents");

        if (userId) {
          await ctx.runMutation(internal.usage.mutations.trackUsage, {
            userId: userId as Id<"users">,
            source: "exa",
            exaType: "content",
          });
        }

        return {
          results: response.results.map((r) => ({
            url: r.url,
            title: r.title,
            author: r.author ?? null,
            text: r.text ?? null,
          })),
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch page contents";
        return { error: true, message };
      }
    },
  });
}
