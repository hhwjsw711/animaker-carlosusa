import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { resolveWorkspaceUserId, assertNotStaff } from "../lib/workspace";

// Keep in sync with src/components/skills/skill-dialog.tsx
const INSTRUCTIONS_MAX_LENGTH = 5000;

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const toggleSkill = mutation({
  args: { skillId: v.id("skills") },
  handler: async (ctx, { skillId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const skill = await ctx.db.get(skillId);
    if (!skill) throw new Error("Skill not found");
    if (skill.type === "user" && skill.userId !== effectiveUserId) {
      throw new Error("Skill not found");
    }

    const existing = await ctx.db
      .query("userSkills")
      .withIndex("by_userId_and_skillId", (q) =>
        q.eq("userId", effectiveUserId).eq("skillId", skillId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { enabled: !existing.enabled });
    } else {
      await ctx.db.insert("userSkills", {
        userId: effectiveUserId,
        skillId,
        enabled: true,
      });
    }
  },
});

export const createSkill = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    instructions: v.string(),
    icon: v.string(),
    category: v.string(),
  },
  handler: async (ctx, { name, description, instructions, icon, category }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const trimmedName = name.trim();
    if (!trimmedName) throw new Error("Name is required");
    if (!description.trim()) throw new Error("Description is required");
    if (!instructions.trim()) throw new Error("Instructions are required");
    if (instructions.length > INSTRUCTIONS_MAX_LENGTH) throw new Error("Instructions too long");

    const slug = toSlug(trimmedName);

    const existing = await ctx.db
      .query("skills")
      .withIndex("by_slug_and_userId", (q) =>
        q.eq("slug", slug).eq("userId", effectiveUserId),
      )
      .first();

    if (existing) throw new Error("A skill with this name already exists");

    const skillId = await ctx.db.insert("skills", {
      userId: effectiveUserId,
      type: "user",
      slug,
      name: trimmedName,
      description: description.trim(),
      instructions: instructions.trim(),
      icon: icon || "Sparkles",
      category,
      createdAt: Date.now(),
    });

    await ctx.db.insert("userSkills", {
      userId: effectiveUserId,
      skillId,
      enabled: true,
    });

    return skillId;
  },
});

export const updateSkill = mutation({
  args: {
    skillId: v.id("skills"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    instructions: v.optional(v.string()),
    icon: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { skillId, ...fields }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const skill = await ctx.db.get(skillId);
    if (!skill || skill.type !== "user" || skill.userId !== effectiveUserId) {
      throw new Error("Skill not found");
    }

    const patch: Record<string, string> = {};

    if (fields.name !== undefined) {
      const trimmed = fields.name.trim();
      if (!trimmed) throw new Error("Name is required");
      const newSlug = toSlug(trimmed);
      if (newSlug !== skill.slug) {
        const existing = await ctx.db
          .query("skills")
          .withIndex("by_slug_and_userId", (q) =>
            q.eq("slug", newSlug).eq("userId", effectiveUserId),
          )
          .first();
        if (existing && existing._id !== skillId) {
          throw new Error("A skill with this name already exists");
        }
      }
      patch.name = trimmed;
      patch.slug = newSlug;
    }
    if (fields.description !== undefined) {
      const trimmed = fields.description.trim();
      if (!trimmed) throw new Error("Description is required");
      patch.description = trimmed;
    }
    if (fields.instructions !== undefined) {
      const trimmed = fields.instructions.trim();
      if (!trimmed) throw new Error("Instructions are required");
      if (trimmed.length > INSTRUCTIONS_MAX_LENGTH) throw new Error("Instructions too long");
      patch.instructions = trimmed;
    }
    if (fields.icon !== undefined) patch.icon = fields.icon;
    if (fields.category !== undefined) patch.category = fields.category;

    await ctx.db.patch(skillId, patch);
  },
});

export const deleteSkill = mutation({
  args: { skillId: v.id("skills") },
  handler: async (ctx, { skillId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const skill = await ctx.db.get(skillId);
    if (!skill || skill.type !== "user" || skill.userId !== effectiveUserId) {
      throw new Error("Skill not found");
    }

    const userSkillEntries = await ctx.db
      .query("userSkills")
      .withIndex("by_userId_and_skillId", (q) =>
        q.eq("userId", effectiveUserId).eq("skillId", skillId),
      )
      .take(10);

    for (const entry of userSkillEntries) {
      await ctx.db.delete(entry._id);
    }

    await ctx.db.delete(skillId);
  },
});

export const seedSystemSkills = internalMutation({
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("skills")
      .withIndex("by_type", (q) => q.eq("type", "system"))
      .take(50);

    const systemSkills = [
      {
        slug: "email-drafting",
        name: "Email Drafting",
        description: "Draft professional emails with proper formatting, tone adjustment, and multilingual support.",
        icon: "Mail",
        category: "communication",
        order: 0,
        instructions: `When the user asks you to draft, write, or compose an email:

1. **Ask for context** if not provided: recipient, purpose, desired tone (formal/casual/friendly).
2. **Structure the email** with:
   - Clear subject line suggestion
   - Appropriate greeting
   - Concise body paragraphs
   - Professional sign-off
3. **Adjust formality** based on context: business emails should be formal, internal team emails can be casual.
4. **Match the language** the user writes in.
5. **Offer variations** if the user seems unsure about tone.
6. If the user provides bullet points, expand them into well-written paragraphs.`,
      },
      {
        slug: "customer-analysis",
        name: "Customer Analysis",
        description: "Analyze customer data from uploaded files and provide actionable insights and summaries.",
        icon: "UserSearch",
        category: "analysis",
        order: 1,
        instructions: `You are in Customer Analysis mode. For ANY question about a customer — including simple requests like "tell me about this customer" — you MUST gather comprehensive data before responding. A single getCustomer call is NOT sufficient when this skill is active.

1. **Always gather data from all available sources**:
   - Call getCustomer for the full profile
   - Call listNotes to check for notes and history
   - Call listCustomerFiles to see uploaded documents
   - If files exist, call searchCustomerFiles with relevant queries to extract key information
2. **Structure your response** in these sections:
   - **Profile Overview**: Key contact info, company, role — as a concise narrative summary, NOT a raw field dump
   - **Notes & History**: Summary of notes and interactions (if any exist)
   - **Documents**: Summary of uploaded files and key findings (if any exist)
   - **Observations**: Patterns, insights, or actionable recommendations based on ALL data gathered
   - **Missing Information**: What data is absent and would be valuable to add
3. Present data as a narrative analysis, not a list of raw fields.
4. Use tables only for comparative data when appropriate.
5. Never invent data — only report what is found in the tools.`,
      },
      {
        slug: "meeting-notes",
        name: "Meeting Notes",
        description: "Structure meeting notes with attendees, decisions, action items, and deadlines.",
        icon: "NotebookPen",
        category: "productivity",
        order: 2,
        instructions: `When the user provides meeting notes, transcripts, or asks to organize meeting content:

1. **Structure the output** as:
   - **Date & Attendees**
   - **Agenda / Topics Discussed**
   - **Key Decisions** (numbered)
   - **Action Items** (with owner and deadline if mentioned)
   - **Next Steps**
2. **Extract action items** even if they are buried in conversation.
3. **Keep language concise** — meeting notes should be scannable, not verbose.
4. If the input is a raw transcript, distill it into the structured format above.
5. Ask for clarification on ambiguous owners or deadlines.`,
      },
      {
        slug: "report-generation",
        name: "Report Generation",
        description: "Generate structured business reports with executive summaries, findings, and recommendations.",
        icon: "FileText",
        category: "productivity",
        order: 3,
        instructions: `When the user asks to generate a report:

1. **Structure the report** as:
   - **Executive Summary** (2-3 sentences)
   - **Context / Background**
   - **Findings** (bulleted or numbered)
   - **Data** (use markdown tables when possible)
   - **Recommendations** (actionable, prioritized)
   - **Conclusion**
2. **Adapt the depth** to the request — a quick summary vs. a detailed report.
3. **Use data from customer files** when available and relevant.
4. **Format for readability**: headers, bullet points, bold key terms.
5. Always state assumptions and data sources.`,
      },
      {
        slug: "translation-assistant",
        name: "Translation Assistant",
        description: "Translate text between languages while preserving tone, context, and formatting.",
        icon: "Languages",
        category: "communication",
        order: 4,
        instructions: `When the user asks for a translation:

1. **Translate accurately** while preserving the original tone and intent.
2. **Maintain formatting**: if the original has bullet points, headers, or emphasis, keep them.
3. **Handle technical terms** carefully — use the accepted term in the target language, or keep the English term with a translation in parentheses if no standard translation exists.
4. **Note cultural nuances** when they affect meaning (e.g., formality levels in Japanese, tu/vous in French).
5. If the source language is ambiguous, ask the user to confirm.
6. For long texts, translate section by section to maintain coherence.
7. **Do not add** explanations unless the user asks for them — just provide the translation.`,
      },
      {
        slug: "summarization",
        name: "Summarization",
        description: "Summarize long documents, conversations, or articles with adjustable detail level.",
        icon: "ListCollapse",
        category: "analysis",
        order: 5,
        instructions: `When the user asks for a summary:

1. **Determine the format**: bullet points (default) or narrative paragraphs.
2. **Prioritize**: key decisions, critical data, main arguments, conclusions.
3. **Adjust length** based on the user's request:
   - "Quick summary" → 3-5 bullet points
   - "Summary" → 1-2 paragraphs
   - "Detailed summary" → comprehensive with sections
4. **Preserve critical details**: names, dates, numbers, deadlines.
5. **Omit filler**: pleasantries, repetition, tangential points.
6. For customer files, use the search tool first to extract content, then summarize.
7. If the content is very long, offer to summarize in sections.`,
      },
      {
        slug: "code-assistant",
        name: "Code Assistant",
        description: "Help write, debug, explain, and review code across multiple languages.",
        icon: "Code",
        category: "development",
        order: 6,
        instructions: `When the user asks for coding help:

1. **Write clean, readable code** with meaningful variable names.
2. **Include brief comments** only for non-obvious logic.
3. **Follow language conventions**: PEP 8 for Python, ESLint standards for JS/TS, etc.
4. **When debugging**:
   - Read the error message carefully
   - Identify the root cause before suggesting fixes
   - Explain what went wrong and why the fix works
5. **When explaining code**: walk through the logic step-by-step, highlighting the key concepts.
6. **When reviewing code**: check for bugs, security issues, performance problems, and readability.
7. Always specify the language in code blocks for syntax highlighting.
8. Offer alternatives when there are multiple valid approaches.`,
      },
      {
        slug: "contract-review",
        name: "Contract Review",
        description: "Review contracts and highlight key terms, obligations, risks, and important dates.",
        icon: "FileSearch",
        category: "analysis",
        order: 7,
        instructions: `When the user asks to review a contract or legal document:

1. **Search customer files** first if a contract is mentioned.
2. **Identify and highlight**:
   - **Parties** involved
   - **Key obligations** for each party
   - **Important dates**: start, end, renewal, notice periods
   - **Financial terms**: payment amounts, schedules, penalties
   - **Termination clauses**: conditions, notice period, penalties
   - **Liability and indemnification** clauses
   - **Renewal terms**: automatic renewal, opt-out windows
3. **Flag risks**: ambiguous language, one-sided clauses, missing standard protections.
4. **Present findings** in a structured summary table or list.
5. **Disclaimer**: Always note that this is not legal advice and recommend professional legal review for critical decisions.`,
      },
    ];

    const existingBySlug = new Map(existing.map((s) => [s.slug, s]));

    for (const skill of systemSkills) {
      const current = existingBySlug.get(skill.slug);
      if (current) {
        if (
          current.instructions !== skill.instructions ||
          current.description !== skill.description ||
          current.name !== skill.name
        ) {
          await ctx.db.patch(current._id, {
            instructions: skill.instructions,
            description: skill.description,
            name: skill.name,
          });
        }
      } else {
        await ctx.db.insert("skills", {
          ...skill,
          type: "system",
          createdAt: Date.now(),
        });
      }
    }
  },
});
