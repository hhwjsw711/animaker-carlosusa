import { v } from "convex/values";
import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { calculateCredits } from "../billing/pricing";
import { consumeCreditsHelper } from "../billing/credits";

const rateLimiter = new RateLimiter(components.rateLimiter, {
  userTokenRate: {
    kind: "token bucket",
    rate: 100_000,
    period: HOUR,
    capacity: 100_000,
  },
});

const EMPTY_USAGE = {
  chatInputTokens: 0,
  chatOutputTokens: 0,
  chatRequests: 0,
  scheduledInputTokens: 0,
  scheduledOutputTokens: 0,
  scheduledRequests: 0,
  extractionInputTokens: 0,
  extractionOutputTokens: 0,
  extractionRequests: 0,
  ragTokens: 0,
  ragInserts: 0,
  ragSearches: 0,
  exaSearches: 0,
  exaAnswers: 0,
  exaContents: 0,
  imageGenerations: 0,
  imageEdits: 0,
  chatCredits: 0,
  scheduledCredits: 0,
  extractionCredits: 0,
  ragCredits: 0,
  exaCredits: 0,
  imageGenerationCredits: 0,
} as const;

export const trackUsage = internalMutation({
  args: {
    userId: v.id("users"),
    source: v.union(
      v.literal("chat"),
      v.literal("scheduled"),
      v.literal("extraction"),
      v.literal("rag"),
      v.literal("exa"),
      v.literal("imageGeneration"),
    ),
    // chat / scheduled / extraction
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    // rag
    ragOperation: v.optional(
      v.union(v.literal("insert"), v.literal("search")),
    ),
    estimatedTokens: v.optional(v.number()),
    // exa
    exaType: v.optional(
      v.union(
        v.literal("search"),
        v.literal("answer"),
        v.literal("content"),
      ),
    ),
    // imageGeneration
    imageType: v.optional(
      v.union(v.literal("generation"), v.literal("edit")),
    ),
  },
  handler: async (ctx, args) => {
    const date = new Date().toISOString().slice(0, 10);
    const existing = await ctx.db
      .query("dailyUsage")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", date),
      )
      .unique();

    // Calcular créditos antes de montar o patch
    const credits = calculateCredits(args.source, {
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      exaType: args.exaType,
      ragOperation: args.ragOperation,
      imageType: args.imageType,
    });

    const patch: Record<string, number> = {};

    // Métricas de tokens/operações por source
    switch (args.source) {
      case "chat":
        patch.chatInputTokens = (existing?.chatInputTokens ?? 0) + (args.inputTokens ?? 0);
        patch.chatOutputTokens = (existing?.chatOutputTokens ?? 0) + (args.outputTokens ?? 0);
        patch.chatRequests = (existing?.chatRequests ?? 0) + 1;
        patch.chatCredits = (existing?.chatCredits ?? 0) + credits;
        break;
      case "scheduled":
        patch.scheduledInputTokens = (existing?.scheduledInputTokens ?? 0) + (args.inputTokens ?? 0);
        patch.scheduledOutputTokens = (existing?.scheduledOutputTokens ?? 0) + (args.outputTokens ?? 0);
        patch.scheduledRequests = (existing?.scheduledRequests ?? 0) + 1;
        patch.scheduledCredits = (existing?.scheduledCredits ?? 0) + credits;
        break;
      case "extraction":
        patch.extractionInputTokens = (existing?.extractionInputTokens ?? 0) + (args.inputTokens ?? 0);
        patch.extractionOutputTokens = (existing?.extractionOutputTokens ?? 0) + (args.outputTokens ?? 0);
        patch.extractionRequests = (existing?.extractionRequests ?? 0) + 1;
        patch.extractionCredits = (existing?.extractionCredits ?? 0) + credits;
        break;
      case "rag": {
        const tokens = args.estimatedTokens ?? 0;
        patch.ragTokens = (existing?.ragTokens ?? 0) + tokens;
        if (args.ragOperation === "insert") {
          patch.ragInserts = (existing?.ragInserts ?? 0) + 1;
        } else if (args.ragOperation === "search") {
          patch.ragSearches = (existing?.ragSearches ?? 0) + 1;
        }
        patch.ragCredits = (existing?.ragCredits ?? 0) + credits;
        break;
      }
      case "exa":
        if (args.exaType === "search") {
          patch.exaSearches = (existing?.exaSearches ?? 0) + 1;
        } else if (args.exaType === "answer") {
          patch.exaAnswers = (existing?.exaAnswers ?? 0) + 1;
        } else if (args.exaType === "content") {
          patch.exaContents = (existing?.exaContents ?? 0) + 1;
        }
        patch.exaCredits = (existing?.exaCredits ?? 0) + credits;
        break;
      case "imageGeneration":
        if (args.imageType === "edit") {
          patch.imageEdits = (existing?.imageEdits ?? 0) + 1;
        } else {
          patch.imageGenerations = (existing?.imageGenerations ?? 0) + 1;
        }
        patch.imageGenerationCredits = (existing?.imageGenerationCredits ?? 0) + credits;
        break;
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("dailyUsage", {
        userId: args.userId,
        date,
        ...EMPTY_USAGE,
        ...patch,
      });
    }

    // Rate limit apenas para tokens de LLM (chat + scheduled)
    if (args.source === "chat" || args.source === "scheduled") {
      const totalTokens = (args.inputTokens ?? 0) + (args.outputTokens ?? 0);
      if (totalTokens > 0) {
        await rateLimiter.limit(ctx, "userTokenRate", {
          key: args.userId,
          count: totalTokens,
          reserve: true,
        });
      }
    }

    await consumeCreditsHelper(ctx, args.userId, credits, args.source);
  },
});
