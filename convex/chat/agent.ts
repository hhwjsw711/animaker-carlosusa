import { Agent } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { components, internal } from "../_generated/api";
import { resolveModelId, DEFAULT_MODEL } from "./models";
import type { Id } from "../_generated/dataModel";
import { buildTools, type ToolExecutionContext } from "../tools";

export const MAX_STEPS = 16;
const MAX_SKILLS_CHARS = 20_000;

interface EnabledSkill {
  name: string;
  description: string;
  instructions: string;
}

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

function buildInstructions(
  customerId?: string,
  userDate?: string,
  enabledSkills?: EnabledSkill[],
  execCtx?: ToolExecutionContext,
) {
  const dateLine = userDate
    ? `\nThe user's current date and time is: ${userDate}. Consider this when answering questions about "today", "this week", current events, recent news, etc.\n`
    : "";

  const destructiveRule = execCtx?.mode === "scheduled"
    ? "You are running as an AUTOMATED SCHEDULED TASK — there is no user present. Proceed with all operations directly without waiting for approval."
    : "For destructive operations (delete, remove): ALWAYS confirm with the user first — explain what will be affected and ask for explicit approval before proceeding.";

  const messagingRule = execCtx?.mode === "scheduled"
    ? "For messaging (email, WhatsApp): send directly without waiting for approval. If contact info is missing, skip and note it."
    : "For messaging (email, WhatsApp): ALWAYS show the full message draft and wait for explicit user approval BEFORE sending. NEVER send without confirmation.";

  const attachmentRule = customerId
    ? `\n- When a message contains attachments (marked "[Attached file: ...]"), their content is ALREADY in the message. Analyze directly — do NOT call file tools to find them. File tools are ONLY for previously uploaded files.`
    : "";

  return `You are Vertex, a helpful AI assistant. Respond concisely and accurately. You can answer in any language the user writes in. You NEVER use emojis in your responses — no emoji characters whatsoever — unless the user explicitly asks you to use them.
${dateLine}${buildSkillsSection(enabledSkills)}
Rules:
- NEVER fabricate information, IDs, URLs, or citations. Use tools to get real data.
- ALWAYS provide a final text answer after using tools. NEVER end your response on a tool call.
- NEVER output raw XML or text-based tool calls. Always use the structured function calling API.
- When the user asks about their data (customers, files, notes, billing), check the relevant tools FIRST before web searching.
- Be efficient: max 5 tool calls per response, max 3 web searches per question. After max searches, synthesize from what you have.
- Cite sources when using web tools.
- ABSOLUTELY NO EMOJIS. No emoji characters, emoticons, or unicode symbols used as emojis. The ONLY exception is if the user explicitly requests emojis.
- Maintain a professional tone. Use clear, natural language.
- ${destructiveRule}
- ${messagingRule}${attachmentRule}
- After generating/editing an image, briefly describe what you created in text. Do NOT include image URLs or markdown image tags — the image is already displayed by the tool UI.`;
}

function buildSkillsSection(enabledSkills?: EnabledSkill[]): string {
  if (!enabledSkills || enabledSkills.length === 0) return "";

  let totalChars = 0;
  const included: EnabledSkill[] = [];
  for (const skill of enabledSkills) {
    totalChars += skill.instructions.length;
    if (totalChars > MAX_SKILLS_CHARS) break;
    included.push(skill);
  }

  if (included.length === 0) return "";

  const sections = included
    .map((s) => `### ${s.name}\n${s.instructions}`)
    .join("\n\n");

  return `\n\n## Active Behavioral Mode\nThe following skills are ENABLED and take PRIORITY over your default behavior. Apply these instructions proactively — do not wait for an exact keyword match. If the user's message relates to a skill's domain, follow its instructions.\n\n${sections}`;
}

type UsageSource = "chat" | "scheduled";

export function getAgent(
  customerId?: string,
  userDate?: string,
  enabledSkills?: EnabledSkill[],
  execCtx?: ToolExecutionContext,
  source: UsageSource = "chat",
  userId?: string,
  modelOverride?: string,
  threadId?: string,
) {
  const modelId = modelOverride ?? DEFAULT_MODEL;
  const instructions = buildInstructions(customerId, userDate, enabledSkills, execCtx);
  const tools = buildTools(customerId, execCtx, userId, threadId);

  return new Agent(components.agent, {
    name: `vertex-${modelId}`,
    languageModel: openrouter.chat(resolveModelId(modelId), {
      parallelToolCalls: true,
    }),
    instructions,
    tools,
    maxSteps: MAX_STEPS,
    usageHandler: async (ctx, { userId, usage }) => {
      const inputTokens = usage.inputTokens ?? 0;
      const outputTokens = usage.outputTokens ?? 0;
      const totalTokens = inputTokens + outputTokens;
      if (totalTokens === 0 || !userId) return;

      await ctx.runMutation(internal.usage.mutations.trackUsage, {
        userId: userId as Id<"users">,
        source,
        inputTokens,
        outputTokens,
      });
    },
  });
}
