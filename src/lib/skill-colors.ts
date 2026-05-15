export const SKILL_CATEGORY_COLORS = {
  communication: "bg-blue-500",
  analysis: "bg-violet-500",
  productivity: "bg-green-500",
  development: "bg-orange-500",
} as const;

export type SkillCategory = keyof typeof SKILL_CATEGORY_COLORS;

export const SKILL_CATEGORY_KEYS = Object.keys(SKILL_CATEGORY_COLORS) as SkillCategory[];

/** Color for the "My Skills" filter (user-created skills, not a schema category) */
export const SKILL_USER_FILTER_COLOR = "bg-amber-500";
