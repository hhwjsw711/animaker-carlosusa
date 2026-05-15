import { v } from "convex/values";
import type { ActionCtx } from "../_generated/server";
import { action } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getAgent, MAX_STEPS } from "./agent";
import { DEFAULT_MODEL, FALLBACK_MODELS, getProviderOptions, getSamplingParams } from "./models";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ModelMessage } from "ai";
import {
  extractTextFromBuffer,
  extractWithGemini,
  extractTextFromPdf,
  extractTextFromSpreadsheet,
} from "../lib/extract";
import { extractTextFromDocx } from "../customerFiles/extractDocx";
import { assertHasCredits } from "../billing/guards";
import {
  ACCEPTED_TYPES as BACKEND_ACCEPTED_TYPES,
  SIZE_LIMITS as BACKEND_SIZE_LIMITS,
} from "../lib/fileConstants";
import { arrayBufferToBase64 } from "../lib/encoding";
import { publicUrl as bunnyPublicUrl } from "../bunny/url";

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  const cause = (err as Error & { cause?: { code?: string } }).cause;
  const causeCode = (cause?.code ?? "").toLowerCase();
  return (
    msg.includes("terminated") ||
    causeCode === "econnreset" ||
    causeCode === "etimedout" ||
    causeCode === "econnrefused"
  );
}

interface Attachment {
  storageId?: string;
  bunnyPath?: string;
  name: string;
  type: string;
  size: number;
  category: string;
}

interface ExtractionUsage {
  inputTokens: number;
  outputTokens: number;
  requests: number;
}

interface BuildContentResult {
  content: string | ModelMessage[];
  extractionUsage: ExtractionUsage;
}

const MAX_EXTRACTED_CHARS = 8_000;
const MAX_ATTACHMENTS = 5;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;

async function buildContentParts(
  ctx: ActionCtx,
  text: string,
  attachments?: Attachment[],
): Promise<BuildContentResult> {
  const extractionUsage: ExtractionUsage = { inputTokens: 0, outputTokens: 0, requests: 0 };

  if (!attachments || attachments.length === 0) {
    return { content: text, extractionUsage };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [];

  if (text) {
    parts.push({ type: "text" as const, text });
  }

  // Process all attachments in parallel — each is independent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processAttachment = async (att: Attachment): Promise<{ parts: any[]; usage: ExtractionUsage }> => {
    const localParts: any[] = [];
    const localUsage: ExtractionUsage = { inputTokens: 0, outputTokens: 0, requests: 0 };

    const url = att.bunnyPath
      ? bunnyPublicUrl(att.bunnyPath)
      : att.storageId
        ? await ctx.storage.getUrl(att.storageId as Id<"_storage">)
        : null;
    if (!url) return { parts: localParts, usage: localUsage };

    if (att.category === "image") {
      localParts.push({ type: "image" as const, image: new URL(url) });
      localParts.push({ type: "text" as const, text: `[Image URL: ${url}]` });
    } else if (att.category === "audio") {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      localParts.push({ type: "file" as const, data: base64, mediaType: att.type });
    } else {
      // Document: extract text
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      let extractedText: string;

      if (
        att.type === "text/plain" ||
        att.type === "text/markdown" ||
        att.type === "text/csv"
      ) {
        extractedText = extractTextFromBuffer(buffer);
      } else if (att.type === "application/pdf") {
        const pdfResult = await extractTextFromPdf(buffer);
        if (!pdfResult.isScanned && pdfResult.text.length > 0) {
          extractedText = pdfResult.text;
        } else {
          const base64 = arrayBufferToBase64(buffer);
          const geminiResult = await extractWithGemini(base64, att.type, att.category);
          extractedText = geminiResult.text;
          localUsage.inputTokens += geminiResult.usage.inputTokens;
          localUsage.outputTokens += geminiResult.usage.outputTokens;
          localUsage.requests++;
        }
      } else if (
        att.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        att.type === "application/vnd.ms-excel" ||
        att.type === "application/vnd.oasis.opendocument.spreadsheet"
      ) {
        const result = extractTextFromSpreadsheet(buffer);
        extractedText = result.text;
      } else if (
        att.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        att.type === "application/msword"
      ) {
        extractedText = extractTextFromDocx(buffer);
      } else {
        const base64 = arrayBufferToBase64(buffer);
        const geminiResult = await extractWithGemini(base64, att.type, att.category);
        extractedText = geminiResult.text;
        localUsage.inputTokens += geminiResult.usage.inputTokens;
        localUsage.outputTokens += geminiResult.usage.outputTokens;
        localUsage.requests++;
      }

      if (extractedText) {
        const truncated = extractedText.slice(0, MAX_EXTRACTED_CHARS);
        const suffix = extractedText.length > MAX_EXTRACTED_CHARS
          ? "\n\n[Content truncated due to size limits]"
          : "";
        localParts.push({
          type: "text" as const,
          text: `[Attached file: ${att.name}]\n${truncated}${suffix}`,
        });
      }
    }

    return { parts: localParts, usage: localUsage };
  };

  const results = await Promise.all(attachments.map(processAttachment));
  for (const r of results) {
    parts.push(...r.parts);
    extractionUsage.inputTokens += r.usage.inputTokens;
    extractionUsage.outputTokens += r.usage.outputTokens;
    extractionUsage.requests += r.usage.requests;
  }

  if (parts.length === 0) {
    return { content: text, extractionUsage };
  }

  return {
    content: [{ role: "user" as const, content: parts }],
    extractionUsage,
  };
}

export const sendMessage = action({
  args: {
    threadId: v.id("threads"),
    prompt: v.string(),
    userDate: v.optional(v.string()),
    attachments: v.optional(v.array(v.object({
      storageId: v.optional(v.id("_storage")),
      bunnyPath: v.optional(v.string()),
      name: v.string(),
      type: v.string(),
      size: v.number(),
      category: v.string(),
    }))),
  },
  handler: async (ctx, { threadId, prompt, userDate, attachments }): Promise<void> => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");

    const ws = await ctx.runQuery(internal.workspace.queries.resolveForAction, {
      authenticatedUserId: authUserId,
    });
    const userId = ws.effectiveUserId as Id<"users">;

    await assertHasCredits(ctx, userId, 10);
    await ctx.runMutation(internal.rateLimit.mutations.checkMessageRateLimit, {
      userId,
    });

    const userThread = await ctx.runQuery(internal.chat.queries.getThread, {
      threadId,
    });
    if (!userThread || userThread.userId !== userId) {
      throw new Error("Thread not found");
    }

    await ctx.runMutation(internal.chat.mutations.clearCancelledAt, { threadId });

    const trimmedPrompt = prompt.slice(0, 10_000);

    // Validate attachments
    if (attachments && attachments.length > MAX_ATTACHMENTS) {
      throw new Error("Too many attachments");
    }
    if (attachments) {
      const totalSize = attachments.reduce((sum, a) => sum + a.size, 0);
      if (totalSize > MAX_TOTAL_SIZE) {
        throw new Error("Attachments too large");
      }
      for (const att of attachments) {
        const expectedCategory = BACKEND_ACCEPTED_TYPES[att.type];
        if (!expectedCategory) {
          throw new Error(`Unsupported file type: ${att.type}`);
        }
        if (att.category !== expectedCategory) {
          throw new Error(`Invalid category for type ${att.type}`);
        }
        const limit = BACKEND_SIZE_LIMITS[att.category];
        if (limit && att.size > limit) {
          throw new Error(`File ${att.name} exceeds size limit`);
        }
      }
    }

    // Move Bunny-backed attachments from pendingUploads to chatAttachments.
    const bunnyAttachments = attachments?.filter(
      (a): a is { bunnyPath: string; size: number } => typeof a.bunnyPath === "string",
    );
    if (bunnyAttachments && bunnyAttachments.length > 0) {
      await ctx.runMutation(internal.chatAttachments.mutations.registerAttachments, {
        userId,
        threadId,
        files: bunnyAttachments.map((a) => ({
          bunnyPath: a.bunnyPath,
          size: a.size,
        })),
      });
    }

    const { content: promptArg, extractionUsage } = await buildContentParts(ctx, trimmedPrompt, attachments);

    // Track extraction tokens from chat attachments
    if (extractionUsage.requests > 0) {
      await ctx.runMutation(internal.usage.mutations.trackUsage, {
        userId,
        source: "extraction",
        inputTokens: extractionUsage.inputTokens,
        outputTokens: extractionUsage.outputTokens,
      });
    }

    const enabledSkills = await ctx.runQuery(internal.skills.queries.listEnabledSkills, { userId });
    const customerId = userThread.customerId ?? undefined;

    // Build model chain: primary (2 retries) + fallbacks (1 each)
    const modelChain = [DEFAULT_MODEL, ...FALLBACK_MODELS];
    const TIMEOUT_MS = 180_000;

    await ctx.runMutation(internal.chat.mutations.setStreamingAt, { threadId });

    let lastError: unknown;
    let userCancelled = false;
    try {
      for (let modelIdx = 0; modelIdx < modelChain.length; modelIdx++) {
        const currentModel = modelChain[modelIdx];
        const maxAttempts = modelIdx === 0 ? 2 : 1; // Primary: 2 retries, fallbacks: 1

        const agent = getAgent(customerId, userDate, enabledSkills, undefined, "chat", userId, currentModel, threadId);
        let thread;

        if (userThread.agentThreadId) {
          const continued = await agent.continueThread(ctx, {
            threadId: userThread.agentThreadId,
            userId,
          });
          thread = continued.thread;
        } else {
          const created = await agent.createThread(ctx, { userId });
          thread = created.thread;

          await ctx.runMutation(internal.chat.mutations.setAgentThreadId, {
            threadId,
            agentThreadId: created.threadId,
          });
          // Store agentThreadId so fallback models can continue the same thread
          userThread.agentThreadId = created.threadId;
        }

        const freshStatus = await ctx.runQuery(internal.chat.queries.getThreadStatusInternal, { threadId });
        if (freshStatus?.cancelledAt) {
          await ctx.runMutation(internal.chat.mutations.clearCancelledAt, { threadId });
          return;
        }

        const providerOptions = getProviderOptions(currentModel);
        const samplingParams = getSamplingParams(currentModel);

        let succeeded = false;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort("timeout"), TIMEOUT_MS);
          try {
            const result = await thread.streamText(
              {
                prompt: promptArg,
                ...(providerOptions ? { providerOptions } : {}),
                ...(samplingParams ?? {}),
                abortSignal: controller.signal,
                prepareStep: ({ stepNumber, steps }) => {
                  const totalToolCalls = steps.reduce(
                    (sum, s) => sum + s.toolCalls.length,
                    0,
                  );

                  if (stepNumber >= MAX_STEPS - 2 || totalToolCalls >= 10) {
                    return { toolChoice: "none" as const };
                  }
                  return undefined;
                },
              },
              { saveStreamDeltas: true },
            );
            await result.text;
            succeeded = true;
            lastError = null;
            break;
          } catch (err) {
            lastError = err;
            console.error(`Stream error (model=${currentModel}, attempt ${attempt + 1}):`, err);

            const currentStatus = await ctx.runQuery(internal.chat.queries.getThreadStatusInternal, { threadId });
            if (currentStatus?.cancelledAt) {
              userCancelled = true;
              lastError = null;
              break;
            }

            if (attempt < maxAttempts - 1 && (controller.signal.aborted || isRetryableError(err))) {
              await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 10_000)));
              continue;
            }
            break;
          } finally {
            clearTimeout(timeoutId);
          }
        }

        if (succeeded || userCancelled) break;

        // Log fallback attempt
        if (modelIdx < modelChain.length - 1) {
          console.warn(`Model ${currentModel} failed, falling back to ${modelChain[modelIdx + 1]}`);
        }
      }

      if (userCancelled) {
        await ctx.runMutation(internal.chat.mutations.clearCancelledAt, { threadId });
        return;
      }

      if (lastError) {
        throw new Error("GENERATION_FAILED");
      }
    } finally {
      await ctx.runMutation(internal.chat.mutations.clearStreamingAt, { threadId });
    }
  },
});
