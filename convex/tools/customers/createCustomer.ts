import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { validateBirthDate } from "./validation";

export function createCreateCustomerTool() {
  return createTool({
    description:
      "Create a new customer with a name and optional contact details, document, social media, professional info, and address. Use when the user asks to add, register, or create a new customer or contact.",
    inputSchema: z.object({
      name: z.string().min(1).max(255).describe("Customer's full name"),
      email: z
        .string()
        .email()
        .optional()
        .describe("Customer's email address"),
      phone: z
        .string()
        .regex(/^\d+$/)
        .min(10)
        .max(15)
        .optional()
        .describe(
          "Phone number, digits only, with country code (e.g. 5511999887766)",
        ),
      birthDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Date of birth in YYYY-MM-DD format"),
      gender: z
        .enum(["male", "female", "nonBinary", "other", "preferNotToSay"])
        .optional()
        .describe("Customer's gender"),
      document: z
        .string()
        .optional()
        .describe("Document number (CPF or SSN), digits only"),
      documentType: z
        .enum(["cpf", "ssn"])
        .optional()
        .describe("Document type: cpf (Brazil) or ssn (USA)"),
      company: z.string().optional().describe("Company or organization name"),
      jobTitle: z.string().optional().describe("Job title or role"),
      address: z.string().optional().describe("Street address"),
      city: z.string().optional().describe("City"),
      state: z.string().optional().describe("State or province"),
      zipCode: z.string().optional().describe("ZIP or postal code"),
      country: z.string().optional().describe("Country"),
      instagram: z.string().optional().describe("Instagram username (without @)"),
      twitter: z.string().optional().describe("X/Twitter username (without @)"),
      linkedin: z.string().optional().describe("LinkedIn profile slug"),
      facebook: z.string().optional().describe("Facebook username"),
      tiktok: z.string().optional().describe("TikTok username (without @)"),
      youtube: z.string().optional().describe("YouTube channel handle"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const phone = input.phone
          ? input.phone.replace(/\D/g, "")
          : undefined;

        if (input.birthDate) {
          const birthDateError = validateBirthDate(input.birthDate);
          if (birthDateError) {
            return { error: true, message: `Invalid birth date: ${birthDateError}` };
          }
        }

        if (input.document && input.documentType) {
          const digits = input.document.replace(/\D/g, "");
          if (input.documentType === "cpf" && digits.length !== 11) {
            return { error: true, message: "CPF must have exactly 11 digits" };
          }
          if (input.documentType === "ssn" && digits.length !== 9) {
            return { error: true, message: "SSN must have exactly 9 digits" };
          }
        }

        const sanitize = (v?: string) => v?.replace(/^@/, "").trim() || undefined;

        const args: Record<string, unknown> = {
          userId,
          name: input.name,
        };
        if (input.email) args.email = input.email;
        if (phone) args.phone = phone;
        if (input.birthDate) args.birthDate = input.birthDate;
        if (input.gender) args.gender = input.gender;
        if (input.document) args.document = input.document.replace(/\D/g, "");
        if (input.documentType) args.documentType = input.documentType;
        if (input.company) args.company = input.company;
        if (input.jobTitle) args.jobTitle = input.jobTitle;
        if (input.address) args.address = input.address;
        if (input.city) args.city = input.city;
        if (input.state) args.state = input.state;
        if (input.zipCode) args.zipCode = input.zipCode;
        if (input.country) args.country = input.country;
        if (sanitize(input.instagram)) args.instagram = sanitize(input.instagram);
        if (sanitize(input.twitter)) args.twitter = sanitize(input.twitter);
        if (input.linkedin?.trim()) args.linkedin = input.linkedin.trim();
        if (input.facebook?.trim()) args.facebook = input.facebook.trim();
        if (sanitize(input.tiktok)) args.tiktok = sanitize(input.tiktok);
        if (input.youtube?.trim()) args.youtube = input.youtube.trim();

        const customerId = await ctx.runMutation(
          internal.customers.mutations.createCustomerInternal,
          args as {
            userId: Id<"users">;
            name: string;
            email?: string;
            phone?: string;
            birthDate?: string;
          },
        );

        return {
          success: true,
          customerId: customerId as string,
          name: input.name.trim(),
        };
      } catch (err) {
        console.error("Create customer failed:", err);
        const message =
          err instanceof Error ? err.message : "Failed to create customer";
        return { error: true, message };
      }
    },
  });
}
