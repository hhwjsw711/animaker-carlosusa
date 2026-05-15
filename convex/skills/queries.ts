import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";

export const listSkills = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, { category }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];

    const systemSkills = await ctx.db
      .query("skills")
      .withIndex("by_type", (q) => q.eq("type", "system"))
      .take(200);

    const userSkills = await ctx.db
      .query("skills")
      .withIndex("by_userId", (q) => q.eq("userId", ws.effectiveUserId))
      .take(200);

    const allSkills = [...systemSkills, ...userSkills];

    const userSkillStates = await ctx.db
      .query("userSkills")
      .withIndex("by_userId", (q) => q.eq("userId", ws.effectiveUserId))
      .take(200);

    const enabledMap = new Map(
      userSkillStates.map((us) => [us.skillId, us.enabled]),
    );

    const skills = allSkills.map((skill) => ({
      ...skill,
      enabled: enabledMap.get(skill._id) ?? false,
    }));

    if (category) {
      return skills.filter((s) => s.category === category);
    }

    return skills;
  },
});

export const listEnabledSkills = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const userSkillStates = await ctx.db
      .query("userSkills")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(200);

    const enabledIds = userSkillStates
      .filter((us) => us.enabled)
      .map((us) => us.skillId);

    const skills = await Promise.all(
      enabledIds.map((id) => ctx.db.get(id)),
    );

    return skills
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
      .map((s) => ({
        name: s.name,
        description: s.description,
        instructions: s.instructions,
      }));
  },
});
