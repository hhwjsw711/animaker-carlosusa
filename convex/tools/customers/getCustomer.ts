import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createGetCustomerTool(customerId?: string) {
  const isScoped = !!customerId;

  return createTool({
    description: isScoped
      ? "Get the current customer's full details including name, email, phone, date of birth, color tag, gender, document (CPF/SSN), company, job title, address, and social media."
      : "Get detailed information about a specific customer by their ID including all profile fields. Use when the user asks for details about a customer you already identified via listCustomers.",
    inputSchema: isScoped
      ? z.object({})
      : z.object({
          customerId: z.string().describe("The customer ID to look up"),
        }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const targetId = isScoped
          ? (customerId as string)
          : (input as Record<string, unknown>).customerId as string;

        const customer = await ctx.runQuery(
          internal.customers.queries.getCustomerInternal,
          { customerId: targetId as Id<"customers">, userId },
        );

        if (!customer) {
          return { error: true, message: "Customer not found." };
        }

        return {
          found: true,
          customer: {
            id: customer._id as string,
            name: customer.name,
            email: customer.email ?? null,
            phone: customer.phone ?? null,
            birthDate: customer.birthDate ?? null,
            color: customer.color ?? null,
            gender: customer.gender ?? null,
            document: customer.document ?? null,
            documentType: customer.documentType ?? null,
            company: customer.company ?? null,
            jobTitle: customer.jobTitle ?? null,
            address: customer.address ?? null,
            city: customer.city ?? null,
            state: customer.state ?? null,
            zipCode: customer.zipCode ?? null,
            country: customer.country ?? null,
            instagram: customer.instagram ?? null,
            twitter: customer.twitter ?? null,
            linkedin: customer.linkedin ?? null,
            facebook: customer.facebook ?? null,
            tiktok: customer.tiktok ?? null,
            youtube: customer.youtube ?? null,
          },
        };
      } catch (err) {
        console.error("Get customer failed:", err);
        return { error: true, message: "Failed to get customer details." };
      }
    },
  });
}
