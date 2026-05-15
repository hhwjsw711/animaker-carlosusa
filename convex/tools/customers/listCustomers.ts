import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createListCustomersTool() {
  return createTool({
    description:
      "List or search the user's customers. Use when the user asks to see their customers, find a customer by name, or look up contact information. Pass a search term to filter by name, email, phone, document, company, or city.",
    inputSchema: z.object({
      search: z
        .string()
        .optional()
        .describe(
          "Optional search term to filter customers by name, email, phone, document, company, or city",
        ),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const customers = input.search
          ? await ctx.runQuery(
              internal.customers.queries.searchCustomersInternal,
              { userId, search: input.search },
            )
          : await ctx.runQuery(
              internal.customers.queries.listCustomersInternal,
              { userId },
            );

        if (customers.length === 0) {
          return {
            found: false,
            message: input.search
              ? "No customers found matching your search."
              : "No customers yet.",
          };
        }

        return {
          found: true,
          count: customers.length,
          customers: customers.map((c: { _id: string; name: string; email?: string; phone?: string; birthDate?: string; color?: string; gender?: string; company?: string; jobTitle?: string; city?: string; state?: string; country?: string }) => ({
            id: c._id as string,
            name: c.name,
            email: c.email ?? null,
            phone: c.phone ?? null,
            birthDate: c.birthDate ?? null,
            color: c.color ?? null,
            gender: c.gender ?? null,
            company: c.company ?? null,
            jobTitle: c.jobTitle ?? null,
            city: c.city ?? null,
            state: c.state ?? null,
            country: c.country ?? null,
          })),
        };
      } catch (err) {
        console.error("List customers failed:", err);
        return { error: true, message: "Failed to list customers." };
      }
    },
  });
}
