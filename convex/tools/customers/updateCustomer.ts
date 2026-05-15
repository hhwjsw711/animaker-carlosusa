import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { validateBirthDate } from "./validation";

const VALID_COLORS = [
  "red",
  "orange",
  "amber",
  "green",
  "blue",
  "violet",
  "pink",
  "gray",
] as const;

const fieldSchemas = {
  name: z.string().min(1).max(255).optional().describe("New name for the customer"),
  email: z
    .string()
    .email()
    .optional()
    .describe("New email address"),
  phone: z
    .string()
    .regex(/^\d+$/)
    .min(10)
    .max(15)
    .optional()
    .describe(
      "New phone number, digits only, with country code (e.g. 5511999887766)",
    ),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("New date of birth in YYYY-MM-DD format"),
  color: z
    .enum(VALID_COLORS)
    .nullable()
    .optional()
    .describe(
      "Color tag for the customer (red, orange, amber, green, blue, violet, pink, gray). Set to null to remove.",
    ),
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
};

export function createUpdateCustomerTool(customerId?: string) {
  const isScoped = !!customerId;

  return createTool({
    description: isScoped
      ? "Update the current customer's information including name, email, phone, date of birth, color tag, gender, document (CPF/SSN), company, job title, address, and social media. Available colors: red, orange, amber, green, blue, violet, pink, gray. Set color to null to remove."
      : "Update a customer's information. Use when the user wants to change a customer's name, email, phone, date of birth, color tag, gender, document, company, job title, address, or social media. Available colors: red, orange, amber, green, blue, violet, pink, gray. Set color to null to remove.",
    inputSchema: isScoped
      ? z.object(fieldSchemas)
      : z.object({
          customerId: z.string().describe("The customer ID to update"),
          ...fieldSchemas,
        }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const inputRecord = input as Record<string, unknown>;
        const targetId = isScoped
          ? (customerId as string)
          : inputRecord.customerId as string;

        const name = inputRecord.name as string | undefined;
        const email = inputRecord.email as string | undefined;
        const phone = inputRecord.phone as string | undefined;
        const birthDate = inputRecord.birthDate as string | undefined;
        const color = inputRecord.color as string | null | undefined;
        const gender = inputRecord.gender as string | undefined;
        const document = inputRecord.document as string | undefined;
        const documentType = inputRecord.documentType as string | undefined;
        const company = inputRecord.company as string | undefined;
        const jobTitle = inputRecord.jobTitle as string | undefined;
        const address = inputRecord.address as string | undefined;
        const city = inputRecord.city as string | undefined;
        const state = inputRecord.state as string | undefined;
        const zipCodeVal = inputRecord.zipCode as string | undefined;
        const countryVal = inputRecord.country as string | undefined;
        const instagramVal = inputRecord.instagram as string | undefined;
        const twitterVal = inputRecord.twitter as string | undefined;
        const linkedinVal = inputRecord.linkedin as string | undefined;
        const facebookVal = inputRecord.facebook as string | undefined;
        const tiktokVal = inputRecord.tiktok as string | undefined;
        const youtubeVal = inputRecord.youtube as string | undefined;

        const allFields = [
          name, email, phone, birthDate, color, gender, document,
          documentType, company, jobTitle, address, city, state,
          zipCodeVal, countryVal, instagramVal, twitterVal,
          linkedinVal, facebookVal, tiktokVal, youtubeVal,
        ];

        if (!allFields.some((f) => f !== undefined)) {
          return {
            error: true,
            message: "No fields provided to update.",
          };
        }

        if (birthDate) {
          const birthDateError = validateBirthDate(birthDate);
          if (birthDateError) {
            return { error: true, message: `Invalid birth date: ${birthDateError}` };
          }
        }

        if (document && documentType) {
          const digits = document.replace(/\D/g, "");
          if (documentType === "cpf" && digits.length !== 11) {
            return { error: true, message: "CPF must have exactly 11 digits" };
          }
          if (documentType === "ssn" && digits.length !== 9) {
            return { error: true, message: "SSN must have exactly 9 digits" };
          }
        }

        const normalizedPhone = phone
          ? phone.replace(/\D/g, "")
          : undefined;

        const sanitize = (v?: string) => v?.replace(/^@/, "").trim() || undefined;

        const args: Record<string, unknown> = {
          userId,
          customerId: targetId as Id<"customers">,
        };
        if (name !== undefined) args.name = name;
        if (email !== undefined) args.email = email;
        if (normalizedPhone !== undefined) args.phone = normalizedPhone;
        if (birthDate !== undefined) args.birthDate = birthDate;
        if (color !== undefined)
          args.color = color === null ? undefined : color;
        if (gender !== undefined) args.gender = gender;
        if (document !== undefined) args.document = document.replace(/\D/g, "");
        if (documentType !== undefined) args.documentType = documentType;
        if (company !== undefined) args.company = company;
        if (jobTitle !== undefined) args.jobTitle = jobTitle;
        if (address !== undefined) args.address = address;
        if (city !== undefined) args.city = city;
        if (state !== undefined) args.state = state;
        if (zipCodeVal !== undefined) args.zipCode = zipCodeVal;
        if (countryVal !== undefined) args.country = countryVal;
        if (instagramVal !== undefined) args.instagram = sanitize(instagramVal);
        if (twitterVal !== undefined) args.twitter = sanitize(twitterVal);
        if (linkedinVal !== undefined) args.linkedin = linkedinVal?.trim();
        if (facebookVal !== undefined) args.facebook = facebookVal?.trim();
        if (tiktokVal !== undefined) args.tiktok = sanitize(tiktokVal);
        if (youtubeVal !== undefined) args.youtube = youtubeVal?.trim();

        await ctx.runMutation(
          internal.customers.mutations.updateCustomerInternal,
          args as {
            userId: Id<"users">;
            customerId: Id<"customers">;
            name?: string;
            email?: string;
            phone?: string;
            birthDate?: string;
            color?: string;
          },
        );

        return {
          success: true,
          customerId: targetId,
        };
      } catch (err) {
        console.error("Update customer failed:", err);
        const message =
          err instanceof Error ? err.message : "Failed to update customer";
        return { error: true, message };
      }
    },
  });
}
