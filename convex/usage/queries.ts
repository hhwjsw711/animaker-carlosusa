import { v } from "convex/values";
import { query } from "../_generated/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";

export const getMyUsage = query({
  args: {},
  handler: async (ctx) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;

    const today = new Date().toISOString().slice(0, 10);
    const todayUsage = await ctx.db
      .query("dailyUsage")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", ws.effectiveUserId).eq("date", today),
      )
      .unique();

    if (!todayUsage) {
      return {
        date: today,
        chat: { inputTokens: 0, outputTokens: 0, requests: 0, credits: 0 },
        scheduled: { inputTokens: 0, outputTokens: 0, requests: 0, credits: 0 },
        extraction: { inputTokens: 0, outputTokens: 0, requests: 0, credits: 0 },
        rag: { tokens: 0, inserts: 0, searches: 0, credits: 0 },
        exa: { searches: 0, answers: 0, contents: 0, credits: 0 },
        imageGeneration: { generations: 0, edits: 0, credits: 0 },
      };
    }

    return {
      date: todayUsage.date,
      chat: {
        inputTokens: todayUsage.chatInputTokens ?? 0,
        outputTokens: todayUsage.chatOutputTokens ?? 0,
        requests: todayUsage.chatRequests ?? 0,
        credits: todayUsage.chatCredits ?? 0,
      },
      scheduled: {
        inputTokens: todayUsage.scheduledInputTokens ?? 0,
        outputTokens: todayUsage.scheduledOutputTokens ?? 0,
        requests: todayUsage.scheduledRequests ?? 0,
        credits: todayUsage.scheduledCredits ?? 0,
      },
      extraction: {
        inputTokens: todayUsage.extractionInputTokens ?? 0,
        outputTokens: todayUsage.extractionOutputTokens ?? 0,
        requests: todayUsage.extractionRequests ?? 0,
        credits: todayUsage.extractionCredits ?? 0,
      },
      rag: {
        tokens: todayUsage.ragTokens ?? 0,
        inserts: todayUsage.ragInserts ?? 0,
        searches: todayUsage.ragSearches ?? 0,
        credits: todayUsage.ragCredits ?? 0,
      },
      exa: {
        searches: todayUsage.exaSearches ?? 0,
        answers: todayUsage.exaAnswers ?? 0,
        contents: todayUsage.exaContents ?? 0,
        credits: todayUsage.exaCredits ?? 0,
      },
      imageGeneration: {
        generations: todayUsage.imageGenerations ?? 0,
        edits: todayUsage.imageEdits ?? 0,
        credits: todayUsage.imageGenerationCredits ?? 0,
      },
    };
  },
});

export const getUsageHistory = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, { days = 30 }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;

    const clampedDays = Math.min(Math.max(days, 1), 365);
    const since = new Date();
    since.setDate(since.getDate() - clampedDays);
    const sinceDate = since.toISOString().slice(0, 10);

    const rows = await ctx.db
      .query("dailyUsage")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", ws.effectiveUserId).gte("date", sinceDate),
      )
      .take(365);

    return rows.map((r) => ({
      date: r.date,
      chat: {
        inputTokens: r.chatInputTokens ?? 0,
        outputTokens: r.chatOutputTokens ?? 0,
        requests: r.chatRequests ?? 0,
        credits: r.chatCredits ?? 0,
      },
      scheduled: {
        inputTokens: r.scheduledInputTokens ?? 0,
        outputTokens: r.scheduledOutputTokens ?? 0,
        requests: r.scheduledRequests ?? 0,
        credits: r.scheduledCredits ?? 0,
      },
      extraction: {
        inputTokens: r.extractionInputTokens ?? 0,
        outputTokens: r.extractionOutputTokens ?? 0,
        requests: r.extractionRequests ?? 0,
        credits: r.extractionCredits ?? 0,
      },
      rag: {
        tokens: r.ragTokens ?? 0,
        inserts: r.ragInserts ?? 0,
        searches: r.ragSearches ?? 0,
        credits: r.ragCredits ?? 0,
      },
      exa: {
        searches: r.exaSearches ?? 0,
        answers: r.exaAnswers ?? 0,
        contents: r.exaContents ?? 0,
        credits: r.exaCredits ?? 0,
      },
      imageGeneration: {
        generations: r.imageGenerations ?? 0,
        edits: r.imageEdits ?? 0,
        credits: r.imageGenerationCredits ?? 0,
      },
    }));
  },
});

export const getMonthlyUsage = query({
  args: {
    month: v.string(), // "YYYY-MM"
  },
  handler: async (ctx, { month }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;

    const startDate = `${month}-01`;
    // Next month first day as upper bound
    const [year, m] = month.split("-").map(Number);
    const nextMonth = m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, "0")}`;
    const endDate = `${nextMonth}-01`;

    const rows = await ctx.db
      .query("dailyUsage")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", ws.effectiveUserId).gte("date", startDate).lt("date", endDate),
      )
      .take(31);

    const totals = {
      chat: { inputTokens: 0, outputTokens: 0, requests: 0, credits: 0 },
      scheduled: { inputTokens: 0, outputTokens: 0, requests: 0, credits: 0 },
      extraction: { inputTokens: 0, outputTokens: 0, requests: 0, credits: 0 },
      rag: { tokens: 0, inserts: 0, searches: 0, credits: 0 },
      exa: { searches: 0, answers: 0, contents: 0, credits: 0 },
      imageGeneration: { generations: 0, edits: 0, credits: 0 },
    };

    for (const r of rows) {
      totals.chat.inputTokens += r.chatInputTokens ?? 0;
      totals.chat.outputTokens += r.chatOutputTokens ?? 0;
      totals.chat.requests += r.chatRequests ?? 0;
      totals.chat.credits += r.chatCredits ?? 0;
      totals.scheduled.inputTokens += r.scheduledInputTokens ?? 0;
      totals.scheduled.outputTokens += r.scheduledOutputTokens ?? 0;
      totals.scheduled.requests += r.scheduledRequests ?? 0;
      totals.scheduled.credits += r.scheduledCredits ?? 0;
      totals.extraction.inputTokens += r.extractionInputTokens ?? 0;
      totals.extraction.outputTokens += r.extractionOutputTokens ?? 0;
      totals.extraction.requests += r.extractionRequests ?? 0;
      totals.extraction.credits += r.extractionCredits ?? 0;
      totals.rag.tokens += r.ragTokens ?? 0;
      totals.rag.inserts += r.ragInserts ?? 0;
      totals.rag.searches += r.ragSearches ?? 0;
      totals.rag.credits += r.ragCredits ?? 0;
      totals.exa.searches += r.exaSearches ?? 0;
      totals.exa.answers += r.exaAnswers ?? 0;
      totals.exa.contents += r.exaContents ?? 0;
      totals.exa.credits += r.exaCredits ?? 0;
      totals.imageGeneration.generations += r.imageGenerations ?? 0;
      totals.imageGeneration.edits += r.imageEdits ?? 0;
      totals.imageGeneration.credits += r.imageGenerationCredits ?? 0;
    }

    return {
      month,
      days: rows.length,
      ...totals,
    };
  },
});
