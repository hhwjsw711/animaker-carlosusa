"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { rag, type EntryId } from "../rag/setup";
import {
  extractTextFromBuffer,
  extractWithGemini,
  extractTextFromPdf,
  extractTextFromSpreadsheet,
} from "../lib/extract";
import { extractTextFromDocx } from "./extractDocx";
import { assertHasCredits } from "../billing/guards";
import { arrayBufferToBase64 } from "../lib/encoding";
import { getObjectBytes } from "../bunny/client";

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().split("T")[0];
}

export const processFile = internalAction({
  args: {
    fileId: v.id("customerFiles"),
  },
  handler: async (ctx, { fileId }) => {
    const file = await ctx.runQuery(
      internal.customerFiles.queries.getCustomerFile,
      { fileId },
    );
    if (!file) return;

    try {
      await assertHasCredits(ctx, file.userId, 2);

      if (!file.bunnyPath) throw new Error("File has no storage reference");
      const buffer = await getObjectBytes(file.bunnyPath);

      let extractedText: string;
      let extractionMethod: string;
      let pageCount: number | undefined;
      let extractionWarning: string | undefined;

      if (
        file.type === "text/plain" ||
        file.type === "text/markdown" ||
        file.type === "text/csv"
      ) {
        extractedText = extractTextFromBuffer(buffer);
        extractionMethod = "text";
      } else if (file.type === "application/pdf") {
        const pdfResult = await extractTextFromPdf(buffer);
        pageCount = pdfResult.pageCount;

        if (!pdfResult.isScanned && pdfResult.text.length > 0) {
          extractedText = pdfResult.text;
          extractionMethod = "unpdf";
        } else {
          const base64 = arrayBufferToBase64(buffer);
          const geminiResult = await extractWithGemini(
            base64,
            file.type,
            file.category,
          );
          extractedText = geminiResult.text;
          extractionMethod = "gemini";

          await ctx.runMutation(internal.usage.mutations.trackUsage, {
            userId: file.userId,
            source: "extraction",
            inputTokens: geminiResult.usage.inputTokens,
            outputTokens: geminiResult.usage.outputTokens,
          });

          if (geminiResult.truncated) {
            extractionWarning =
              "Content may be incomplete — extraction was truncated due to model output limits. Consider re-uploading as a text-based PDF if possible.";
          }
        }
      } else if (
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel" ||
        file.type === "application/vnd.oasis.opendocument.spreadsheet"
      ) {
        const result = extractTextFromSpreadsheet(buffer);
        extractedText = result.text;
        extractionMethod = "xlsx";
        pageCount = result.sheetCount;
      } else if (
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/msword"
      ) {
        extractedText = extractTextFromDocx(buffer);
        extractionMethod = "docx";
      } else {
        const base64 = arrayBufferToBase64(buffer);

        const geminiResult = await extractWithGemini(
          base64,
          file.type,
          file.category,
        );
        extractedText = geminiResult.text;
        extractionMethod = "gemini";

        await ctx.runMutation(internal.usage.mutations.trackUsage, {
          userId: file.userId,
          source: "extraction",
          inputTokens: geminiResult.usage.inputTokens,
          outputTokens: geminiResult.usage.outputTokens,
        });

        if (geminiResult.truncated) {
          extractionWarning =
            "Content may be incomplete — extraction was truncated due to model output limits.";
        }
      }

      if (!extractedText) {
        throw new Error("No content could be extracted from this file");
      }

      const title = `[${file.name} | ${formatDate(file.createdAt)}]`;

      const { entryId } = await rag.add(ctx, {
        namespace: file.customerId,
        key: `${file.customerId}:${file.name}`,
        title,
        text: extractedText,
      });

      // Track RAG embedding tokens (estimated: ~1 token per 4 chars)
      const estimatedRagTokens = Math.ceil(extractedText.length / 4);
      await ctx.runMutation(internal.usage.mutations.trackUsage, {
        userId: file.userId,
        source: "rag",
        ragOperation: "insert",
        estimatedTokens: estimatedRagTokens,
      });

      await ctx.runMutation(
        internal.customerFiles.mutations.updateFileStatus,
        {
          fileId,
          status: "ready",
          ragEntryId: entryId,
          extractionMethod,
          extractedCharCount: extractedText.length,
          pageCount,
          extractionWarning,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown processing error";

      await ctx.runMutation(
        internal.customerFiles.mutations.updateFileStatus,
        { fileId, status: "failed", error: message },
      );
    }
  },
});

export const reprocessFile = internalAction({
  args: {
    fileId: v.id("customerFiles"),
  },
  handler: async (ctx, { fileId }) => {
    const file = await ctx.runQuery(
      internal.customerFiles.queries.getCustomerFile,
      { fileId },
    );
    if (!file) return;

    if (file.ragEntryId) {
      try {
        await rag.delete(ctx, { entryId: file.ragEntryId as EntryId });
      } catch {
        // Entry may have already been deleted
      }
    }

    await ctx.runMutation(
      internal.customerFiles.mutations.updateFileStatus,
      { fileId, status: "processing" },
    );

    await ctx.scheduler.runAfter(
      0,
      internal.customerFiles.actions.processFile,
      { fileId },
    );
  },
});

export const deleteFileChunks = internalAction({
  args: {
    ragEntryId: v.string(),
  },
  handler: async (ctx, { ragEntryId }) => {
    try {
      await rag.delete(ctx, { entryId: ragEntryId as EntryId });
    } catch {
      // Silently fail — entry may have already been deleted
    }
  },
});
